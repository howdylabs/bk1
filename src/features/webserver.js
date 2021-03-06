var express = require('express');
var basicAuth = require('express-basic-auth')
var path = require('path');
var bodyParser = require('body-parser');
// var querystring = require('querystring');
var debug = require('debug')('botkit:webserver');
var http = require('http');
// var fs = require('fs');
// var hbs = require('express-hbs');
var hbs = require('hbs');

module.exports = function(botkit) {

    var webserver = express();
    webserver.use(bodyParser.json());
    webserver.use(bodyParser.urlencoded({ extended: true }));

    webserver.set('views', __dirname + '/../../views')


    hbs.registerPartials(__dirname + '/../../views/partials');
    hbs.localsAsTemplateData(webserver);

    hbs.handlebars.registerHelper('raw-helper', function(options) {
    return options.fn();
    });

    // use handlebars
    webserver.set('view engine', 'hbs');

    webserver.use(express.static(__dirname + '/../../public'));

    var authFunction = basicAuth({
      users: { 'admin': 'supersecret' },
      challenge: true,
    });

    webserver.use(function(req, res, next) {
      if (req.url.match(/\/admin\//)) {
        authFunction(req, res, next);
      } else {
        next();
      }
    });

    var server = http.createServer(webserver);

    server.listen(process.env.PORT || 3000, null, function() {

        debug('Express webserver configured and listening at http://localhost:' + (process.env.PORT || 3000));
        botkit.trigger('boot:webserver_up',[]);

    });

    // controller.webserver = webserver;
    // controller.httpserver = server;

    botkit.webserver = webserver;
    botkit.httpserver = server;

    botkit.publicFolder = function(alias, path) {
      botkit.webserver.use(alias, express.static(path))
    }

    botkit.localView = function(path_to_view) {
      return path.relative(botkit.LIB_PATH + '/../views', path_to_view);
    }




};

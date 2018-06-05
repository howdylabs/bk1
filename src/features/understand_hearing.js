var debug = require('debug')('botkit:hearing');
var async = require('async');

module.exports = function(botkit) {


    botkit.triggers = {};

    botkit.ears = [];
    botkit.earsList = [];

    botkit.hears = function(patterns, events, handler) {
        debug('Listening for ', patterns);
        if (!Array.isArray(patterns)) {
            patterns = [patterns];
        }
        if (!Array.isArray(events)) {
            events = [events];
        }

        for (var p = 0; p < patterns.length; p++) {
            for (var e = 0; e < events.length; e++) {
                var event = events[e];
                var pattern = patterns[p];

                if (!botkit.triggers[event]) {
                    botkit.triggers[event] = [];
                }

                botkit.triggers[event].push({
                    pattern: pattern,
                    handler: handler,
                });

            }
        }
    }

    botkit.addEars = function(test_function, type, description) {
        botkit.ears.push(test_function);
        if (type && description) {
          botkit.earsList.push({
            type: type,
            description: description,
          });
        }
    }

    // do basic regular expression tests
    botkit.addEars(function(trigger, message) {
        return new Promise(function(resolve, reject) {

            if (!message.text) {
                resolve(false);
            }

            if (typeof(trigger) != 'string') {
                if (trigger.type != 'string') {
                  resolve(false);
                }
            }

            try {
              var test;
              if (trigger.type == 'string') {
                  // prepare this regexp properly
                  var p = trigger.pattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                  test = new RegExp('^' + p + '$','i');
              } else if (typeof(trigger) == 'string') {
                test = new RegExp(trigger, 'i');
              }
            } catch (err) {
                return reject(err);
            }

            if (message && message.text.match(test)) {

                // add captured values to the message object
                message.match = message.text.match(test);

                resolve(true)
            } else {
                resolve(false);
            }

        });
    },'string','exact match');

    botkit.addEars(function(trigger, message) {
        return new Promise(function(resolve, reject) {

            if (!message.text) {
                resolve(false);
            }

            if (typeof(trigger) != 'string') {
                if (trigger.type != 'regex') {
                  resolve(false);
                }
            }

            try {
              var test;
              if (trigger.type == 'regex') {
                test = new RegExp(trigger.pattern,'i');
              } else if (typeof(trigger) == 'string') {
                test = new RegExp(trigger, 'i');
              }
            } catch (err) {
                return reject(err);
            }

            if (message && message.text.match(test)) {

                // add captured values to the message object
                message.match = message.text.match(test);

                resolve(true)
            } else {
                resolve(false);
            }

        });
    },'regex','regular expression match');


    botkit.middleware.understand.use(function(bot, message, response, next) {
        debug('EVALUATE', message);

        if (response.script) {
            debug('Already got a scripted response');
            return next();
        }

        if (botkit.triggers[message.type]) {
            var triggers = botkit.triggers[message.type];

            // test each trigger...
            var triggered = 0;
            async.eachSeries(triggers, function(trigger, next_trigger) {
                // use various ways to hear stuff
                async.eachSeries(botkit.ears, function(test, next_test) {
                    // console.log('TEST', trigger, test);
                    if (triggered == 0) {
                        test(trigger.pattern, message).then(function(match) {
                            if (match) {
                                triggered++;
                                trigger.handler(bot, message);
                                next_test();
                            } else {
                                next_test();
                            }
                        }).catch(next_test);
                    } else {
                        next_test();
                    }
                }, function(err) {
                    next_trigger(err);
                });
            }, function(err) {
                if (!triggered || err) {
                    next(err);
                }
            });
        } else {
            next();
        }

    });


}

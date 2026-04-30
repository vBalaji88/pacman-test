'use strict';

function setupJsonConsole() {
    var methods = ['log', 'info', 'warn', 'error', 'debug'];
    var original = {};

    function normalizeArg(arg) {
        if (arg instanceof Error) {
            return {
                name: arg.name,
                message: arg.message,
                stack: arg.stack
            };
        }

        if (typeof arg === 'undefined') {
            return null;
        }

        return arg;
    }

    function stringifyPayload(payload) {
        try {
            return JSON.stringify(payload);
        } catch (err) {
            return JSON.stringify({
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to serialize log payload',
                data: {
                    originalMessage: String(payload && payload.message ? payload.message : payload),
                    serializerError: err.message
                }
            });
        }
    }

    methods.forEach(function(method) {
        original[method] = typeof console[method] === 'function' ? console[method].bind(console) : null;
        if (!original[method]) {
            return;
        }

        console[method] = function() {
            var args = Array.prototype.slice.call(arguments).map(normalizeArg);
            var payload = {
                timestamp: new Date().toISOString(),
                level: method,
                message: args.length > 0 ? String(args[0]) : '',
                data: args.length > 1 ? args.slice(1) : undefined
            };

            if (typeof payload.data === 'undefined') {
                delete payload.data;
            }

            original[method](stringifyPayload(payload));
        };
    });
}

setupJsonConsole();

var express = require('express');
var path = require('path');
var Database = require('./lib/database');
var assert = require('assert');

// Constants

// Routes
var highscores = require('./routes/highscores');
var user = require('./routes/user');
var loc = require('./routes/location');

// App
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Handle root web server's public directory
app.use('/', express.static(path.join(__dirname, 'public')));

app.use('/highscores', highscores);
app.use('/user', user);
app.use('/location', loc);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error Handler
app.use(function(err, req, res, next) {
    if (res.headersSent) {
        return next(err)
    }
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

Database.connect(app, function(err) {
    if (err) {
        console.log('Failed to connect to database server');
    } else {
        console.log('Connected to database server successfully');
    }

});

module.exports = app;

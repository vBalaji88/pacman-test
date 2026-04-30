'use strict';

const pino = require('pino');

// Create a Pino logger instance with JSON output
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: false,
            translateTime: 'SYS:standard',
            singleLine: false,
            ignore: 'pid,hostname'
        }
    }
});

module.exports = logger;

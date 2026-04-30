'use strict';

const pino = require('pino');

// Create a Pino logger instance with pure JSON output
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label };
        },
        bindings: (bindings) => {
            return {
                pid: bindings.pid,
                hostname: bindings.hostname
            };
        }
    },
    timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = logger;

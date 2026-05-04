'use strict';

const { MongoClient } = require('mongodb');
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const config = require('./config');
const logger = require('./logger');

//Added Custom Tracing
const tracer = trace.getTracer('pacman-database');

function recordErrorSpan(spanName, err) {
    const span = tracer.startSpan(spanName);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    span.recordException(err);
    span.end();
}
//End Custom Tracing
let _db = null; // Singleton for the database instance

class Database {
    /**
     * Connect to the MongoDB server and initialize the database instance.
     * @param {object} app - The application instance (e.g., Express app).
     * @returns {Promise<void>} Resolves when the connection is successful.
     */
    async connect(app) {
        if (_db) {
            logger.info('Database is already connected.');
            return;
        }

        try {
            // Create a new MongoClient and connect to the MongoDB server
            const client = new MongoClient(config.database.url, config.database.options);
            await client.connect();

            // Access the database from the connected client
            _db = client.db();
            app.locals.db = _db; // Attach the database instance to the app's locals
            //Added Custom Span for DB Connect Failure
            // Listen for post-connection ECONNRESET errors on the underlying topology
            client.on('error', (err) => {
                if (err && err.code === 'ECONNRESET') {
                    logger.error('Database connection reset (ECONNRESET):', err);
                    recordErrorSpan('db.connection.reset', err);
                }
            });

            logger.info('Connected to the database successfully.');
        } catch (err) {
            logger.error('Error connecting to the database:', err);
            //Added Custom Span for DB Connect Failure
            recordErrorSpan('db.connect.error', err);
            throw err; // Throw the error to let the caller handle it
        }
    }

    /**
     * Retrieve the database instance. If not connected, establish the connection first.
     * @param {object} app - The application instance (e.g., Express app).
     * @returns {Promise<object>} Resolves with the database instance.
     */
    async getDb(app) {
        if (!_db) {
            logger.info('Database connection not found. Attempting to reconnect...');
            await this.connect(app);
        }
        return _db;
    }
}

// Export a singleton instance of the Database class
module.exports = new Database();
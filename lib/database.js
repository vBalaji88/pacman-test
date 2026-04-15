'use strict';

const { MongoClient } = require('mongodb');
const config = require('./config');

let _db = null; // Singleton for the database instance

class Database {
    /**
     * Connect to the MongoDB server and initialize the database instance.
     * @param {object} app - The application instance (e.g., Express app).
     * @returns {Promise<void>} Resolves when the connection is successful.
     */
    async connect(app) {
        if (_db) {
            console.log('Database is already connected.');
            return;
        }

        try {
            // Create a new MongoClient and connect to the MongoDB server
            const client = new MongoClient(config.database.url, config.database.options);
            await client.connect();

            // Access the database from the connected client
            _db = client.db();
            app.locals.db = _db; // Attach the database instance to the app's locals

            console.log('Connected to the database successfully.');
        } catch (err) {
            console.error('Error connecting to the database:', err);
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
            console.log('Database connection not found. Attempting to reconnect...');
            await this.connect(app);
        }
        return _db;
    }
}

// Export a singleton instance of the Database class
module.exports = new Database();
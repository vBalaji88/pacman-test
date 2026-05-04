const express = require('express');
const { ObjectId } = require('mongodb');
const Database = require('../lib/database');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const logger = require('../lib/logger');

const router = express.Router();

// Middleware that logs the time of the request
router.use((req, res, next) => {
    logger.info({ timestamp: new Date() }, 'User request');
    next();
});

// Route: Generate a new user ID
router.get('/id', async (req, res, next) => {
    logger.info('[GET /user/id]');
    

    try {
        const db = await Database.getDb(req.app); // Get the database instance

        const result = await db.collection('userstats').insertOne({
            date: new Date(),
        });

        const userId = result.insertedId;
        logger.info({ userId }, 'Successfully inserted new user ID');
        res.json(userId); // Respond with the generated ObjectId

    } catch (err) {
        logger.error({ error: err }, 'Failed to insert new user ID');
        const span = trace.getSpan(context.active());
        if (span) {
            const span = tracer.startSpan("UserStats db.connect.error");
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            span.recordException(err);
            span.end();
        }
        next(err); // Pass the error to the Express error handler
    }
});

// Route: Update user stats
router.post('/stats', express.urlencoded({ extended: false }), async (req, res, next) => {
    logger.info({
        body: req.body,
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer
    }, '[POST /user/stats]');
    logger.info('Before Custom Tag Set');
    
    const userScore = parseInt(req.body.score, 10);
    
    const userLevel = parseInt(req.body.level, 10);
    // Manual Instrumentation: Setting custom attributes on the current span
    const span = trace.getSpan(context.active());
    if (span) {
        logger.info('Custom Tag Set');
        logger.debug({ userLevel, userId: req.body.userId }, 'Setting custom attributes');
        span.setAttribute('custom.userLevel', userLevel);
        span.setAttribute('custom.customTag', 'CustomTag');
        span.setAttribute('customUserIDSet', req.body.userId);
    }
    const userLives = parseInt(req.body.lives, 10);
    const userET = parseInt(req.body.elapsedTime, 10);

    try {
        const db = await Database.getDb(req.app); // Get the database instance

        const result = await db.collection('userstats').updateOne(
            { _id: new ObjectId(req.body.userId) }, // Filter
            { 
                $set: { // Data to update
                    cloud: req.body.cloud,
                    zone: req.body.zone,
                    host: req.body.host,
                    score: userScore,
                    level: userLevel,
                    lives: userLives,
                    elapsedTime: userET,
                    date: new Date(),
                    referer: req.headers.referer,
                    user_agent: req.headers['user-agent'],
                    hostname: req.hostname,
                    ip_addr: req.ip,
                },
                $inc: { // Increment update counter
                    updateCounter: 1,
                },
            },
            { 
                writeConcern: { w: 'majority', j: true, wtimeout: 10000 }, // Write options
            }
        );

        const returnStatus = result.matchedCount > 0 ? 'success' : 'error';
        if (returnStatus === 'success') {
            logger.info('Successfully updated user stats');
        } else {
            logger.info('No matching user found for update');
        }

        res.json({ rs: returnStatus }); // Respond with the status
    } catch (err) {

        logger.error({ error: err }, 'Error updating user stats');
        next(err); // Pass the error to the Express error handler
    }
});

// Route: Retrieve all user stats
router.get('/stats', async (req, res, next) => {
    logger.info('[GET /user/stats]');

    try {
        const db = await Database.getDb(req.app); // Get the database instance

        const docs = await db.collection('userstats')
            .find({ score: { $exists: true } }) // Filter for documents with a `score` field
            .sort({ _id: 1 }) // Sort by `_id` in ascending order
            .toArray(); // Convert the cursor to an array

        const result = docs.map(item => ({
            cloud: item.cloud,
            zone: item.zone,
            host: item.host,
            score: item.score,
            level: item.level,
            lives: item.lives,
            et: item.elapsedTime,
            txncount: item.updateCounter,
        }));

        res.json(result); // Respond with the user stats
    } catch (err) {
        logger.error({ error: err }, 'Error fetching user stats');
        next(err); // Pass the error to the Express error handler
    }
});

module.exports = router;

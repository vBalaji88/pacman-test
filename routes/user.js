const express = require('express');
const { ObjectId } = require('mongodb');
const Database = require('../lib/database');
const { trace, context } = require('@opentelemetry/api');

const router = express.Router();

// Middleware that logs the time of the request
router.use((req, res, next) => {
    console.log('Time:', new Date());
    next();
});

// Route: Generate a new user ID
router.get('/id', async (req, res, next) => {
    console.log('[GET /user/id]');
    const span = trace.getSpan(context.active());

    try {
        const db = await Database.getDb(req.app); // Get the database instance

        const result = await db.collection('userstats').insertOne({
            date: new Date(),
        });

        const userId = result.insertedId;
        console.log('Successfully inserted new user ID =', userId);
        console.log('Before Custom Tag Set');
        if (span) {
            console.log('Custom Tag Set');
            span.setAttribute('customUserIDSet', userId);
        }
        res.json(userId); // Respond with the generated ObjectId

    } catch (err) {
        console.error('Failed to insert new user ID:', err);
        next(err); // Pass the error to the Express error handler
    }
});

// Route: Update user stats
router.post('/stats', express.urlencoded({ extended: false }), async (req, res, next) => {
    console.log('[POST /user/stats]\n',
        ' body =', req.body, '\n',
        ' host =', req.headers.host,
        ' user-agent =', req.headers['user-agent'],
        ' referer =', req.headers.referer);

    const userScore = parseInt(req.body.score, 10);
    const userLevel = parseInt(req.body.level, 10);
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
            console.log('Successfully updated user stats');
        } else {
            console.log('No matching user found for update');
        }

        res.json({ rs: returnStatus }); // Respond with the status
    } catch (err) {
        console.error('Error updating user stats:', err);
        next(err); // Pass the error to the Express error handler
    }
});

// Route: Retrieve all user stats
router.get('/stats', async (req, res, next) => {
    console.log('[GET /user/stats]');

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
        console.error('Error fetching user stats:', err);
        next(err); // Pass the error to the Express error handler
    }
});

module.exports = router;

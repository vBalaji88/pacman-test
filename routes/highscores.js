const express = require('express');
const bodyParser = require('body-parser');
const Database = require('../lib/database');
const logger = require('../lib/logger');

const router = express.Router();

// Create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false });

// Middleware that is specific to this router
router.use((req, res, next) => {
    logger.info({ timestamp: new Date() }, 'Highscores request');
    next();
});

// GET: Retrieve top 10 high scores
router.get('/list', urlencodedParser, async (req, res, next) => {
    logger.info('[GET /highscores/list]');
    try {
        const db = await Database.getDb(req.app); // Get the database instance
        const collection = db.collection('highscore');

        // Retrieve the top 10 high scores
        const docs = await collection
            .find({})
            .sort({ score: -1 }) // Sort by score in descending order
            .limit(10)
            .toArray();

        // Transform the results for the response
        const result = docs.map(item => ({
            name: item.name,
            cloud: item.cloud,
            zone: item.zone,
            host: item.host,
            score: item.score,
        }));

        res.json(result); // Respond with the high scores
    } catch (err) {
        logger.error({ error: err }, 'Error fetching high scores');
        next(err); // Pass the error to the Express error handler
    }
});

// POST: Insert a new high score
router.post('/', urlencodedParser, async (req, res, next) => {
    logger.info({
        body: req.body,
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer
    }, '[POST /highscores]');

    try {
        const db = await Database.getDb(req.app); // Get the database instance
        const userScore = parseInt(req.body.score, 10);
        const userLevel = parseInt(req.body.level, 10);

        // Insert a new high score record
        const result = await db.collection('highscore').insertOne({
            name: req.body.name,
            cloud: req.body.cloud,
            zone: req.body.zone,
            host: req.body.host,
            score: userScore,
            level: userLevel,
            date: new Date(),
            referer: req.headers.referer,
            user_agent: req.headers['user-agent'],
            hostname: req.hostname,
            ip_addr: req.ip,
        });

        logger.info({ insertedId: result.insertedId }, 'Successfully inserted high score');

        res.json({
            name: req.body.name,
            zone: req.body.zone,
            score: userScore,
            level: userLevel,
            rs: 'success',
        });
    } catch (err) {
        logger.error({ error: err }, 'Error inserting high score');

        res.json({
            name: req.body.name,
            zone: req.body.zone,
            score: req.body.score,
            level: req.body.level,
            rs: 'error',
        });

        next(err); // Pass the error to the Express error handler
    }
});

module.exports = router;
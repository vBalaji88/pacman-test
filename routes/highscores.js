const express = require('express');
const bodyParser = require('body-parser');
const Database = require('../lib/database');

const router = express.Router();

// Create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false });

// Middleware that is specific to this router
router.use((req, res, next) => {
    console.log('Time:', new Date());
    next();
});

// GET: Retrieve top 10 high scores
router.get('/list', urlencodedParser, async (req, res, next) => {
    console.log('[GET /highscores/list]');
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
        console.error('Error fetching high scores:', err);
        next(err); // Pass the error to the Express error handler
    }
});

// POST: Insert a new high score
router.post('/', urlencodedParser, async (req, res, next) => {
    console.log('[POST /highscores] body =', req.body,
        ' host =', req.headers.host,
        ' user-agent =', req.headers['user-agent'],
        ' referer =', req.headers.referer);

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

        console.log('Successfully inserted high score:', result.insertedId);

        res.json({
            name: req.body.name,
            zone: req.body.zone,
            score: userScore,
            level: userLevel,
            rs: 'success',
        });
    } catch (err) {
        console.error('Error inserting high score:', err);

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
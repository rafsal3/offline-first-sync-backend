const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const authMiddleware = require('../middleware/auth');

// POST /sync/push
router.post('/push', authMiddleware, syncController.push);

// GET /sync/pull
router.get('/pull', authMiddleware, syncController.pull);

module.exports = router;

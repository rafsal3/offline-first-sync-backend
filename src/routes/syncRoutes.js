const express = require('express');
const { sync, getInitialData } = require('../controllers/syncController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Main sync endpoint
router.post('/', protect, sync);

// Get initial data for first-time sync
router.get('/initial', protect, getInitialData);

module.exports = router;

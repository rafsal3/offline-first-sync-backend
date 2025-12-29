const express = require('express');
const {
    getAllSpaces,
    getSpace,
    deleteSpace,
    getAllCategories,
    getCategory,
    deleteCategory,
    getAllItems,
    getItem,
    deleteItem,
    getStats
} = require('../controllers/crudController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ⚠️ WARNING: These endpoints are for DEBUGGING/ADMIN use only!
// ⚠️ The app should use POST /api/sync for all normal operations!

// Spaces
router.get('/spaces', protect, getAllSpaces);
router.get('/spaces/:id', protect, getSpace);
router.delete('/spaces/:id', protect, deleteSpace);

// Categories
router.get('/categories', protect, getAllCategories);
router.get('/categories/:id', protect, getCategory);
router.delete('/categories/:id', protect, deleteCategory);

// Items
router.get('/items', protect, getAllItems);
router.get('/items/:id', protect, getItem);
router.delete('/items/:id', protect, deleteItem);

// Debug/Stats
router.get('/debug/stats', protect, getStats);

module.exports = router;

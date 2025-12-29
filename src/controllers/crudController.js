const Space = require('../models/Space');
const Category = require('../models/Category');
const Item = require('../models/Item');

// ⚠️ WARNING: These endpoints are for DEBUGGING/ADMIN use only!
// ⚠️ The app should use /sync for all normal operations!

// @desc    Get all spaces for user
// @route   GET /api/spaces
// @access  Private
exports.getAllSpaces = async (req, res, next) => {
    try {
        const spaces = await Space.find({
            userId: req.user._id,
            deletedAt: null
        }).sort({ order: 1 });

        res.status(200).json({
            success: true,
            count: spaces.length,
            data: spaces
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single space
// @route   GET /api/spaces/:id
// @access  Private
exports.getSpace = async (req, res, next) => {
    try {
        const space = await Space.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!space) {
            return res.status(404).json({
                success: false,
                message: 'Space not found'
            });
        }

        res.status(200).json({
            success: true,
            data: space
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all categories for user
// @route   GET /api/categories
// @access  Private
exports.getAllCategories = async (req, res, next) => {
    try {
        const { spaceId } = req.query;

        const query = {
            userId: req.user._id,
            deletedAt: null
        };

        if (spaceId) {
            query.spaceId = spaceId;
        }

        const categories = await Category.find(query).sort({ order: 1 });

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
exports.getCategory = async (req, res, next) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all items for user
// @route   GET /api/items
// @access  Private
exports.getAllItems = async (req, res, next) => {
    try {
        const { spaceId, categoryId, isCompleted } = req.query;

        const query = {
            userId: req.user._id,
            deletedAt: null
        };

        if (spaceId) {
            query.spaceId = spaceId;
        }

        if (categoryId) {
            query.categoryId = categoryId;
        }

        if (isCompleted !== undefined) {
            query.isCompleted = isCompleted === 'true';
        }

        const items = await Item.find(query).sort({ order: 1 });

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = async (req, res, next) => {
    try {
        const item = await Item.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete space (admin/debug only)
// @route   DELETE /api/spaces/:id
// @access  Private
exports.deleteSpace = async (req, res, next) => {
    try {
        const space = await Space.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!space) {
            return res.status(404).json({
                success: false,
                message: 'Space not found'
            });
        }

        // Soft delete
        space.deletedAt = new Date();
        space.updatedAt = new Date();
        await space.save();

        res.status(200).json({
            success: true,
            message: 'Space deleted',
            data: space
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete category (admin/debug only)
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Soft delete
        category.deletedAt = new Date();
        category.updatedAt = new Date();
        await category.save();

        res.status(200).json({
            success: true,
            message: 'Category deleted',
            data: category
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete item (admin/debug only)
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = async (req, res, next) => {
    try {
        const item = await Item.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Soft delete
        item.deletedAt = new Date();
        item.updatedAt = new Date();
        await item.save();

        res.status(200).json({
            success: true,
            message: 'Item deleted',
            data: item
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get statistics (admin/debug only)
// @route   GET /api/debug/stats
// @access  Private
exports.getStats = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const [
            totalSpaces,
            activeSpaces,
            totalCategories,
            activeCategories,
            totalItems,
            activeItems,
            completedItems
        ] = await Promise.all([
            Space.countDocuments({ userId }),
            Space.countDocuments({ userId, deletedAt: null }),
            Category.countDocuments({ userId }),
            Category.countDocuments({ userId, deletedAt: null }),
            Item.countDocuments({ userId }),
            Item.countDocuments({ userId, deletedAt: null }),
            Item.countDocuments({ userId, deletedAt: null, isCompleted: true })
        ]);

        res.status(200).json({
            success: true,
            data: {
                spaces: {
                    total: totalSpaces,
                    active: activeSpaces,
                    deleted: totalSpaces - activeSpaces
                },
                categories: {
                    total: totalCategories,
                    active: activeCategories,
                    deleted: totalCategories - activeCategories
                },
                items: {
                    total: totalItems,
                    active: activeItems,
                    deleted: totalItems - activeItems,
                    completed: completedItems,
                    pending: activeItems - completedItems
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

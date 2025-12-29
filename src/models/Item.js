const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    localId: {
        type: String,
        required: true,
        index: true
    },
    serverId: {
        type: String,
        unique: true,
        sparse: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    spaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Space',
        index: true
    },
    spaceLocalId: String,
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        index: true
    },
    categoryLocalId: String,

    // Item content
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    notes: String,

    // Item type and external references
    type: {
        type: String,
        enum: ['custom', 'movie', 'book', 'place', 'other'],
        default: 'custom'
    },

    // External IDs only (frontend fetches details)
    movieId: String,        // TMDB ID
    bookId: String,         // OpenLibrary ID
    placeId: String,        // Place API ID

    // Status and progress
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: Date,
    completedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        deviceId: String
    },

    // Priority and organization
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    order: {
        type: Number,
        default: 0
    },

    // Tags and metadata
    tags: [String],
    dueDate: Date,

    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,

    // Sync metadata
    deviceId: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound indexes for efficient querying
itemSchema.index({ userId: 1, isDeleted: 1, updatedAt: -1 });
itemSchema.index({ userId: 1, spaceId: 1, categoryId: 1 });
itemSchema.index({ userId: 1, localId: 1 });
itemSchema.index({ userId: 1, isCompleted: 1 });

module.exports = mongoose.model('Item', itemSchema);

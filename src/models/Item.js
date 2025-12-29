const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    // Client-generated UUID (primary identifier)
    _id: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    spaceId: {
        type: String,  // References Space._id (client-generated UUID)
        index: true
    },
    categoryId: {
        type: String,  // References Category._id (client-generated UUID)
        index: true
    },

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

    // Soft delete (nullable)
    deletedAt: {
        type: Date,
        default: null
    },

    // Sync metadata
    deviceId: String,
    createdAt: {
        type: Date,
        required: true
    },
    updatedAt: {
        type: Date,
        required: true
    }
}, {
    _id: false,
    timestamps: false
});

// Computed field for isDeleted
itemSchema.virtual('isDeleted').get(function () {
    return this.deletedAt !== null;
});

// Compound indexes for efficient querying
itemSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 });
itemSchema.index({ userId: 1, spaceId: 1, categoryId: 1 });
itemSchema.index({ userId: 1, _id: 1 });
itemSchema.index({ userId: 1, isCompleted: 1 });

module.exports = mongoose.model('Item', itemSchema);

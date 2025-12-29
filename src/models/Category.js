const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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
        required: true,
        index: true
    },

    // Category data
    name: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String,
        default: 'list'
    },
    color: {
        type: String,
        default: '#8b5cf6'
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },

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
categorySchema.virtual('isDeleted').get(function () {
    return this.deletedAt !== null;
});

// Compound indexes for efficient querying
categorySchema.index({ userId: 1, spaceId: 1, deletedAt: 1, updatedAt: -1 });
categorySchema.index({ userId: 1, _id: 1 });

module.exports = mongoose.model('Category', categorySchema);

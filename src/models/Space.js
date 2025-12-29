const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
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

    // Space data
    name: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String,
        default: 'folder'
    },
    color: {
        type: String,
        default: '#6366f1'
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },

    // Collaboration
    collaborators: [{
        userId: mongoose.Schema.Types.ObjectId,
        email: String,
        role: {
            type: String,
            enum: ['owner', 'editor', 'viewer'],
            default: 'viewer'
        }
    }],

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
    _id: false,  // Don't auto-generate _id, use client-provided
    timestamps: false  // We manage timestamps manually from client
});

// Computed field for isDeleted
spaceSchema.virtual('isDeleted').get(function () {
    return this.deletedAt !== null;
});

// Compound indexes for efficient querying
spaceSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 });
spaceSchema.index({ userId: 1, _id: 1 });

module.exports = mongoose.model('Space', spaceSchema);

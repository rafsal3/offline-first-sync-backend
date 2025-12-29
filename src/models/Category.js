const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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
        required: true,
        index: true
    },
    spaceLocalId: String,
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
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
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
categorySchema.index({ userId: 1, spaceId: 1, isDeleted: 1, updatedAt: -1 });
categorySchema.index({ userId: 1, localId: 1 });

module.exports = mongoose.model('Category', categorySchema);

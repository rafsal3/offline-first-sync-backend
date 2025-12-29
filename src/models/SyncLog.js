const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    deviceId: {
        type: String,
        required: true,
        index: true
    },
    entityType: {
        type: String,
        required: true,
        enum: ['space', 'category', 'item']
    },
    entityId: {
        type: String,  // Client-generated UUID
        required: true
    },
    operation: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete']
    },
    changes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    processed: {
        type: Boolean,
        default: false
    },
    processedAt: Date
}, {
    timestamps: true
});

// Compound indexes for efficient sync queries
syncLogSchema.index({ userId: 1, timestamp: -1 });
syncLogSchema.index({ userId: 1, deviceId: 1, timestamp: -1 });
syncLogSchema.index({ userId: 1, entityType: 1, timestamp: -1 });

module.exports = mongoose.model('SyncLog', syncLogSchema);

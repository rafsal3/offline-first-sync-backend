const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
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
    collaborators: [{
        userId: mongoose.Schema.Types.ObjectId,
        email: String,
        role: {
            type: String,
            enum: ['owner', 'editor', 'viewer'],
            default: 'viewer'
        }
    }],
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

// Compound index for efficient querying
spaceSchema.index({ userId: 1, isDeleted: 1, updatedAt: -1 });
spaceSchema.index({ userId: 1, localId: 1 });

module.exports = mongoose.model('Space', spaceSchema);

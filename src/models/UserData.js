const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    version: {
        type: Number,
        required: true,
        default: 1
    },
    lastModifiedAt: {
        type: Date,
        default: Date.now
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        default: {}
    }
});

// Index for faster userId lookups
userDataSchema.index({ userId: 1 });

// Update lastModifiedAt before saving
userDataSchema.pre('save', function () {
    this.lastModifiedAt = new Date();
});

module.exports = mongoose.model('UserData', userDataSchema);

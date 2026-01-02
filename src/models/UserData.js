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
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        default: {}
    }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'lastModifiedAt' }
});

// Index for faster userId lookups
userDataSchema.index({ userId: 1 });

module.exports = mongoose.model('UserData', userDataSchema);

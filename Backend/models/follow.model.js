const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    follower: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'followerType',
        required: true
    },
    followerType: {
        type: String,
        required: true,
        enum: ['user', 'captain']
    },
    following: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'captain',
        required: true
    },
    followedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

followSchema.index({ follower: 1, following: 1 }, { unique: true });

const followModel = mongoose.model('follow', followSchema);
module.exports = followModel;

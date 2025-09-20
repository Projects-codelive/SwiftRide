const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        maxlength: 500
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'authorType',
        required: true
    },
    authorType: {
        type: String,
        required: true,
        enum: ['user', 'captain']
    },
    likes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'likes.userType'
        },
        userType: {
            type: String,
            enum: ['user', 'captain']
        },
        likedAt: {
            type: Date,
            default: Date.now
        }
    }],
    likesCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

commentSchema.index({ post: 1, createdAt: -1 });

const commentModel = mongoose.model('comment', commentSchema);
module.exports = commentModel;
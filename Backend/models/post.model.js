const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 500,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'authorType',
    required: true,
  },
  authorType: {
    type: String,
    required: true,
    enum: ['user', 'captain']
  },
  images: [{
    url: {
      type: String
    },
    publicId: {
      type: String
    }
  }],
  
  // UPDATED: Keep likes array as is
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
  
  // NEW: Add dislikes array
  dislikes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'dislikes.userType'
    },
    userType: {
      type: String,
      enum: ['user', 'captain']
    },
    dislikedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  likesCount: {
    type: Number,
    default: 0
  },
  
  // NEW: Add dislikes count
  dislikesCount: {
    type: Number,
    default: 0
  },
  
  commentsCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

const postModel = mongoose.model('post', postSchema);

module.exports = postModel;

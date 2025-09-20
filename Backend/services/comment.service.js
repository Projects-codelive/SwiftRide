const commentModel = require('../models/comment.model');
const postModel = require('../models/post.model');

module.exports.createComment = async ({ content, postId, author, authorType }) => {
    const comment = new commentModel({
        content,
        post: postId,
        author,
        authorType
    });

    const savedComment = await comment.save();
    
    // Update comment count in post
    await postModel.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    
    // Populate author details before returning
    return await commentModel.findById(savedComment._id)
        .populate('author', 'fullname avatar');
};

module.exports.getCommentsByPost = async (postId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    
    return await commentModel.find({ post: postId })
        .populate('author', 'fullname avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

module.exports.likeComment = async ({ commentId, userId, userType }) => {
    const comment = await commentModel.findById(commentId);
    if (!comment) throw new Error('Comment not found');

    const existingLikeIndex = comment.likes.findIndex(
        like => like.user.toString() === userId && like.userType === userType
    );

    if (existingLikeIndex !== -1) {
        // Unlike
        comment.likes.splice(existingLikeIndex, 1);
        comment.likesCount -= 1;
    } else {
        // Like
        comment.likes.push({
            user: userId,
            userType: userType,
            likedAt: new Date()
        });
        comment.likesCount += 1;
    }

    await comment.save();
    return comment;
};

module.exports.deleteComment = async (commentId, userId, userType) => {
    const comment = await commentModel.findById(commentId);
    
    if (!comment) {
        throw new Error('Comment not found');
    }
    
    // Check if user is the author of the comment
    if (comment.author.toString() !== userId || comment.authorType !== userType) {
        throw new Error('You can only delete your own comments');
    }
    
    // Delete the comment
    await commentModel.findByIdAndDelete(commentId);
    
    // Update comment count in post
    await postModel.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });
    
    return comment;
};

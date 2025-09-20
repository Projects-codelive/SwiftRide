const commentService = require('../services/comment.service');
const { validationResult } = require('express-validator');

module.exports.createComment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { content } = req.body;
        const { postId } = req.params;
        const author = req.user._id;
        const authorType = req.user.constructor.modelName.toLowerCase();

        const comment = await commentService.createComment({
            content,
            postId,
            author,
            authorType
        });

        // Emit new comment to all connected clients via Socket.IO
        if (req.app.get('io')) {
            req.app.get('io').emit('newComment', {
                comment,
                postId
            });
        }

        res.status(201).json({
            success: true,
            message: 'Comment created successfully',
            comment
        });
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

module.exports.getCommentsByPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const comments = await commentService.getCommentsByPost(postId, page, limit);
        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();

        // Add user's like status to each comment
        const commentsWithLikeStatus = comments.map(comment => {
            const userLiked = comment.likes.some(
                like => like.user.toString() === userId.toString() && 
                       like.userType === userType
            );
            
            return {
                ...comment.toObject(),
                isLikedByUser: userLiked
            };
        });

        res.status(200).json({
            success: true,
            comments: commentsWithLikeStatus
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

module.exports.likeComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();

        const comment = await commentService.likeComment({
            commentId,
            userId,
            userType
        });

        const isLiked = comment.likes.some(
            like => like.user.toString() === userId.toString() && 
                   like.userType === userType
        );

        // Emit comment like event to all connected clients
        if (req.app.get('io')) {
            req.app.get('io').emit('commentLiked', {
                commentId,
                likesCount: comment.likesCount,
                userId,
                userType,
                action: isLiked ? 'liked' : 'unliked'
            });
        }

        res.status(200).json({
            success: true,
            message: isLiked ? 'Comment liked' : 'Comment unliked',
            comment: {
                _id: comment._id,
                likesCount: comment.likesCount,
                isLikedByUser: isLiked
            }
        });
    } catch (error) {
        console.error('Like comment error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

module.exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();

        const deletedComment = await commentService.deleteComment(commentId, userId, userType);

        // Emit comment deletion to all connected clients
        if (req.app.get('io')) {
            req.app.get('io').emit('commentDeleted', { 
                commentId, 
                postId: deletedComment.post 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

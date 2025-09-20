const postService = require('../services/post.service');
const { validationResult } = require('express-validator');
const { cloudinary } = require('../config/cloudinary');

module.exports.createPost = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { content } = req.body;
        const author = req.user._id;
        const authorType = req.user.constructor.modelName.toLowerCase();

        // Process uploaded images
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => ({
                url: file.path,
                publicId: file.filename
            }));
        }

        const post = await postService.createPost({
            content,
            images,
            author,
            authorType
        });

        // Populate author details for response
        const populatedPost = await postService.getPostById(post._id);

        // Emit new post to all connected clients via Socket.IO
        if (req.app.get('io')) {
            req.app.get('io').emit('newPost', {
                post: populatedPost
            });
        }

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: populatedPost
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports.getFeedPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const posts = await postService.getFeedPosts({
            userId,
            userType,
            page,
            limit
        });

        // Add user's like and dislike status to each post
        const postsWithLikeStatus = posts.map(post => {
            const userLiked = post.likes.some(
                like => like.user.toString() === userId.toString() &&
                        like.userType === userType
            );

            const userDisliked = post.dislikes.some(
                dislike => dislike.user.toString() === userId.toString() &&
                          dislike.userType === userType
            );

            return {
                ...post.toObject(),
                isLikedByUser: userLiked,
                isDislikedByUser: userDisliked
            };
        });

        res.status(200).json({
            success: true,
            posts: postsWithLikeStatus,
            pagination: {
                currentPage: page,
                totalPosts: postsWithLikeStatus.length,
                hasMore: postsWithLikeStatus.length === limit
            }
        });

    } catch (error) {
        console.error('Get feed posts error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports.likePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();

        const post = await postService.likePost({
            postId,
            userId,
            userType
        });

        const isLiked = post.likes.some(
            like => like.user.toString() === userId.toString() &&
                    like.userType === userType
        );

        const isDisliked = post.dislikes.some(
            dislike => dislike.user.toString() === userId.toString() &&
                      dislike.userType === userType
        );

        // Emit like event to all connected clients
        if (req.app.get('io')) {
            req.app.get('io').emit('postLiked', {
                postId,
                likesCount: post.likesCount,
                dislikesCount: post.dislikesCount,
                userId,
                userType,
                action: isLiked ? 'liked' : 'unliked'
            });
        }

        res.status(200).json({
            success: true,
            message: isLiked ? 'Post liked' : 'Post unliked',
            post: {
                _id: post._id,
                likesCount: post.likesCount,
                dislikesCount: post.dislikesCount,
                isLikedByUser: isLiked,
                isDislikedByUser: isDisliked
            }
        });

    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// UPDATED: Fixed dislikePost controller
module.exports.dislikePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();

        const post = await postService.dislikePost({
            postId,
            userId,
            userType
        });

        const isLiked = post.likes.some(
            like => like.user.toString() === userId.toString() &&
                    like.userType === userType
        );

        const isDisliked = post.dislikes.some(
            dislike => dislike.user.toString() === userId.toString() &&
                      dislike.userType === userType
        );

        // Emit dislike event to all connected clients
        if (req.app.get('io')) {
            req.app.get('io').emit('postDisliked', {
                postId,
                likesCount: post.likesCount,
                dislikesCount: post.dislikesCount,
                userId,
                userType,
                action: isDisliked ? 'disliked' : 'undisliked'
            });
        }

        res.status(200).json({
            success: true,
            message: isDisliked ? 'Post disliked' : 'Post undisliked',
            post: {
                _id: post._id,
                likesCount: post.likesCount,
                dislikesCount: post.dislikesCount,
                isLikedByUser: isLiked,
                isDislikedByUser: isDisliked
            }
        });

    } catch (error) {
        console.error('Dislike post error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// FIXED: Updated getPostById to include dislike status
module.exports.getPostById = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await postService.getPostById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();

        const isLikedByUser = post.likes.some(
            like => like.user.toString() === userId.toString() &&
                    like.userType === userType
        );

        const isDislikedByUser = post.dislikes.some(
            dislike => dislike.user.toString() === userId.toString() &&
                      dislike.userType === userType
        );

        res.status(200).json({
            success: true,
            post: {
                ...post.toObject(),
                isLikedByUser,
                isDislikedByUser
            }
        });

    } catch (error) {
        console.error('Get post by id error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await postService.getPostById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if user is the author of the post
        if (post.author._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own posts'
            });
        }

        // Delete images from Cloudinary
        if (post.images && post.images.length > 0) {
            for (const image of post.images) {
                if (image.publicId) {
                    await cloudinary.uploader.destroy(image.publicId);
                }
            }
        }

        await postService.deletePost(postId);

        // Emit post deletion to all connected clients
        if (req.app.get('io')) {
            req.app.get('io').emit('postDeleted', { postId });
        }

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

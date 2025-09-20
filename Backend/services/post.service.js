const postModel = require('../models/post.model');
const commentModel = require('../models/comment.model');
const followModel = require('../models/follow.model');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');

module.exports.createPost = async ({ content, images, author, authorType }) => {
    const post = new postModel({
        content,
        images: images || [],
        author,
        authorType
    });

    const savedPost = await post.save();

    // Update posts count for captain
    if (authorType === 'captain') {
        await captainModel.findByIdAndUpdate(author, { $inc: { postsCount: 1 } });
    }

    return savedPost;
};

module.exports.getFeedPosts = async ({ userId, userType, page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;
    let posts;

    if (userType === 'user') {
        // Get user's followed captains
        const followedCaptains = await followModel.find({
            follower: userId,
            followerType: 'user'
        }).select('following');

        const followedCaptainIds = followedCaptains.map(f => f.following);

        if (followedCaptainIds.length > 0) {
            // Prioritize posts from followed captains
            const followedPosts = await postModel.find({
                author: { $in: followedCaptainIds },
                authorType: 'captain'
            })
            .populate('author', 'fullname avatar bio followersCount')
            .sort({ createdAt: -1 })
            .limit(Math.ceil(limit / 2));

            const otherPostsCount = limit - followedPosts.length;
            const otherPosts = await postModel.find({
                author: { $nin: followedCaptainIds }
            })
            .populate('author', 'fullname avatar bio followersCount postsCount')
            .sort({ createdAt: -1 })
            .limit(otherPostsCount)
            .skip(skip);

            posts = [...followedPosts, ...otherPosts];
        } else {
            posts = await postModel.find({})
            .populate('author', 'fullname avatar bio followersCount postsCount')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);
        }
    } else {
        // For captains, show all posts
        posts = await postModel.find({})
        .populate('author', 'fullname avatar bio followersCount postsCount')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    }

    return posts;
};

// FIXED: Improved likePost function with consistent string comparison
module.exports.likePost = async ({ postId, userId, userType }) => {
    const post = await postModel.findById(postId);
    if (!post) throw new Error('Post not found');

    const existingLikeIndex = post.likes.findIndex(
        like => like.user.toString() === userId.toString() && like.userType === userType
    );

    const existingDislikeIndex = post.dislikes.findIndex(
        dislike => dislike.user.toString() === userId.toString() && dislike.userType === userType
    );

    // If user already liked, remove like (toggle)
    if (existingLikeIndex !== -1) {
        post.likes.splice(existingLikeIndex, 1);
        post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
        // If user had disliked, remove dislike first
        if (existingDislikeIndex !== -1) {
            post.dislikes.splice(existingDislikeIndex, 1);
            post.dislikesCount = Math.max(0, post.dislikesCount - 1);
        }

        // Add like
        post.likes.push({
            user: userId,
            userType: userType,
            likedAt: new Date()
        });
        post.likesCount += 1;
    }

    await post.save();
    return post;
};

// FIXED: Improved dislikePost function
module.exports.dislikePost = async ({ postId, userId, userType }) => {
    const post = await postModel.findById(postId);
    if (!post) throw new Error('Post not found');

    const existingLikeIndex = post.likes.findIndex(
        like => like.user.toString() === userId.toString() && like.userType === userType
    );

    const existingDislikeIndex = post.dislikes.findIndex(
        dislike => dislike.user.toString() === userId.toString() && dislike.userType === userType
    );

    // If user already disliked, remove dislike (toggle)
    if (existingDislikeIndex !== -1) {
        post.dislikes.splice(existingDislikeIndex, 1);
        post.dislikesCount = Math.max(0, post.dislikesCount - 1);
    } else {
        // If user had liked, remove like first
        if (existingLikeIndex !== -1) {
            post.likes.splice(existingLikeIndex, 1);
            post.likesCount = Math.max(0, post.likesCount - 1);
        }

        // Add dislike
        post.dislikes.push({
            user: userId,
            userType: userType,
            dislikedAt: new Date()
        });
        post.dislikesCount += 1;
    }

    await post.save();
    return post;
};

module.exports.getPostById = async (postId) => {
    return await postModel.findById(postId)
        .populate('author', 'fullname avatar bio followersCount postsCount');
};

module.exports.deletePost = async (postId) => {
    // Delete all comments for this post
    await commentModel.deleteMany({ post: postId });

    // Delete the post
    const deletedPost = await postModel.findByIdAndDelete(postId);

    // Update posts count for captain
    if (deletedPost && deletedPost.authorType === 'captain') {
        await captainModel.findByIdAndUpdate(deletedPost.author, { $inc: { postsCount: -1 } });
    }

    return deletedPost;
};

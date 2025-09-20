const followService = require('../services/follow.service');
const followModel = require('../models/follow.model');
const captainModel = require('../models/captain.model');

module.exports.followCaptain = async (req, res) => {
    try {
        const { captainId } = req.params;
        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();

        // Use the service function instead of direct model access
        const result = await followService.followCaptain({
            followerId: userId,
            followerType: userType,
            captainId: captainId
        });

        // Get updated captain info
        const captain = await captainModel.findById(captainId);
        
        if (!captain) {
            return res.status(404).json({
                success: false,
                error: 'Captain not found'
            });
        }

        // Emit socket event for real-time follower count update
        if (req.app.get('io')) {
            req.app.get('io').emit('followerCountUpdated', {
                captainId,
                newFollowerCount: captain.followersCount,
                action: result.action
            });
        }

        res.status(200).json({
            success: true,
            message: result.isFollowing ? 'Captain followed successfully' : 'Captain unfollowed successfully',
            isFollowing: result.isFollowing,
            followersCount: captain.followersCount
        });

    } catch (error) {
        console.error('Follow captain error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports.getFollowers = async (req, res) => {
    try {
        const { captainId } = req.params;
        const followers = await followService.getFollowers(captainId);

        res.status(200).json({
            success: true,
            followers
        });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports.getFollowing = async (req, res) => {
    try {
        const userId = req.user._id;
        const userType = req.user.constructor.modelName.toLowerCase();

        const following = await followService.getFollowing({ userId, userType });

        res.status(200).json({
            success: true,
            following
        });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports.getFollowStatus = async (req, res) => {
    try {
        const { captainId } = req.params;
        const followerId = req.user._id;
        const followerType = req.user.constructor.modelName.toLowerCase();

        const isFollowing = await followService.isFollowing({
            followerId,
            followerType,
            captainId
        });

        res.status(200).json({
            success: true,
            isFollowing
        });
    } catch (error) {
        console.error('Get follow status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

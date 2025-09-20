const followModel = require('../models/follow.model');
const captainModel = require('../models/captain.model');
const userModel = require('../models/user.model');

module.exports.followCaptain = async ({ followerId, followerType, captainId }) => {
    try {
        // Check if already following
        const existingFollow = await followModel.findOne({
            follower: followerId,
            followerType: followerType,
            following: captainId
        });

        if (existingFollow) {
            // Unfollow
            await followModel.deleteOne({ _id: existingFollow._id });
            
            // Decrease captain's follower count (ensure it doesn't go below 0)
            await captainModel.findByIdAndUpdate(
                captainId, 
                { $inc: { followersCount: -1 } },
                { new: true }
            );
            
            // Update user's following count if follower is a user
            if (followerType === 'user') {
                await userModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
            }

            return { action: 'unfollowed', isFollowing: false };
        } else {
            // Follow
            const follow = new followModel({
                follower: followerId,
                followerType: followerType,
                following: captainId
            });
            
            await follow.save();
            
            // Increase captain's follower count
            await captainModel.findByIdAndUpdate(
                captainId, 
                { $inc: { followersCount: 1 } },
                { new: true }
            );
            
            // Update user's following count if follower is a user
            if (followerType === 'user') {
                await userModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
            }

            return { action: 'followed', isFollowing: true };
        }
    } catch (error) {
        console.error('Follow captain service error:', error);
        throw new Error(error.message);
    }
};

module.exports.getFollowers = async (captainId) => {
    try {
        return await followModel.find({ following: captainId })
            .populate('follower', 'fullname avatar')
            .sort({ createdAt: -1 });
    } catch (error) {
        console.error('Get followers service error:', error);
        throw new Error(error.message);
    }
};

module.exports.getFollowing = async ({ userId, userType }) => {
    try {
        return await followModel.find({
            follower: userId,
            followerType: userType
        })
        .populate('following', 'fullname avatar bio vehicle followersCount')
        .sort({ createdAt: -1 });
    } catch (error) {
        console.error('Get following service error:', error);
        throw new Error(error.message);
    }
};

module.exports.isFollowing = async ({ followerId, followerType, captainId }) => {
    try {
        const follow = await followModel.findOne({
            follower: followerId,
            followerType: followerType,
            following: captainId
        });
        return !!follow;
    } catch (error) {
        console.error('Is following service error:', error);
        throw new Error(error.message);
    }
};

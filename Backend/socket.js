const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');

let io;

// Optional socket authentication middleware
const optionalSocketAuth = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        
        if (token) {
            // If token is provided, authenticate
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Try to find user first, then captain
            let user = await userModel.findById(decoded._id);
            let userType = 'user';
            
            if (!user) {
                user = await captainModel.findById(decoded._id);
                userType = 'captain';
            }
            
            if (user) {
                socket.user = user;
                socket.userType = userType;
                socket.authenticated = true;
            }
        } else {
            // Allow unauthenticated connections for legacy ride functionality
            socket.authenticated = false;
        }
        
        next();
    } catch (error) {
        // If token is invalid, still allow connection but mark as unauthenticated
        socket.authenticated = false;
        next();
    }
};

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Apply optional authentication middleware
    io.use(optionalSocketAuth);

    io.on('connection', (socket) => {

        // ===== LEGACY RIDE FUNCTIONALITY (No Auth Required) =====
        
        // Legacy join event for ride functionality
        socket.on('join', async (data) => {
            const { userId, userType } = data;
            
            
            try {
                if (userType === 'user') {
                    await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
                    socket.userId = userId;
                    socket.userType = 'user';
                } else if (userType === 'captain') {
                    await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
                    socket.userId = userId;
                    socket.userType = 'captain';
                    
                    // Join captain to captain room for ride notifications
                    socket.join('captains');
                }
                
                
                // Confirm join
                socket.emit('joined', {
                    success: true,
                    message: `Successfully joined as ${userType}`,
                    socketId: socket.id
                });
                
            } catch (error) {
                socket.emit('joinError', { message: 'Failed to join' });
            }
        });

        // Legacy location update for captains
        socket.on('update-location-captain', async (data) => {
            const { userId, location } = data;
            
            
            if (!location || !location.ltd || !location.lng) {
                return socket.emit('error', { message: 'Invalid location data' });
            }

            try {
                await captainModel.findByIdAndUpdate(userId, {
                    location: {
                        ltd: location.ltd,
                        lng: location.lng
                    }
                });
                
                socket.emit('location-updated', { success: true });
            } catch (error) {
                socket.emit('error', { message: 'Failed to update location' });
            }
        });

        // ===== NEW SOCIAL MEDIA FEATURES (Auth Required) =====
        
        // Check authentication for social media features
        const requireAuth = (callback) => {
            if (!socket.authenticated) {
                socket.emit('error', { message: 'Authentication required for this feature' });
                return false;
            }
            return true;
        };

        // Update authenticated user's socket ID
        if (socket.authenticated) {
            const Model = socket.userType === 'user' ? userModel : captainModel;
            Model.findByIdAndUpdate(socket.user._id, { socketId: socket.id });
            socket.join(`user_${socket.user._id}`);
        }

        // Handle real-time comment creation
        socket.on('createComment', async (data) => {
            if (!requireAuth()) return;
            
            try {
                const { content, postId } = data;
                const commentService = require('./services/comment.service');
                
                const comment = await commentService.createComment({
                    content,
                    postId,
                    author: socket.user._id,
                    authorType: socket.userType
                });

                // Broadcast new comment to all users
                io.emit('newComment', {
                    comment,
                    postId
                });

            } catch (error) {
                socket.emit('error', { message: error.message });
                console.error('Create comment error:', error);
            }
        });

        // Handle typing indicators for comments
        socket.on('typing', (data) => {
            if (!requireAuth()) return;
            
            const { postId } = data;
            socket.to(`post_${postId}`).emit('userTyping', {
                userId: socket.user._id,
                userType: socket.userType,
                userName: `${socket.user.fullname.firstname} ${socket.user.fullname.lastname}`,
                postId: postId
            });
        });

        socket.on('stopTyping', (data) => {
            if (!requireAuth()) return;
            
            const { postId } = data;
            socket.to(`post_${postId}`).emit('userStoppedTyping', {
                userId: socket.user._id,
                postId: postId
            });
        });

        // Join post rooms for real-time updates
        socket.on('joinPost', (postId) => {
            if (!requireAuth()) return;
            
            socket.join(`post_${postId}`);
        });

        socket.on('leavePost', (postId) => {
            if (!requireAuth()) return;
            
            socket.leave(`post_${postId}`);
        });

        // Handle post like/unlike via socket (optional)
        socket.on('likePost', (data) => {
            if (!requireAuth()) return;
            
            const { postId, action } = data;
            socket.to(`post_${postId}`).emit('postLikeUpdate', {
                postId,
                userId: socket.user._id,
                userType: socket.userType,
                action
            });
        });

        // Handle comment like/unlike via socket (optional)
        socket.on('likeComment', (data) => {
            if (!requireAuth()) return;
            
            const { commentId, postId, action } = data;
            socket.to(`post_${postId}`).emit('commentLikeUpdate', {
                commentId,
                postId,
                userId: socket.user._id,
                userType: socket.userType,
                action
            });
        });

        // Handle follow/unfollow updates
        socket.on('followUpdate', (data) => {
            if (!requireAuth()) return;
            
            const { captainId, action } = data;
            socket.to(`user_${captainId}`).emit('newFollower', {
                followerId: socket.user._id,
                followerType: socket.userType,
                followerName: `${socket.user.fullname.firstname} ${socket.user.fullname.lastname}`,
                action
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            
            // Clear socket ID from database
            if (socket.authenticated && socket.user) {
                const Model = socket.userType === 'user' ? userModel : captainModel;
                Model.findByIdAndUpdate(socket.user._id, { socketId: null });
            } else if (socket.userId && socket.userType) {
                // Clear legacy socket ID
                const Model = socket.userType === 'user' ? userModel : captainModel;
                Model.findByIdAndUpdate(socket.userId, { socketId: null });
            }
        });
    });

    return io;
}

// Enhanced send message function with better error handling
const sendMessageToSocketId = (socketId, messageObject) => {
    
    if (!io) {
        return false;
    }
    
    if (!socketId) {
        return false;
    }
    
    try {
        // Send to specific socket
        io.to(socketId).emit(messageObject.event, messageObject.data);
        
        // Also broadcast to all captains if it's a new ride
        if (messageObject.event === 'new-ride') {
            io.to('captains').emit(messageObject.event, messageObject.data);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error sending message:', error);
        return false;
    }
};

// Broadcast to all captains
const broadcastToCaptains = (event, data) => {
    if (io) {
        io.to('captains').emit(event, data);
        return true;
    } else {
        return false;
    }
};

// New helper functions for social media features
const emitToAllUsers = (event, data) => {
    if (io) {
        io.emit(event, data);
        return true;
    }
    return false;
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
        return true;
    }
    return false;
};

const emitToPostRoom = (postId, event, data) => {
    if (io) {
        io.to(`post_${postId}`).emit(event, data);
        return true;
    }
    return false;
};

module.exports = {
    initializeSocket,
    sendMessageToSocketId,
    broadcastToCaptains,
    emitToAllUsers,
    emitToUser,
    emitToPostRoom
};

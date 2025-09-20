import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'

const SocialMediaFeed = ({ 
    posts, 
    setPosts, 
    user, 
    onLikePost, 
    onFollowCaptain, 
    followedCaptains, 
    setFollowedCaptains, 
    isCaptain = false 
}) => {
    const [comments, setComments] = useState({})
    const [showComments, setShowComments] = useState({})
    const [newComment, setNewComment] = useState({})
    const [socket, setSocket] = useState(null)

    // IMPROVED HELPER FUNCTION: Safe string extraction for initials
    const getInitials = (name) => {
        
        if (!name) return 'U'
        
        // Handle different name formats
        let nameStr = ''
        
        if (typeof name === 'string') {
            nameStr = name.trim()
        } else if (typeof name === 'object' && name !== null) {
            // Handle object formats like { first: 'John', last: 'Doe' }
            if (name.first && name.last) {
                nameStr = `${name.first} ${name.last}`.trim()
            } else if (name.name) {
                nameStr = name.name.trim()
            } else if (name.fullname) {
                nameStr = name.fullname.trim()
            } else {
                // If it's an object but doesn't have expected fields, try to stringify
                nameStr = Object.values(name).join(' ').trim()
            }
        } else {
            nameStr = String(name).trim()
        }
        
        return nameStr.length > 0 ? nameStr.charAt(0).toUpperCase() : 'U'
    }

    // IMPROVED HELPER FUNCTION: Safe name display
    const getDisplayName = (name) => {
        
        if (!name) return 'Unknown User'
        
        // Handle different name formats
        let nameStr = ''
        
        if (typeof name === 'string') {
            nameStr = name.trim()
        } else if (typeof name === 'object' && name !== null) {
            // Handle object formats like { first: 'John', last: 'Doe' }
            if (name.first && name.last) {
                nameStr = `${name.first} ${name.last}`.trim()
            } else if (name.name) {
                nameStr = name.name.trim()
            } else if (name.fullname) {
                nameStr = name.fullname.trim()
            } else {
                // If it's an object but doesn't have expected fields, try to stringify
                nameStr = Object.values(name).join(' ').trim()
            }
        } else {
            nameStr = String(name).trim()
        }
        
        return nameStr.length > 0 ? nameStr : 'Unknown User'
    }

    // Initialize socket connection for real-time updates
    useEffect(() => {
        const token = localStorage.getItem('token')
        const socketConnection = io(import.meta.env.VITE_BASE_URL || 'http://localhost:4000', {
            auth: { token }
        })
        setSocket(socketConnection)

        // Listen for real-time new posts
        socketConnection.on('newPost', (data) => {
            setPosts(prev => {
                // Check if post already exists to avoid duplicates
                const exists = prev.some(post => post._id === data.post._id)
                if (!exists) {
                    return [data.post, ...prev]
                }
                return prev
            })
        })

        // Listen for real-time post likes
        socketConnection.on('postLiked', (data) => {
            setPosts(prev => prev.map(post => 
                post._id === data.postId ? {
                    ...post,
                    likesCount: data.likesCount,
                    dislikesCount: data.dislikesCount,
                    // Only update for the current user
                    isLikedByUser: data.userId === user._id ? (data.action === 'liked') : post.isLikedByUser,
                    isDislikedByUser: data.userId === user._id ? false : post.isDislikedByUser
                } : post
            ))
        })

        // Listen for real-time post dislikes
        socketConnection.on('postDisliked', (data) => {
            setPosts(prev => prev.map(post => 
                post._id === data.postId ? {
                    ...post,
                    likesCount: data.likesCount,
                    dislikesCount: data.dislikesCount,
                    // Only update for the current user
                    isDislikedByUser: data.userId === user._id ? (data.action === 'disliked') : post.isDislikedByUser,
                    isLikedByUser: data.userId === user._id ? false : post.isLikedByUser
                } : post
            ))
        })

        // Listen for real-time new comments
        socketConnection.on('newComment', (data) => {
            // Update post comments count
            setPosts(prev => prev.map(post => 
                post._id === data.postId ? {
                    ...post,
                    commentsCount: (post.commentsCount || 0) + 1
                } : post
            ))
            // Update comments list if it's open for this post
            setComments(prev => ({
                ...prev,
                [data.postId]: prev[data.postId] ? [data.comment, ...prev[data.postId]] : [data.comment]
            }))
        })

        // Listen for real-time follower updates
        socketConnection.on('followerCountUpdated', (data) => {
            // Update the captain's follower count in all posts
            setPosts(prev => prev.map(post => 
                post.author?._id === data.captainId ? {
                    ...post,
                    author: { ...post.author, followersCount: data.newFollowerCount }
                } : post
            ))
        })

        // Listen for follow updates
        socketConnection.on('followUpdate', (data) => {
            if (data.action === 'followed') {
                setFollowedCaptains(prev => [...prev, { _id: data.captainId }])
            } else {
                setFollowedCaptains(prev => prev.filter(cap => cap._id !== data.captainId))
            }
        })

        return () => {
            socketConnection.disconnect()
        }
    }, [user?._id, setPosts, setFollowedCaptains])

    // Like functionality with proper toggle
    const handleLike = async (postId) => {
        try {
            // Find current post state
            const currentPost = posts.find(post => post._id === postId)
            const wasLiked = currentPost?.isLikedByUser || false
            const wasDisliked = currentPost?.isDislikedByUser || false


            // Optimistic update
            setPosts(prev => prev.map(post => 
                post._id === postId ? {
                    ...post,
                    likesCount: wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1,
                    dislikesCount: wasDisliked ? Math.max(0, post.dislikesCount - 1) : post.dislikesCount,
                    isLikedByUser: !wasLiked,
                    isDislikedByUser: false
                } : post
            ))

            // Make API call
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/posts/${postId}/like`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })


            // Update with actual server response
            setPosts(prev => prev.map(post => 
                post._id === postId ? {
                    ...post,
                    likesCount: response.data.post.likesCount,
                    dislikesCount: response.data.post.dislikesCount,
                    isLikedByUser: response.data.post.isLikedByUser,
                    isDislikedByUser: response.data.post.isDislikedByUser
                } : post
            ))

        } catch (error) {
            console.error('Error liking post:', error)
            // Revert optimistic update on error
            const currentPost = posts.find(post => post._id === postId)
            const wasLiked = !currentPost?.isLikedByUser // Reverse the optimistic update
            const wasDisliked = currentPost?.isDislikedByUser

            setPosts(prev => prev.map(post => 
                post._id === postId ? {
                    ...post,
                    likesCount: wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1,
                    dislikesCount: wasDisliked ? post.dislikesCount + 1 : post.dislikesCount,
                    isLikedByUser: wasLiked,
                    isDislikedByUser: wasDisliked
                } : post
            ))
            alert('Error updating like. Please try again.')
        }
    }

    // Dislike functionality
    const handleDislike = async (postId) => {
        try {
            // Find current post state
            const currentPost = posts.find(post => post._id === postId)
            const wasLiked = currentPost?.isLikedByUser || false
            const wasDisliked = currentPost?.isDislikedByUser || false


            // Optimistic update
            setPosts(prev => prev.map(post => 
                post._id === postId ? {
                    ...post,
                    likesCount: wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount,
                    dislikesCount: wasDisliked ? Math.max(0, post.dislikesCount - 1) : post.dislikesCount + 1,
                    isLikedByUser: false,
                    isDislikedByUser: !wasDisliked
                } : post
            ))

            // Make API call
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/posts/${postId}/dislike`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })


            // Update with actual server response
            setPosts(prev => prev.map(post => 
                post._id === postId ? {
                    ...post,
                    likesCount: response.data.post.likesCount,
                    dislikesCount: response.data.post.dislikesCount,
                    isLikedByUser: response.data.post.isLikedByUser,
                    isDislikedByUser: response.data.post.isDislikedByUser
                } : post
            ))

        } catch (error) {
            console.error('Error disliking post:', error)
            // Revert optimistic update on error
            const currentPost = posts.find(post => post._id === postId)
            const wasLiked = currentPost?.isLikedByUser
            const wasDisliked = !currentPost?.isDislikedByUser // Reverse the optimistic update

            setPosts(prev => prev.map(post => 
                post._id === postId ? {
                    ...post,
                    likesCount: wasLiked ? post.likesCount + 1 : post.likesCount,
                    dislikesCount: wasDisliked ? Math.max(0, post.dislikesCount - 1) : post.dislikesCount + 1,
                    isLikedByUser: wasLiked,
                    isDislikedByUser: wasDisliked
                } : post
            ))
            alert('Error updating dislike. Please try again.')
        }
    }

    // Enhanced follow functionality with real-time updates
    const handleFollow = async (captainId) => {
        try {
            const isCurrentlyFollowing = isFollowing(captainId)

            // Optimistic update for follow status
            if (isCurrentlyFollowing) {
                setFollowedCaptains(prev => prev.filter(cap => cap._id !== captainId))
            } else {
                setFollowedCaptains(prev => [...prev, { _id: captainId }])
            }

            // Make API call
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/follow/captain/${captainId}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })


            // Update local state with server response
            if (response.data.success) {
                // Update the followed captains list based on server response
                if (response.data.isFollowing) {
                    setFollowedCaptains(prev => {
                        const exists = prev.some(cap => cap._id === captainId)
                        if (!exists) {
                            return [...prev, { _id: captainId }]
                        }
                        return prev
                    })
                } else {
                    setFollowedCaptains(prev => prev.filter(cap => cap._id !== captainId))
                }

                // Update posts with new follower count
                setPosts(prev => prev.map(post => 
                    post.author?._id === captainId ? {
                        ...post,
                        author: { 
                            ...post.author, 
                            followersCount: response.data.followersCount 
                        }
                    } : post
                ))
            }

        } catch (error) {
            console.error('Error following captain:', error)
            
            // Revert optimistic update on error
            const wasFollowing = !isFollowing(captainId) // Reverse the optimistic update
            if (!wasFollowing) {
                setFollowedCaptains(prev => prev.filter(cap => cap._id !== captainId))
            } else {
                setFollowedCaptains(prev => [...prev, { _id: captainId }])
            }
            
            // Show user-friendly error message
            const errorMessage = error.response?.data?.error || 'Error updating follow status. Please try again.'
            alert(errorMessage)
        }
    }

    const isFollowing = (captainId) => {
        return followedCaptains?.some(cap => cap._id === captainId || cap.following?._id === captainId) || false
    }

    const toggleComments = async (postId) => {
        if (!showComments[postId]) {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/posts/${postId}/comments`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
                setComments(prev => ({
                    ...prev,
                    [postId]: response.data.comments
                }))

                // Join the post room for real-time comment updates
                if (socket) {
                    socket.emit('joinPost', postId)
                }
            } catch (error) {
                console.error('Error fetching comments:', error)
            }
        } else {
            // Leave the post room when closing comments
            if (socket) {
                socket.emit('leavePost', postId)
            }
        }

        setShowComments(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }))
    }

    const handleAddComment = async (postId) => {
        const content = newComment[postId]
        if (!content?.trim()) return

        try {
            // Clear input immediately for better UX
            setNewComment(prev => ({ ...prev, [postId]: '' }))

            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/posts/${postId}/comments`, 
                { content: content.trim() }, 
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            )

            // The real-time update will be handled by socket

        } catch (error) {
            console.error('Error adding comment:', error)
            // Restore the comment content on error
            setNewComment(prev => ({ ...prev, [postId]: content }))
        }
    }

    const formatTime = (dateString) => {
        if (!dateString) return 'Unknown'
        try {
            const date = new Date(dateString)
            const now = new Date()
            const diffInMs = now - date
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
            const diffInHours = Math.floor(diffInMinutes / 60)
            const diffInDays = Math.floor(diffInHours / 24)

            if (diffInMinutes < 1) return 'Just now'
            if (diffInMinutes < 60) return `${diffInMinutes}m`
            if (diffInHours < 24) return `${diffInHours}h`
            return `${diffInDays}d`
        } catch (error) {
            console.error('Error formatting time:', error)
            return 'Unknown'
        }
    }

    // SAFETY CHECK: Ensure posts is an array
    if (!Array.isArray(posts)) {
        console.error('Posts is not an array:', posts)
        return (
            <div className="max-w-2xl mx-auto">
                <div className="text-center py-12">
                    <p className="text-red-500 text-lg">Error loading posts. Please refresh the page.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {posts.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No posts yet. Start following captains or create your first post!</p>
                </div>
            ) : (
                posts.map((post) => {
                    // SAFETY CHECK: Ensure post object exists
                    if (!post || !post._id) {
                        console.error('Invalid post object:', post)
                        return null
                    }

                    // DEBUG: Log the post author data structure

                    return (
                        <div key={post._id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                            {/* Post Header */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                            {getInitials(post.author?.fullname)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {getDisplayName(post.author?.fullname)}
                                            </h3>
                                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                <span>{formatTime(post.createdAt)}</span>
                                                {post.authorType === 'captain' && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{post.author?.followersCount || 0} followers</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Follow Button (only show if post is from captain and user is not the captain) */}
                                    {post.authorType === 'captain' && !isCaptain && post.author?._id !== user?._id && (
                                        <button
                                            onClick={() => handleFollow(post.author._id)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                isFollowing(post.author._id)
                                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                        >
                                            {isFollowing(post.author._id) ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Post Content */}
                            <div className="p-4">
                                <p className="text-gray-800 leading-relaxed mb-4">{post.content || 'No content'}</p>

                                {/* Post Images */}
                                {post.images && Array.isArray(post.images) && post.images.length > 0 && (
                                    <div className={`grid gap-2 mb-4 ${
                                        post.images.length === 1 ? 'grid-cols-1' : 
                                        post.images.length === 2 ? 'grid-cols-2' : 
                                        'grid-cols-2'
                                    }`}>
                                        {post.images.slice(0, 4).map((image, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={image.url || ''}
                                                    alt={`Post image ${index + 1}`}
                                                    className="w-full h-48 object-cover rounded-lg"
                                                    onError={(e) => {
                                                        console.error('Image failed to load:', image.url)
                                                        e.target.style.display = 'none'
                                                    }}
                                                />
                                                {index === 3 && post.images.length > 4 && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                                                        <span className="text-white font-semibold text-lg">
                                                            +{post.images.length - 4}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Like/Dislike/Comment Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center space-x-6">
                                        {/* Like Button */}
                                        <button
                                            onClick={() => handleLike(post._id)}
                                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                                                post.isLikedByUser
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <svg className="w-5 h-5" fill={post.isLikedByUser ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v13m-3-4l-2-2m0 0l-2-2m2 2l2-2m-2 2l2 2" />
                                            </svg>
                                            <span className="font-medium">{post.likesCount || 0}</span>
                                        </button>

                                        {/* Dislike Button */}
                                        <button
                                            onClick={() => handleDislike(post._id)}
                                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                                                post.isDislikedByUser
                                                    ? 'bg-red-50 text-red-600'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <svg className="w-5 h-5" fill={post.isDislikedByUser ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17V4m-3 4l2 2m0 0l2 2m-2-2l-2 2m2-2l-2-2" />
                                            </svg>
                                            <span className="font-medium">{post.dislikesCount || 0}</span>
                                        </button>

                                        {/* Comment Button */}
                                        <button
                                            onClick={() => toggleComments(post._id)}
                                            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            <span className="font-medium">{post.commentsCount || 0}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Comments Section */}
                                {showComments[post._id] && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        {/* Add Comment */}
                                        <div className="flex space-x-3 mb-4">
                                            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                                {getInitials(user?.fullname)}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Add a comment..."
                                                    value={newComment[post._id] || ''}
                                                    onChange={(e) => setNewComment(prev => ({ ...prev, [post._id]: e.target.value }))}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post._id)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleAddComment(post._id)}
                                                disabled={!newComment[post._id]?.trim()}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Post
                                            </button>
                                        </div>

                                        {/* Comments List */}
                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {comments[post._id]?.length > 0 ? (
                                                comments[post._id].map((comment) => (
                                                    <div key={comment._id || Math.random()} className="flex space-x-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                                            {getInitials(comment.author?.fullname)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="bg-gray-100 rounded-lg px-3 py-2">
                                                                <p className="font-semibold text-sm text-gray-900">
                                                                    {getDisplayName(comment.author?.fullname)}
                                                                </p>
                                                                <p className="text-gray-700 text-sm">{comment.content || 'No content'}</p>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-1 ml-3">
                                                                {formatTime(comment.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}

export default SocialMediaFeed

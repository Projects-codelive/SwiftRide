import React, { useState } from 'react'
import axios from 'axios'

const CreatePost = ({ onClose, user, isCaptain = false, onPostCreated }) => {
    const [content, setContent] = useState('')
    const [images, setImages] = useState([])
    const [previews, setPreviews] = useState([])
    const [loading, setLoading] = useState(false)

    // HELPER FUNCTION: Safe string extraction for user initials
    const getInitials = (name) => {
        if (!name) return 'U'
        
        let nameStr = ''
        if (typeof name === 'string') {
            nameStr = name.trim()
        } else if (typeof name === 'object' && name !== null) {
            if (name.first && name.last) {
                nameStr = `${name.first} ${name.last}`.trim()
            } else if (name.name) {
                nameStr = name.name.trim()
            } else if (name.fullname) {
                nameStr = name.fullname.trim()
            } else {
                nameStr = Object.values(name).join(' ').trim()
            }
        } else {
            nameStr = String(name).trim()
        }
        
        return nameStr.length > 0 ? nameStr.charAt(0).toUpperCase() : 'U'
    }

    // HELPER FUNCTION: Safe name display
    const getDisplayName = (name) => {
        if (!name) return 'Unknown User'
        
        let nameStr = ''
        if (typeof name === 'string') {
            nameStr = name.trim()
        } else if (typeof name === 'object' && name !== null) {
            if (name.first && name.last) {
                nameStr = `${name.first} ${name.last}`.trim()
            } else if (name.name) {
                nameStr = name.name.trim()
            } else if (name.fullname) {
                nameStr = name.fullname.trim()
            } else {
                nameStr = Object.values(name).join(' ').trim()
            }
        } else {
            nameStr = String(name).trim()
        }
        
        return nameStr.length > 0 ? nameStr : 'Unknown User'
    }

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files)
        
        if (files.length + images.length > 5) {
            alert('Maximum 5 images allowed')
            return
        }

        // Validate file types
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        const invalidFiles = files.filter(file => !validTypes.includes(file.type))
        
        if (invalidFiles.length > 0) {
            alert('Please select only image files (JPEG, PNG, GIF, WebP)')
            return
        }

        // Validate file sizes (max 5MB per image)
        const maxSize = 5 * 1024 * 1024 // 5MB
        const oversizedFiles = files.filter(file => file.size > maxSize)
        
        if (oversizedFiles.length > 0) {
            alert('Each image must be less than 5MB')
            return
        }

        setImages(prev => [...prev, ...files])

        // Create previews
        files.forEach(file => {
            const reader = new FileReader()
            reader.onload = (e) => {
                setPreviews(prev => [...prev, e.target.result])
            }
            reader.readAsDataURL(file)
        })
    }

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setPreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!content.trim() && images.length === 0) {
            alert('Please add some content or images')
            return
        }

        if (content.length > 1000) {
            alert('Content must be less than 1000 characters')
            return
        }

        setLoading(true)

        try {

            // Create FormData for multipart/form-data request
            const formData = new FormData()
            formData.append('content', content.trim())
            
            // Add images to FormData
            images.forEach((image, index) => {
                formData.append('images', image)
            })

            // // Log FormData contents for debugging
            // for (let [key, value] of formData.entries()) {
            //     console.log(`${key}:`, value)
            // }

            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('No authentication token found. Please login again.')
            }

            const response = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/posts`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        // Don't set Content-Type header, let axios handle it for FormData
                    },
                    timeout: 30000 // 30 seconds timeout
                }
            )


            if (response.data.success) {
                // Reset form
                setContent('')
                setImages([])
                setPreviews([])
                
                // Call success callback if provided
                if (onPostCreated && typeof onPostCreated === 'function') {
                    onPostCreated(response.data.post)
                }
                
                // Close the modal
                if (onClose && typeof onClose === 'function') {
                    onClose()
                }
                
                alert('Post created successfully!')
            } else {
                throw new Error(response.data.error || 'Failed to create post')
            }

        } catch (error) {
            console.error('Error creating post:', error)
            
            let errorMessage = 'Error creating post. Please try again.'
            
            if (error.response) {
                // Server responded with error
                console.log('Error response:', error.response.data)
                errorMessage = error.response.data.error || error.response.data.message || errorMessage
                
                if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
                    errorMessage = error.response.data.errors.map(err => err.msg).join(', ')
                }
            } else if (error.request) {
                // Network error
                errorMessage = 'Network error. Please check your connection.'
            } else if (error.message) {
                errorMessage = error.message
            }
            
            alert(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Create New Post</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    {/* User Info */}
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {getInitials(user?.fullname)}
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">
                                {getDisplayName(user?.fullname)}
                            </h3>
                            <div className="flex items-center space-x-1">
                                {isCaptain && (
                                    <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                                )}
                                <span className="text-sm text-gray-500">
                                    {isCaptain ? 'Captain' : 'User'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Content Input */}
                    <div className="mb-4">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's on your mind?"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows="4"
                            maxLength="1000"
                            disabled={loading}
                        />
                        <div className="text-right text-sm text-gray-500 mt-1">
                            {content.length}/1000 characters
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div className="mb-4">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                            id="image-upload"
                            disabled={loading || images.length >= 5}
                        />
                        <label
                            htmlFor="image-upload"
                            className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                loading || images.length >= 5
                                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                            }`}
                        >
                            <div className="text-center">
                                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-gray-600">
                                    {images.length >= 5 
                                        ? 'Maximum 5 images reached' 
                                        : 'Click to add images (max 5)'}
                                </p>
                                <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB each</p>
                            </div>
                        </label>
                    </div>

                    {/* Image Previews */}
                    {previews.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Selected Images ({previews.length}/5)
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {previews.map((preview, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-24 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            disabled={loading}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (!content.trim() && images.length === 0)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                            {loading && (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {loading ? 'Creating...' : 'Create Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CreatePost

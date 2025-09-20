import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CaptainDetails from '../components/CaptainDetails'
import RidePopUp from '../components/RidePopUp'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ConfirmRidePopUp from '../components/ConfirmRidePopUp'
import { useEffect, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { CaptainDataContext } from '../context/CapatainContext'
import axios from 'axios'
import SocialMediaFeed from '../components/SocialMediaFeed'
import CreatePost from '../components/CreatePost'

const CaptainHome = () => {
    // Navigation state
    const [currentView, setCurrentView] = useState('maps'); // 'maps' or 'social'
    const [navExpanded, setNavExpanded] = useState(false);

    // Existing ride states
    const [ridePopupPanel, setRidePopupPanel] = useState(false)
    const [confirmRidePopupPanel, setConfirmRidePopupPanel] = useState(false)
    const ridePopupPanelRef = useRef(null)
    const confirmRidePopupPanelRef = useRef(null)
    const [ride, setRide] = useState(null)

    // Social media states - Fix: proper state management
    const [posts, setPosts] = useState([])
    const [showCreatePost, setShowCreatePost] = useState(false)
    const [followers, setFollowers] = useState([])
    const [followedCaptains, setFollowedCaptains] = useState([]) // For consistency
    const [dateDistance, setDateDistance] = useState(null)

    const { socket } = useContext(SocketContext)
    const { captain } = useContext(CaptainDataContext)

    // Fix the catch block in getDistanceAndTime function
    // UPDATED: Fetch distance function
  const getDistanceAndTime = async (rideData) => {
    if (!rideData?.pickup || !rideData?.destination) return
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-distance-time`, {
        params: {
          origin: rideData.pickup,
          destination: rideData.destination
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })
      setDateDistance(response.data)
    } catch (error) {
      console.error('Error fetching distance:', error);
    }
  }

    useEffect(() => {
        socket.emit('join', { userId: captain._id, userType: 'captain' })

        const updateLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    socket.emit('update-location-captain', {
                        userId: captain._id,
                        location: {
                            ltd: position.coords.latitude,
                            lng: position.coords.longitude
                        }
                    })
                })
            }
        }

        const locationInterval = setInterval(updateLocation, 10000)
        updateLocation()

        // Load social media data
        if (currentView === 'social') {
            fetchPosts()
            fetchFollowers()
        }

        return () => clearInterval(locationInterval)
    }, [currentView])

    // Socket events for rides
    socket.on('new-ride', (data) => {
        setRide(data)
        setRidePopupPanel(true)
        getDistanceAndTime(data)
    })

    // Fetch posts for social media - Fix: include proper data
    const fetchPosts = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/posts/feed`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setPosts(response.data.posts)
        } catch (error) {
            console.error('Error fetching posts:', error)
        }
    }

    // Fetch followers
    const fetchFollowers = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/follow/followers/${captain._id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setFollowers(response.data.followers)
        } catch (error) {
            console.error('Error fetching followers:', error)
        }
    }



    // Create new post - Fix: real-time update
    const handleCreatePost = async (content, images) => {
        try {
            const formData = new FormData()
            formData.append('content', content)
            
            if (images && images.length > 0) {
                images.forEach(image => {
                    formData.append('images', image)
                })
            }

            await axios.post(`${import.meta.env.VITE_BASE_URL}/posts`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            })
            
            setShowCreatePost(false)
            // Socket will handle real-time updates
        } catch (error) {
            console.error('Error creating post:', error)
        }
    }

    async function confirmRide() {
        const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/confirm`, {
            rideId: ride._id,
            captainId: captain._id,
        }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })

        setRidePopupPanel(false)
        setConfirmRidePopupPanel(true)
    }

    useGSAP(function () {
        if (ridePopupPanel) {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ridePopupPanel])

    useGSAP(function () {
        if (confirmRidePopupPanel) {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [confirmRidePopupPanel])

    return (
        <div className='h-screen'>
            {/* Navigation Bar */}
            <div className='fixed top-0 left-0 z-50 p-4'>
                <div className='relative'>
                    {/* Menu Icon */}
                    <button
                        onClick={() => setNavExpanded(!navExpanded)}
                        className='bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200'
                    >
                        <i className={`ri-${navExpanded ? 'close' : 'menu'}-line text-xl`}></i>
                    </button>

                    {/* Expanded Menu */}
                    {navExpanded && (
                        <div className='absolute top-16 left-0 bg-white rounded-lg shadow-lg overflow-hidden min-w-[200px]'>
                            <button
                                onClick={() => {
                                    setCurrentView('maps')
                                    setNavExpanded(false)
                                }}
                                className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                                    currentView === 'maps' ? 'bg-green-50 text-green-600' : 'text-gray-700'
                                }`}
                            >
                                <i className="ri-car-line text-lg"></i>
                                <span className="font-medium">Captain Mode</span>
                            </button>
                            <button
                                onClick={() => {
                                    setCurrentView('social')
                                    setNavExpanded(false)
                                }}
                                className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                                    currentView === 'social' ? 'bg-green-50 text-green-600' : 'text-gray-700'
                                }`}
                            >
                                <i className="ri-chat-3-line text-lg"></i>
                                <span className="font-medium">Social Feed</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Current View Indicator */}
            <div className='fixed top-4 right-4 z-40'>
                <div className='bg-green-600/90 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2'>
                    <div className='w-2 h-2 bg-green-300 rounded-full animate-pulse'></div>
                    <span>{currentView === 'maps' ? '🚗 Captain Mode' : '📱 Social'}</span>
                </div>
            </div>

            

            {/* Maps View - Captain Mode */}
            {currentView === 'maps' && (
                <>
                    <div className='h-3/5'>
                        <img className='h-full w-full object-cover' src="https://miro.medium.com/v2/resize:fit:1400/0*gwMx05pqII5hbfmX.gif" alt="" />
                    </div>

                    <div className='h-2/5 p-6'>
                        <CaptainDetails />
                    </div>

                    <div ref={ridePopupPanelRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
                        <RidePopUp 
                            ride={ride} 
                            setRidePopupPanel={setRidePopupPanel} 
                            setConfirmRidePopupPanel={setConfirmRidePopupPanel} 
                            confirmRide={confirmRide} 
                            dateAndTime={dateDistance}
                        />
                    </div>

                    <div ref={confirmRidePopupPanelRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
                        <ConfirmRidePopUp 
                            ride={ride} 
                            setConfirmRidePopupPanel={setConfirmRidePopupPanel} 
                            setRidePopupPanel={setRidePopupPanel}
                            dateAndTime={dateDistance}
                        />
                    </div>
                </>
            )}

            {/* Social Media View */}
            {currentView === 'social' && (
                <div className='h-screen bg-gray-50 pt-16'>
                    {/* Create Post Button */}
                    <div className='fixed top-16 right-4 z-40'>
                        <button
                            onClick={() => setShowCreatePost(true)}
                            className='bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors'
                        >
                            <i className="ri-add-line text-xl"></i>
                        </button>
                    </div>

                    {/* Captain Stats in Social View */}
                    <div className='px-4 pb-4'>
                        <div className='bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg p-4'>
                            <div className='flex items-center space-x-4'>
                                <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center'>
                                    <i className="ri-user-star-line text-xl"></i>
                                </div>
                                <div className='flex-1'>
                                    <h3 className='font-semibold text-lg'>
                                        {captain.fullname.firstname} {captain.fullname.lastname}
                                    </h3>
                                    <p className='text-white/80 text-sm'>Captain</p>
                                </div>
                                <div className='text-right text-sm'>
                                    <div>{captain.followersCount || 0} followers</div>
                                    <div>{captain.postsCount || 0} posts</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Social Media Feed - Fix: pass proper props */}
                    <div className='h-full overflow-y-auto pb-20'>
                        <SocialMediaFeed
                            posts={posts}
                            setPosts={setPosts}
                            user={captain}
                            followedCaptains={followedCaptains}
                            setFollowedCaptains={setFollowedCaptains}
                            isCaptain={true}
                        />
                    </div>

                    {/* Create Post Modal */}
                    {showCreatePost && (
                        <CreatePost
                            onClose={() => setShowCreatePost(false)}
                            onSubmit={handleCreatePost}
                            user={captain}
                            isCaptain={true}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default CaptainHome

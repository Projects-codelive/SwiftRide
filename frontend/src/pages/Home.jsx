import React, { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import 'remixicon/fonts/remixicon.css'
import LocationSearchPanel from '../components/LocationSearchPanel';
import VehiclePanel from '../components/VehiclePanel';
import ConfirmRide from '../components/ConfirmRide';
import LookingForDriver from '../components/LookingForDriver';
import WaitingForDriver from '../components/WaitingForDriver';
import { SocketContext } from '../context/SocketContext';
import { useContext } from 'react';
import { UserDataContext } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import LiveTracking from '../components/LiveTracking';
import SocialMediaFeed from '../components/SocialMediaFeed';
import CreatePost from '../components/CreatePost';

const Home = () => {
    // Navigation state
    const [currentView, setCurrentView] = useState('maps'); // 'maps' or 'social'
    const [navExpanded, setNavExpanded] = useState(false);

    // Existing map states
    const [pickup, setPickup] = useState('')
    const [destination, setDestination] = useState('')
    const [panelOpen, setPanelOpen] = useState(false)
    const vehiclePanelRef = useRef(null)
    const confirmRidePanelRef = useRef(null)
    const vehicleFoundRef = useRef(null)
    const waitingForDriverRef = useRef(null)
    const panelRef = useRef(null)
    const panelCloseRef = useRef(null)
    const [vehiclePanel, setVehiclePanel] = useState(false)
    const [confirmRidePanel, setConfirmRidePanel] = useState(false)
    const [vehicleFound, setVehicleFound] = useState(false)
    const [waitingForDriver, setWaitingForDriver] = useState(false)
    const [pickupSuggestions, setPickupSuggestions] = useState([])
    const [destinationSuggestions, setDestinationSuggestions] = useState([])
    const [activeField, setActiveField] = useState(null)
    const [fare, setFare] = useState({})
    const [vehicleType, setVehicleType] = useState(null)
    const [ride, setRide] = useState(null)

    // Social media states - Fix: pass setPosts to SocialMediaFeed
    const [posts, setPosts] = useState([])
    const [showCreatePost, setShowCreatePost] = useState(false)
    const [followedCaptains, setFollowedCaptains] = useState([])

    const navigate = useNavigate()
    const { socket } = useContext(SocketContext)
    const { user } = useContext(UserDataContext)

    useEffect(() => {
        socket.emit("join", { userType: "user", userId: user._id })
        
        // Load initial data for social media
        if (currentView === 'social') {
            fetchPosts()
            fetchFollowedCaptains()
        }
    }, [user, currentView])

    // Socket events for ride functionality
    socket.on('ride-confirmed', ride => {
        setVehicleFound(false)
        setWaitingForDriver(true)
        setRide(ride)
    })

    socket.on('ride-started', ride => {
        setWaitingForDriver(false)
        navigate('/riding', { state: { ride } })
    })

    // Fetch posts for social media - Fix: include isLikedByUser
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

    // Fetch followed captains - Fix: get complete follow data
    const fetchFollowedCaptains = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/follow/following`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            // Map the response to match the expected format
            const followedData = response.data.following.map(follow => ({
                _id: follow.following._id || follow._id,
                following: follow.following
            }))
            setFollowedCaptains(followedData)
        } catch (error) {
            console.error('Error fetching followed captains:', error)
        }
    }

    // Create new post - Fix: properly refresh posts with real-time update
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
            // Don't manually refresh - the socket will handle real-time updates
        } catch (error) {
            console.error('Error creating post:', error)
        }
    }

    // Existing map functions (unchanged)
    const handlePickupChange = async (e) => {
        setPickup(e.target.value)
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                params: { input: e.target.value },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            setPickupSuggestions(response.data)
        } catch {
            // handle error
        }
    }

    const handleDestinationChange = async (e) => {
        setDestination(e.target.value)
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                params: { input: e.target.value },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            setDestinationSuggestions(response.data)
        } catch {
            // handle error
        }
    }


    const submitHandler = (e) => {
        e.preventDefault()
    }

    // Existing GSAP animations (unchanged)
    useGSAP(function () {
        if (panelOpen) {
            gsap.to(panelRef.current, { height: '70%', padding: 24 })
            gsap.to(panelCloseRef.current, { opacity: 1 })
        } else {
            gsap.to(panelRef.current, { height: '0%', padding: 0 })
            gsap.to(panelCloseRef.current, { opacity: 0 })
        }
    }, [panelOpen])

    useGSAP(function () {
        if (vehiclePanel) {
            gsap.to(vehiclePanelRef.current, { transform: 'translateY(0)' })
        } else {
            gsap.to(vehiclePanelRef.current, { transform: 'translateY(100%)' })
        }
    }, [vehiclePanel])

    useGSAP(function () {
        if (confirmRidePanel) {
            gsap.to(confirmRidePanelRef.current, { transform: 'translateY(0)' })
        } else {
            gsap.to(confirmRidePanelRef.current, { transform: 'translateY(100%)' })
        }
    }, [confirmRidePanel])

    useGSAP(function () {
        if (vehicleFound) {
            gsap.to(vehicleFoundRef.current, { transform: 'translateY(0)' })
        } else {
            gsap.to(vehicleFoundRef.current, { transform: 'translateY(100%)' })
        }
    }, [vehicleFound])

    useGSAP(function () {
        if (waitingForDriver) {
            gsap.to(waitingForDriverRef.current, { transform: 'translateY(0)' })
        } else {
            gsap.to(waitingForDriverRef.current, { transform: 'translateY(100%)' })
        }
    }, [waitingForDriver])

    async function findTrip() {
        setVehiclePanel(true)
        setPanelOpen(false)
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/get-fare`, {
            params: { pickup, destination },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        setFare(response.data)
    }

    async function createRide() {
        const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
            pickup,
            destination,
            vehicleType
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
    }

    return (
        <div className='h-screen relative overflow-hidden'>
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
                                    currentView === 'maps' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                            >
                                <i className="ri-map-pin-line text-lg"></i>
                                <span className="font-medium">Maps & Rides</span>
                            </button>
                            <button
                                onClick={() => {
                                    setCurrentView('social')
                                    setNavExpanded(false)
                                }}
                                className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                                    currentView === 'social' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                <div className='bg-black/70 text-white px-3 py-1 rounded-full text-sm'>
                    {currentView === 'maps' ? '🗺️ Maps' : '📱 Social'}
                </div>
            </div>

            {/* Maps View */}
            {currentView === 'maps' && (
                <>
                    {/* Maps view content - unchanged */}
                    <div className='h-screen w-screen'>
                        <LiveTracking />
                    </div>

                    <div className='flex flex-col justify-end h-screen absolute top-0 w-full'>
                        <div className='h-[30%] p-6 bg-white relative'>
                            <h5
                                ref={panelCloseRef}
                                onClick={() => setPanelOpen(false)}
                                className='absolute opacity-0 right-6 top-6 text-2xl'
                            >
                                <i className="ri-arrow-down-wide-line"></i>
                            </h5>
                            <h4 className='text-2xl font-semibold'>Find a trip</h4>
                            <form className='relative py-3' onSubmit={(e) => submitHandler(e)}>
                                <div className="line absolute h-16 w-1 top-[50%] -translate-y-1/2 left-5 bg-gray-700 rounded-full"></div>
                                <input
                                    onClick={() => {
                                        setPanelOpen(true)
                                        setActiveField('pickup')
                                    }}
                                    value={pickup}
                                    onChange={handlePickupChange}
                                    className='bg-[#eee] px-12 py-2 text-lg rounded-lg w-full'
                                    type="text"
                                    placeholder='Add a pick-up location'
                                />
                                <input
                                    onClick={() => {
                                        setPanelOpen(true)
                                        setActiveField('destination')
                                    }}
                                    value={destination}
                                    onChange={handleDestinationChange}
                                    className='bg-[#eee] px-12 py-2 text-lg rounded-lg w-full mt-3'
                                    type="text"
                                    placeholder='Enter your destination'
                                />
                            </form>
                            <button
                                onClick={findTrip}
                                className='bg-black text-white px-4 py-2 rounded-lg mt-3 w-full'
                            >
                                Find Trip
                            </button>
                        </div>
                        <div ref={panelRef} className='bg-white h-0'>
                            <LocationSearchPanel
                                suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions}
                                setPanelOpen={setPanelOpen}
                                setVehiclePanel={setVehiclePanel}
                                setPickup={setPickup}
                                setDestination={setDestination}
                                activeField={activeField}
                            />
                        </div>
                    </div>

                    <div ref={vehiclePanelRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
                        <VehiclePanel
                            selectVehicle={setVehicleType}
                            fare={fare}
                            setConfirmRidePanel={setConfirmRidePanel}
                            setVehiclePanel={setVehiclePanel}
                        />
                    </div>

                    <div ref={confirmRidePanelRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-6 pt-12'>
                        <ConfirmRide
                            createRide={createRide}
                            pickup={pickup}
                            destination={destination}
                            fare={fare}
                            vehicleType={vehicleType}
                            setConfirmRidePanel={setConfirmRidePanel}
                            setVehicleFound={setVehicleFound}
                        />
                    </div>

                    <div ref={vehicleFoundRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-6 pt-12'>
                        <LookingForDriver
                            createRide={createRide}
                            pickup={pickup}
                            destination={destination}
                            fare={fare}
                            vehicleType={vehicleType}
                            setVehicleFound={setVehicleFound}
                        />
                    </div>

                    <div ref={waitingForDriverRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-6 pt-12'>
                        <WaitingForDriver
                            ride={ride}
                            setVehicleFound={setVehicleFound}
                            setWaitingForDriver={setWaitingForDriver}
                            waitingForDriver={waitingForDriver}
                        />
                    </div>
                </>
            )}

            {/* Social Media View - Fix: pass proper props */}
            {currentView === 'social' && (
                <div className='h-screen bg-gray-50 pt-16'>
                    {/* Create Post Button */}
                    <div className='fixed top-16 right-4 z-40'>
                        <button
                            onClick={() => setShowCreatePost(true)}
                            className='bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors'
                        >
                            <i className="ri-add-line text-xl"></i>
                        </button>
                    </div>

                    {/* Social Media Feed - Fix: pass all required props */}
                    <div className='h-full overflow-y-auto pb-20'>
                        <SocialMediaFeed
                            posts={posts}
                            setPosts={setPosts}
                            user={user}
                            followedCaptains={followedCaptains}
                            setFollowedCaptains={setFollowedCaptains}
                            isCaptain={false}
                        />
                    </div>

                    {/* Create Post Modal */}
                    {showCreatePost && (
                        <CreatePost
                            onClose={() => setShowCreatePost(false)}
                            onSubmit={handleCreatePost}
                            user={user}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default Home

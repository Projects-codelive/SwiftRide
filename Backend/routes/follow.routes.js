const express = require('express');
const router = express.Router();
const followController = require('../controllers/follow.controller');
const { authUniversal } = require('../middlewares/auth.middleware');

// Routes
router.post('/captain/:captainId', authUniversal, followController.followCaptain);
router.get('/followers/:captainId', authUniversal, followController.getFollowers);
router.get('/following', authUniversal, followController.getFollowing);
router.get('/status/:captainId', authUniversal, followController.getFollowStatus);

module.exports = router;

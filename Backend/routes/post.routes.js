const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const postController = require('../controllers/post.controller');
const { authUniversal } = require('../middlewares/auth.middleware');
const { uploadPostImages } = require('../config/cloudinary');

// Validation middleware
const postValidation = [
    body('content').isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters')
];

// Routes
router.get('/feed', authUniversal, postController.getFeedPosts);
router.get('/:postId', authUniversal, postController.getPostById);
router.post('/', 
    authUniversal, 
    uploadPostImages.array('images', 5), 
    postValidation, 
    postController.createPost
);
router.post('/:postId/like', authUniversal, postController.likePost);
router.post('/:postId/dislike', authUniversal, postController.dislikePost);
router.delete('/:postId', authUniversal, postController.deletePost);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const commentController = require('../controllers/comment.controller');
const { authUniversal } = require('../middlewares/auth.middleware');

// Validation middleware
const commentValidation = [
    body('content').isLength({ min: 1, max: 500 }).withMessage('Content must be between 1 and 500 characters')
];

// Routes
router.get('/:postId/comments', authUniversal, commentController.getCommentsByPost);
router.post('/:postId/comments', 
    authUniversal, 
    commentValidation, 
    commentController.createComment
);
router.post('/comments/:commentId/like', authUniversal, commentController.likeComment);
router.delete('/comments/:commentId', authUniversal, commentController.deleteComment);

module.exports = router;

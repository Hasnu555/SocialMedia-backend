const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/authmiddleware');
const postController = require('../controller/postController');
const commentController = require('../controller/commentController');
const multer = require('multer');

const router = Router();


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save to uploads folder
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Append the date and the original file extension
    }
});

// Increase the file size limit (default is 1MB)
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Increase to 10MB or adjust as needed
});


// Routes for creating, retrieving, updating, and deleting posts
router.get('/social',requireAuth, postController.showPosts);
router.post('/social', upload.single('image'), requireAuth,postController.createPost);
router.put('/social/:id',requireAuth, postController.updatePost);//user id
router.delete('/social/:id',requireAuth, postController.deletePost);//user id


router.get('/friend-posts/:friendId',requireAuth, postController.getFriendPosts);




// Routes for comments
router.post('/social/:postId/comments', requireAuth, commentController.createComment);
router.get('/social/:postId/comments', requireAuth, commentController.getCommentsByPostId);
router.put('/social/comments/:commentId', requireAuth, commentController.editComment);
router.delete('/social/comments/:commentId', requireAuth, commentController.deleteComment);


// Routes for likes
router.post('/social/:postId/like', requireAuth, postController.likePost);
router.delete('/social/:postId/like', requireAuth, postController.unlikePost);


module.exports = router;

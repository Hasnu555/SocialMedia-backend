const multer = require('multer');

// import cloudinary from "cloudinary";
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const fs = require('fs');
const path = require('path');
// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Define the destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Define the filename for uploaded files
    },
});

// Increase the file size limit (default is 1MB)
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Increase to 10MB or adjust as needed
});



module.exports.createPost = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, 'hasan secret');

        const { content } = req.body;
        const imageUrl = req.file ? req.file.path : '';  // Path where the image is stored

        // Create a new post
        const newPost = await Post.create({
            content,
            author: decodedToken.id,
            imageUrl  // Save image path to the database
        });

        // Add the ID of the newly created post to the user's posts array using findByIdAndUpdate
        await User.findByIdAndUpdate(decodedToken.id, { $push: { posts: newPost._id } });

        console.log("Post created ", newPost);
        
        res.status(201).json({ message: 'Post created successfully', post: newPost });
    } catch (error) {
        console.error(error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};



module.exports.getFriendPosts = async (req, res) => {
    try {
        const { friendId } = req.params; // Extract friendId from request parameters
        console.log(friendId);
        // Verify authorization token
        const token = req.headers.authorization.split(' ')[1];

        
        jwt.verify(token, 'hasan secret', async (err, decodedToken) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Find the friend by their ID and populate their posts
            const friend = await User.findById(friendId).populate('posts');

            // Check if the friend exists
            if (!friend) {
                return res.status(404).json({ message: "Friend not found" });
            }

            // Extract IDs of the friend's posts
            const friendPostIds = friend.posts.map(post => post._id);

            // Retrieve posts of the friend
            const posts = await Post.find({ _id: { $in: friendPostIds } })
                .populate('author')
                .populate({
                    path: 'comments',
                    populate: {
                        path: 'author',
                        select: '_id name imageUrl' // Select only necessary fields
                    }
                });

            // Function to read image as base64
            const getImageBase64 = async (imagePath) => {
                try {
                    if (!imagePath || !fs.existsSync(imagePath)) {
                        throw new Error(`Image file not found: ${imagePath}`);
                    }
            
                    const imageAsBase64 = fs.readFileSync(path.resolve(imagePath), 'base64');
                    return `data:image/jpeg;base64,${imageAsBase64}`;
                } catch (error) {
                    console.error('Error reading image file:', error);
                    // You can handle the error here, e.g., log a warning message or return a placeholder image
                    return null;
                }
            };
            
            

            // Map over posts and comments to add image base64
            const postsWithImages = await Promise.all(posts.map(async post => {
                const postImageBase64 = await getImageBase64(post.imageUrl);
                const authorImageBase64 = await getImageBase64(post.author.imageUrl);

                const commentsWithImages = await Promise.all(post.comments.map(async comment => {
                    const commentAuthorImageBase64 = await getImageBase64(comment.author.imageUrl);
                    return {
                        ...comment._doc,
                        author: {
                            ...comment.author._doc,
                            imageUrl: commentAuthorImageBase64
                        }
                    };
                }));

                return {
                    ...post._doc,
                    imageBase64: postImageBase64,
                    author: {
                        ...post.author._doc,
                        imageUrl: authorImageBase64
                    },
                    comments: commentsWithImages
                };
            }));

            // Respond with the friend's posts
            res.status(200).json({ posts: postsWithImages });
        });
    } catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


module.exports.showPosts = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, 'hasan secret', async (err, decodedToken) => {
            if (err) {
                res.status(401).json({ message: 'Unauthorized' });
            } else {
                const user = await User.findById(decodedToken.id).populate('friends');
                
                // Extract IDs of the user's friends
                const friendIds = user.friends.map(friend => friend._id);

                const posts = await Post.find({ author: { $in: friendIds } })
                    .populate('author')
                    .populate({
                        path: 'comments',
                        populate: {
                            path: 'author',
                            select: '_id name imageUrl' // Select only necessary fields
                        }
                    });

                // Function to read image as base64
                const getImageBase64 = async (imagePath) => {
                    try {
                        // Check if the file exists at the specified path
                        if (!imagePath || !fs.existsSync(imagePath)) {
                            throw new Error(`Image file not found: ${imagePath}`);
                        }
                
                        // Read the image file and convert it to base64
                        const imageAsBase64 = fs.readFileSync(path.resolve(imagePath), 'base64');
                        return `data:image/jpeg;base64,${imageAsBase64}`;
                    } catch (error) {
                        // Log the error for debugging
                        console.error('Error reading image file:', error);
                        // You can handle the error here, e.g., log a warning message or return a placeholder image
                        return null;
                    }
                };
                
                

                // Map over posts and comments to add image base64
                const postsWithImages = await Promise.all(posts.map(async post => {
                    const postImageBase64 = await getImageBase64(post.imageUrl);
                    const authorImageBase64 = await getImageBase64(post.author.imageUrl);

                    const commentsWithImages = await Promise.all(post.comments.map(async comment => {
                        const commentAuthorImageBase64 = await getImageBase64(comment.author.imageUrl);
                        return {
                            ...comment._doc,
                            author: {
                                ...comment.author._doc,
                                imageUrl: commentAuthorImageBase64
                            }
                        };
                    }));

                    return {
                        ...post._doc,
                        imageBase64: postImageBase64,
                        author: {
                            ...post.author._doc,
                            imageUrl: authorImageBase64
                        },
                        comments: commentsWithImages
                    };
                }));

                res.status(200).json(postsWithImages);
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports.updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { content } = req.body;
        
        const post = await Post.findById(postId);
        
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to update this post" });
        }
        
        const updatedPost = await Post.findByIdAndUpdate(postId, { content }, { new: true });
        
        res.status(200).json({ message: "Post updated successfully", post: updatedPost });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports.deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        
        const post = await Post.findById(postId);
        
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to delete this post" });
        }
        
        await Post.findByIdAndDelete(postId);
        
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports.likePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user.id; 

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.likes.includes(userId)) {
            return res.status(400).json({ message: "You have already liked this post" });
        }

        post.likes.push(userId);

        await post.save();

        res.status(200).json({ message: "Post liked successfully", post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports.unlikePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user.id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (!post.likes.includes(userId)) {
            return res.status(400).json({ message: "You have not liked this post" });
        }

        // Remove the user's id from the likes array
        post.likes = post.likes.filter(id => id.toString() !== userId);

        await post.save();

        res.status(200).json({ message: "Post unliked successfully", post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



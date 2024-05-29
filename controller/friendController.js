const fs = require('fs');
const path = require('path');



const User = require('../models/User');



const friendController = {

    searchUsers : async (req, res) => {
        try {
            const { query } = req.query;
            const users = await User.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } }, // Search by name (case-insensitive)
                    { email: { $regex: query, $options: 'i' } } // Search by email (case-insensitive)
                ]
            }).select('name email imageUrl'); // Select only necessary fields
            
            const getImageBase64 = async (imagePath) => {
                const imageAsBase64 = fs.readFileSync(path.resolve(imagePath), 'base64');
                return `data:image/jpeg;base64,${imageAsBase64}`;
            };

            // Convert image URLs to base64
            const usersWithBase64Images = await Promise.all(users.map(async user => {
                const imageAsBase64 = await getImageBase64(user.imageUrl);
                return {
                    ...user.toObject(),
                    imageUrl: imageAsBase64
                };
            }));
    
            res.json(usersWithBase64Images);
        } catch (error) {
            console.error('Error searching users:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    sendFriendRequest: async (req, res) => {
        const senderId = req.user.id;
        const recipientId = req.params.id;

        try {
            const recipient = await User.findById(recipientId);
            if (!recipient) {
                return res.status(404).json({ error: 'Recipient user not found' });
            }

            const sender = await User.findById(senderId);
            if (sender.friends.includes(recipientId) || sender.pendingFriendRequests.includes(recipientId)) {
                return res.status(400).json({ error: 'Friend request already sent or recipient is already a friend' });
            }

            await User.findByIdAndUpdate(recipientId, { $push: { pendingFriendRequests: senderId } });

            res.status(200).json({ message: 'Friend request sent successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    acceptFriendRequest: async (req, res) => {
        const userId = req.user.id;
        const friendId = req.params.id;

        try {
            
            const user = await User.findById(userId);
            
            const friend = await User.findById(friendId);

            if (!user.pendingFriendRequests.includes(friendId)) {
                return res.status(400).json({ error: 'Friend request does not exist' });
            }

            
            await User.findByIdAndUpdate(userId, { $push: { friends: friendId } });
            
            await User.findByIdAndUpdate(userId, { $pull: { pendingFriendRequests: friendId } });

            await User.findByIdAndUpdate(friendId, { $push: { friends: userId } });

            res.status(200).json({ message: 'Friend request accepted successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    },


    rejectFriendRequest: async (req, res) => {
        const userId = req.user.id;
        const friendId = req.params.id;

        try {
            const user = await User.findById(userId);

            user.pendingFriendRequests = user.pendingFriendRequests.filter(request => request.toString() !== friendId);
            await user.save();

            res.status(200).json({ message: 'Friend request rejected successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getFriendRequests: async (req, res) => {
        const userId = req.user.id;
    
        try {
            const user = await User.findById(userId).populate('pendingFriendRequests', 'name email imageUrl');
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
    
            // Function to convert image to base64
            const getImageBase64 = async (imagePath) => {
                const imageAsBase64 = fs.readFileSync(path.resolve(imagePath), 'base64');
                return `data:image/jpeg;base64,${imageAsBase64}`;
            };
    
            // Map over pending friend requests and convert images to base64
            const friendRequests = await Promise.all(user.pendingFriendRequests.map(async friend => {
                const friendImageBase64 = await getImageBase64(friend.imageUrl);
                return {
                    ...friend.toObject(),
                    imageUrl: friendImageBase64
                };
            }));
    
            res.status(200).json({ friendRequests });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    
    
    getSuggestedFriends: async (req, res) => {
        const userId = req.user.id;
    
        try {
            // Find the current user
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
    
            // Find users who are not friends with the current user
            const suggestedFriends = await User.find({
                _id: { $ne: userId }, // Exclude the current user
                friends: { $ne: userId }, // Users who are not friends with the current user
                pendingFriendRequests: { $ne: userId } // Exclude users with pending friend requests
            }).select('name email imageUrl'); // Select name, email, and imageUrl fields
    
            // Function to read image file as base64
            const getImageBase64 = async (imagePath) => {
                const imageAsBase64 = fs.readFileSync(path.resolve(imagePath), 'base64');
                return `data:image/jpeg;base64,${imageAsBase64}`;
            };
    
            // Map over suggestedFriends and add imageBase64 field
            const suggestedFriendsWithImages = await Promise.all(suggestedFriends.map(async (friend) => {
                const imageBase64 = await getImageBase64(friend.imageUrl);
                return {
                    ...friend._doc,
                    imageBase64
                };
            }));
    
            res.status(200).json({ suggestedFriends: suggestedFriendsWithImages });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    unfriend: async (req, res) => {
        const userId = req.user.id;
        const friendId = req.params.id;

        try {
            const user = await User.findById(userId);
            const friend = await User.findById(friendId);

            if (!user.friends.includes(friendId)) {
                return res.status(400).json({ error: 'You are not friends with this user' });
            }

            user.friends = user.friends.filter(f => f.toString() !== friendId);
            await user.save();

            friend.friends = friend.friends.filter(f => f.toString() !== userId);
            await friend.save();

            res.status(200).json({ message: 'Successfully unfriended' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = friendController;

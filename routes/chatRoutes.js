const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { requireAuth } = require('../middleware/authmiddleware');

// Fetch chat messages between two users
router.get('/chats/:userId', requireAuth, async (req, res) => {
    try {
        console.log(req.user.id);
        console.log(req.params.userId)
        const chats = await Chat.find({
            $or: [
                { sender: req.user.id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user.id }
            ]
        }).sort('createdAt');
        console.log(chats);
        res.json(chats);
    } catch (err) {
        res.status(400).send(err);
    }
});

router.post('/chats', requireAuth, async (req, res) => {
    const { receiver, message } = req.body;
    console.log(req.body);
    if (!receiver || !message) {
        return res.status(400).json({ error: 'Receiver and message fields are required.' });
    }

    try {
        const newChat = new Chat({
            sender: req.body.sender,
            receiver,
            message
        });

        await newChat.save();

        res.status(201).json(newChat);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;

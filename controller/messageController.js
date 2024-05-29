const Message = require('../models/Message');

// Controller to handle fetching all messages
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Controller to handle creating a new message
exports.createMessage = async (req, res) => {
  const { content, sender } = req.body;
  
  try {
    const message = new Message({ content, sender });
    const newMessage = await message.save();
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

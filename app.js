const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken'); // Ensure jwt is imported
const { checkUser } = require('./middleware/authmiddleware');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const profileRoutes = require('./routes/profileRoutes');
const friendRoutes = require('./routes/friendRoutes');
const groupRoutes = require('./routes/groupRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const Chat = require('./models/Chat'); // Ensure Chat model is imported

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));


const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware to verify token and attach user info to the socket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    jwt.verify(token, 'hasan secret', (err, user) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = user;
      next();
    });
  } else {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.user);

  // Join user-specific room
  socket.join(socket.user._id);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  socket.on('sendMessage', async (data) => {
    const { receiver, message } = data;
    const chat = new Chat({
      sender: socket.user._id, // Use the authenticated user ID
      receiver,
      message,
    });
    await chat.save();

    // Emit message to the specific room of the receiver
    io.to(receiver).emit('receiveMessage', chat);
  });
});


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());

// View engine
app.set('view engine', 'ejs');

// Database connection
const dbURI = 'mongodb+srv://hasanjawaid:091200@hasan.mg8eu13.mongodb.net/node-authnode?retryWrites=true';

app.use(cors());
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
  .then(() => {
    http.listen(5000, () => { // Change app.listen to http.listen
      console.log('Server is listening on port 5000');
    });
  })
  .catch((err) => console.log(err));

// Routes
app.get('*', checkUser);
app.get('/', (req, res) => res.render('home'));

// Mount routes
app.use('/users', userRoutes);
app.use(postRoutes);
app.use(authRoutes);
app.use(profileRoutes);
app.use(friendRoutes);
app.use(groupRoutes);
app.use(chatRoutes);

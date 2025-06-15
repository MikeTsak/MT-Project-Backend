const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const dotenv = require('dotenv');
dotenv.config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const testRoutes = require('./routes/test');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔐 CORS setup
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://mt.miketsak.gr'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 Απαγορευμένο origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 📦 Middleware
app.use(express.json());

// 💥 Setup webpush with VAPID keys
webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 🔑 Serve public VAPID key to frontend
app.get('/vapid-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// 🛣️ Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/user', userRoutes);
app.use('/', testRoutes); 

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

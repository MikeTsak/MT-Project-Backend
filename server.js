const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const testRoutes = require('./routes/test');
require('dotenv').config();

const app = express();
const PORT = 5000;

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

// 🛣️ Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/user', userRoutes);
app.use('/', testRoutes); // 👈 Αυτή είναι η αρχική σελίδα με το status

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

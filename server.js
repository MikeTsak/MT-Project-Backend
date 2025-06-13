const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const testRoute = require('./routes/test');
const projectRoutes = require('./routes/projects');
require('dotenv').config();

const app = express();
const PORT = 5000;

// 🔐 CORS setup για συγκεκριμένα origins
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

// 📦 Middleware για JSON parsing
app.use(express.json());

// 🛣️ Routes
app.use('/auth', authRoutes);
app.use('/', testRoute);
app.use('/projects', projectRoutes); // ✅ Put this before listen just for clean structure

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

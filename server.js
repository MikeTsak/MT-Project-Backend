const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const testRoute = require('./routes/test');
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
  methods: ['GET', 'POST'],
  credentials: true
}));

// 📦 Middleware για JSON parsing
app.use(express.json());

// 🛣️ Routes
app.use('/auth', authRoutes);
app.use('/', testRoute); 

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

const projectRoutes = require('./routes/projects');
app.use('/projects', projectRoutes);

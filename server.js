const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const PORT = 5000;

// 🔧 CORS setup
app.use(cors({
  origin: 'http://localhost:3000', // 👈 your frontend origin
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

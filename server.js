const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const testRoute = require('./routes/test');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors({ origin: 'http://localhost:3001', methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/', testRoute); 

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

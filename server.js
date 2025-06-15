const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const dotenv = require('dotenv');
dotenv.config();

const db = require('./db');
const mailer = require('./utils/mailer');

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

// 🚀 Start server and send mail to user 1
app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);

  try {
    db.query('SELECT email, username FROM users WHERE id = 1', async (err, results) => {
      if (err || results.length === 0) {
        return console.error('❌ Failed to fetch user 1 for startup email.');
      }

      const { email, username } = results[0];
      const projectName = '⚙️SERVER STARTUP⚙️';
      const projectId = 'welcome-tasky'; // or an actual project ID if you prefer

      await mailer.sendProjectAssignedEmail(email, username, projectName, projectId);
      console.log(`📧 Startup email sent to ${username} (${email})`);
    });
  } catch (e) {
    console.error('🔥 Failed to send startup email:', e.message);
  }
});


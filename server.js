// 🌐 Core Modules & Config
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const webpush = require('web-push');
const cron = require('node-cron');
dotenv.config();

// 🛠️ Internal Modules
const db = require('./db');
const mailer = require('./utils/mailer');
const { sendDailyReminders } = require('./dailyReminder');

// 🛣️ Route Handlers
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const testRoutes = require('./routes/test');

// 🚀 Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// 🔐 CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://mt.miketsak.gr'
];

app.use(cors({
  origin(origin, callback) {
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

// 💥 Web Push Keys
webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 📤 Serve Public VAPID Key
app.get('/vapid-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// 🧭 Register Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/user', userRoutes);
app.use('/', testRoutes);

// 🚀 Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);

  // 📧 Send startup email to User 1
  try {
    db.query('SELECT email, username FROM users WHERE id = 1', async (err, results) => {
      if (err || results.length === 0) {
        return console.error('❌ Failed to fetch user 1 for startup email.');
      }

      const { email, username } = results[0];
      const origin = process.env.NODE_ENV === 'production' ? 'mtback.miketsak.gr' : 'localhost';
      await mailer.sendStartupEmail(email, username, origin);
      console.log(`📧 Startup email sent to ${username} (${email})`);
    });
  } catch (e) {
    console.error('🔥 Failed to send startup email:', e.message);
  }

  // 🗓️ Schedule Daily Reminder Task – Weekdays at 10:00 Europe/Athens
  cron.schedule('0 10 * * 1-5', async () => {
    console.log('⏰ Running scheduled dailyReminder.js...');
    await sendDailyReminders();
  }, {
    timezone: 'Europe/Athens'
  });
});

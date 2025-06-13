const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const verifyToken = require('../middleware/auth');


// 🔐 REGISTER ROUTE
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  console.log(`🔸 Received register request:`, req.body);

  if (!username || !password) {
    console.warn(`⚠️ Missing username or password`);
    return res.status(400).json({ error: 'Username and password required.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashed],
      (err, result) => {
        if (err) {
          console.error('❌ MySQL Error during registration:', err);
          return res.status(400).json({
            error: 'User already exists or DB error.',
            details: err.code,
          });
        }
        console.log(`✅ User registered: ${username} (id: ${result.insertId})`);
        res.json({ success: true, message: 'Registered successfully!' });
      }
    );
  } catch (e) {
    console.error('🔥 Server error during registration:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔑 LOGIN ROUTE
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log(`🔸 Received login request:`, req.body);

  if (!username || !password) {
    console.warn(`⚠️ Missing username or password`);
    return res.status(400).json({ error: 'Username and password required.' });
  }

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) {
        console.error('❌ MySQL Error during login:', err);
        return res.status(500).json({ error: 'DB error during login.' });
      }

      if (results.length === 0) {
        console.warn(`🔐 Login failed: user "${username}" not found`);
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const user = results[0];
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        console.warn(`🔐 Login failed: invalid password for "${username}"`);
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      console.log(`✅ Login successful for user: ${username}`);
      res.json({ success: true, token });
    }
  );
});

// 👥 GET all usernames (προστατευμένο, ώστε να δουλεύει το JWT)
router.get('/users', verifyToken, (req, res) => {
  console.log('🔸 Received request to get all usernames');

  db.query('SELECT username FROM users', (err, results) => {
    if (err) {
      console.error('❌ Error fetching users:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const usernames = results.map(r => r.username);
    console.log(`✅ Found ${usernames.length} user(s):`, usernames);
    res.json({ success: true, users: usernames });
  });
});


module.exports = router;

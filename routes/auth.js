const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const verifyToken = require('../middleware/auth');




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

// 🙋‍♂️ GET current user info from token
router.get('/me', verifyToken, (req, res) => {
  if (!req.user || !req.user.username) {
    return res.status(400).json({ error: 'Invalid token or user data missing.' });
  }

  console.log(`🔸 /me request for user: ${req.user.username}`);
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username
    }
  });
});


// 🧾 GET /profile — Full user info
router.get('/profile', verifyToken, (req, res) => {
  const userId = req.user.id;
  console.log(`📥 Profile request for user ID: ${userId}`);

  db.query('SELECT id, username, email, permission_level FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('❌ DB error fetching profile:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      console.warn('⚠️ No user found for profile');
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('✅ Profile fetched successfully');
    res.json({ success: true, profile: results[0] });
  });
});

// 🔧 PUT /update-profile — Edit username/email/permission
router.put('/update-profile', verifyToken, (req, res) => {
  const userId = req.user.id;
  const { username, email, permission_level } = req.body;

  const updates = [];
  const values = [];

  if (username) {
    updates.push('username = ?');
    values.push(username);
  }
  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (permission_level) {
    updates.push('permission_level = ?');
    values.push(permission_level);
  }

  if (updates.length === 0) {
    console.warn('⚠️ No profile fields provided to update');
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  values.push(userId);
  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

  db.query(sql, values, (err) => {
    if (err) {
      console.error('❌ Error updating profile:', err);
      return res.status(500).json({ error: 'Update failed' });
    }
    console.log('📝 Profile updated:', req.body);
    res.json({ success: true, message: 'Profile updated' });
  });
});

// 🔐 PUT /change-password — Change password
router.put('/change-password', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { newPassword } = req.body;

  if (!newPassword) {
    console.warn('⚠️ No new password provided');
    return res.status(400).json({ error: 'New password required' });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId], (err) => {
      if (err) {
        console.error('❌ Error changing password:', err);
        return res.status(500).json({ error: 'Password update failed' });
      }
      console.log(`🔐 Password updated for user ID: ${userId}`);
      res.json({ success: true, message: 'Password changed' });
    });
  } catch (e) {
    console.error('🔥 Hashing error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// 👑 GET /is-admin — Check admin status
router.get('/is-admin', verifyToken, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT permission_level FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('❌ Error checking permission level:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const isAdmin = results[0]?.permission_level === 'admin';
    console.log(`🕵️‍♂️ User ${userId} is admin: ${isAdmin}`);
    res.json({ success: true, isAdmin });
  });
});

//--------------------------------- DEAD CODE ---------------------------------
// ⚠️ Raw update: No auth or permission checks!
      // router.put('/raw-update', async (req, res) => {
      //   const { id, username, email, password, permission_level } = req.body;

      //   if (!id) {
      //     return res.status(400).json({ error: 'User ID is required.' });
      //   }

      //   const updates = [];
      //   const values = [];

      //   if (username) {
      //     updates.push('username = ?');
      //     values.push(username);
      //   }

      //   if (email) {
      //     updates.push('email = ?');
      //     values.push(email);
      //   }

      //   if (password) {
      //     const hashed = await bcrypt.hash(password, 10);
      //     updates.push('password = ?');
      //     values.push(hashed);
      //   }

      //   if (permission_level) {
      //     updates.push('permission_level = ?');
      //     values.push(permission_level);
      //   }

      //   if (updates.length === 0) {
      //     return res.status(400).json({ error: 'No fields provided to update.' });
      //   }

      //   values.push(id);
      //   const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

      //   db.query(sql, values, (err, result) => {
      //     if (err) {
      //       console.error('❌ Update error:', err);
      //       return res.status(500).json({ error: 'Database update failed.' });
      //     }
      //     res.json({ success: true, message: 'User updated successfully.' });
      //   });
      // });


// 🔐 REGISTER ROUTE
      // router.post('/register', async (req, res) => {
      //   const { username, password, email, permission_level } = req.body;

      //   console.log(`🔸 Received register request:`, req.body);

      //   if (!username || !password || !email) {
      //     console.warn(`⚠️ Missing required fields`);
      //     return res.status(400).json({ error: 'Username, password, and email are required.' });
      //   }

      //   try {
      //     const hashed = await bcrypt.hash(password, 10);
      //     const finalPermission = permission_level || 'user';

      //     db.query(
      //       'INSERT INTO users (username, password, email, permission_level) VALUES (?, ?, ?, ?)',
      //       [username, hashed, email, finalPermission],
      //       (err, result) => {
      //         if (err) {
      //           console.error('❌ MySQL Error during registration:', err);
      //           return res.status(400).json({
      //             error: 'User already exists or DB error.',
      //             details: err.code,
      //           });
      //         }

      //         console.log(`✅ User registered: ${username} (id: ${result.insertId})`);
      //         res.json({ success: true, message: 'Registered successfully!' });
      //       }
      //     );
      //   } catch (e) {
      //     console.error('🔥 Server error during registration:', e);
      //     res.status(500).json({ error: 'Server error' });
      //   }
      // });



module.exports = router;

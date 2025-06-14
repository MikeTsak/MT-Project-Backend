const express = require('express');
const db = require('../db');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// 🧍‍♂️ Get projects assigned to the logged-in user
router.get('/me/projects', verifyToken, (req, res) => {
  const userId = req.user.id;

  console.log(`🔎 Fetching projects for logged-in user ID: ${userId}`);

  const query = `
    SELECT 
      p.project_id,
      p.name,
      p.description,
      p.deadline,
      p.created_at
    FROM project_assignments pa
    JOIN projects p ON pa.project_id = p.project_id
    WHERE pa.user_id = ?
    ORDER BY p.deadline ASC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching assigned projects:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true, projects: results });
  });
});

// 🔍 Get projects assigned to a specific username
router.get('/users/:username/projects', verifyToken, (req, res) => {
  const { username } = req.params;

  console.log(`🔎 Fetching projects assigned to username: ${username}`);

  const query = `
    SELECT 
      p.project_id, 
      p.name, 
      p.description, 
      p.deadline, 
      p.created_at,
      u.username AS assigned_to
    FROM users u
    JOIN project_assignments pa ON u.id = pa.user_id
    JOIN projects p ON p.project_id = pa.project_id
    WHERE u.username = ?
    ORDER BY p.deadline ASC
  `;

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('❌ DB error while fetching user projects:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found or no projects assigned.' });
    }

    res.json({ success: true, projects: results });
  });
});

module.exports = router;

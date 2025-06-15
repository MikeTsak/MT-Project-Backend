const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.post('/subscribe', verifyToken, (req, res) => {
  const { project_id, endpoint, keys } = req.body;
  const user_id = req.user.id;

  if (!endpoint || !keys || !keys.p256dh || !keys.auth || !project_id) {
    return res.status(400).json({ error: 'Missing subscription data' });
  }

  const query = `
    INSERT INTO push_subscriptions (user_id, project_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)
  `;

  db.query(query, [user_id, project_id, endpoint, keys.p256dh, keys.auth], (err) => {
    if (err) {
      console.error('❌ DB Error saving subscription:', err);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    console.log(`📬 Saved push subscription for user ${user_id} on project ${project_id}`);
    res.json({ success: true });
  });
});

module.exports = router;

const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/test', (req, res) => {
  db.query('SELECT 1 + 1 AS result', (err, results) => {
    if (err) {
      console.error('❌ DB Test Failed:', err);
      return res.status(500).json({ success: false, error: 'DB connection failed', details: err.code });
    }

    console.log('✅ DB Test Success:', results[0]);
    res.json({ success: true, message: 'Database connection is working!', result: results[0] });
  });
});

module.exports = router;

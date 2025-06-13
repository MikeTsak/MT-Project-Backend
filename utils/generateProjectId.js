const db = require('../db');

async function generateProjectId() {
  return new Promise((resolve, reject) => {
    db.query('SELECT COUNT(*) AS count FROM projects', (err, results) => {
      if (err) return reject(err);

      const count = results[0].count + 1;
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = now.getFullYear();

      const projectId = `D${day}${month}${year}MT${String(count).padStart(4, '0')}`;
      resolve(projectId);
    });
  });
}

module.exports = generateProjectId;

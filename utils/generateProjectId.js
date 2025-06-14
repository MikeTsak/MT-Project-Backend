const db = require('../db');

async function generateProjectId() {
  return new Promise((resolve, reject) => {
    db.query('SELECT COUNT(*) AS count FROM projects', (err, results) => {
      if (err) return reject(err);

      const count = results[0].count + 1; // Next number
      const now = new Date();

      const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase(); // e.g. JUN
      const year = String(now.getFullYear()).slice(-2); // e.g. 25
      const number = String(count).padStart(3, '0'); // e.g. 123

      const projectId = `${month}${year}P${number}`; // e.g. JUN25P123
      resolve(projectId);
    });
  });
}

module.exports = generateProjectId;

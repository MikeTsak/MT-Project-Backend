// dailyReminder.js
const db = require('./db');
const { sendDailyReminderEmail } = require('./utils/mailer');
const dayjs = require('dayjs');

async function sendDailyReminders() {
  console.log('📬 Starting daily project reminder task...');

  try {
    db.query(
      `SELECT u.id, u.username, u.email, p.name AS project_name, p.project_id, p.deadline
       FROM users u
       JOIN project_assignments pa ON u.id = pa.user_id
       JOIN projects p ON pa.project_id = p.project_id
       ORDER BY u.id`,
      async (err, results) => {
        if (err) {
          return console.error('❌ Failed to fetch project assignments:', err);
        }

        const userMap = {};

        for (const row of results) {
          const { id, username, email, project_name, project_id, deadline } = row;
          if (!userMap[id]) {
            userMap[id] = { username, email, projects: [] };
          }

          const daysLeft = dayjs(deadline).diff(dayjs(), 'day');
          userMap[id].projects.push({
            name: project_name,
            id: project_id,
            daysLeft,
            deadline,
          });
        }

        for (const userId in userMap) {
          const { username, email, projects } = userMap[userId];
          if (projects.length > 0) {
            try {
              await sendDailyReminderEmail(email, username, projects);
              console.log(`📨 Reminder sent to ${username}`);
            } catch (e) {
              console.warn(`⚠️ Failed to send to ${username} (${email}):`, e.message);
            }
          }
        }

        console.log('✅ Daily project reminders complete.');
      }
    );
  } catch (err) {
    console.error('🔥 Unexpected error during reminder task:', err);
  }
}



module.exports = { sendDailyReminders };
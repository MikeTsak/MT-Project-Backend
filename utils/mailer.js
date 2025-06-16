const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email to notify a user they've been assigned to a project.
 *
 * @param {string} toEmail - The user's email address.
 * @param {string} username - The user's username.
 * @param {string} projectName - The name of the assigned project.
 * @param {string} projectId - The unique ID of the project.
 * @returns {Promise<void>} Promise resolving once the email is sent.
 */
exports.sendProjectAssignedEmail = async (toEmail, username, projectName, projectId) => {
  const projectUrl = `https://mt.miketsak.gr/projects/${projectId}`;

const htmlContent = `
<div style="font-family: 'Segoe UI', sans-serif; background-color: #f6f8fa; padding: 20px;">
  <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">
    <div style="background: #3b82f6; padding: 20px; color: #ffffff;">
      <h2 style="margin: 0;">📌 Νέο Έργο Ανατέθηκε</h2>
    </div>
    <div style="padding: 20px;">
      <p>👋 Γεια σου <strong>${username}</strong>,</p>
      <p>Μόλις σου ανατέθηκε ένα νέο έργο:</p>
      <p style="font-size: 1.2rem; color: #111827; font-weight: bold;">📁 ${projectName}</p>
      <p>Συνδέσου στον πίνακα ελέγχου σου για να δεις τις λεπτομέρειες, να συνομιλήσεις με την ομάδα και να ξεκινήσεις την παρακολούθηση της προόδου!</p>
      <a href="${projectUrl}" style="display: inline-block; margin-top: 20px; padding: 10px 16px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 4px;">Άνοιγμα Έργου</a>
      <p style="margin-top: 30px; font-size: 0.9rem; color: #6b7280;">Έλαβες αυτό το email επειδή είσαι μέλος του χώρου εργασίας MT Project Tracker.</p>
    </div>
    <div style="background: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 0.9rem;">
      🤖 Με εκτίμηση έργου,<br>
      <strong>Τασκούλης the ProjectBot</strong><br>
      MT Project Tracker
    </div>
  </div>
</div>`;


  return transporter.sendMail({
    from: `"Τασκούλης the ProjectBot 🤖" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `📁 Σου ανατέθηκε το έργο: ${projectName}`,
    text: `Γεια σου ${username}, μόλις σου ανατέθηκε το έργο "${projectName}". Δες το εδώ: ${projectUrl} — Τασκούλης the ProjectBot`,
    html: htmlContent,
  });
};

/**
 * Sends an email notifying that the server has started.
 *
 * @param {string} toEmail - Recipient email address.
 * @param {string} username - Recipient's username.
 * @param {string} environment - "localhost" or "mtback.miketsak.gr".
 * @returns {Promise<void>}
 */
exports.sendStartupEmail = async (toEmail, username, environment = 'localhost') => {
  const now = new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' });

  const htmlContent = `
  <div style="font-family: 'Segoe UI', sans-serif; background-color: #f0f4f8; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">
      <div style="background: #10b981; padding: 20px; color: #ffffff;">
        <h2 style="margin: 0;">🚀 Ο διακομιστής ξεκίνησε</h2>
      </div>
      <div style="padding: 20px;">
        <p>👋 Καλησπέρα <strong>${username}</strong>,</p>
        <p>Ο διακομιστής MT Project Tracker ξεκίνησε επιτυχώς στις <strong>${now}</strong>.</p>
        <p>📍 Περιβάλλον: <strong>${environment}</strong></p>
        <p style="margin-top: 30px; font-size: 0.9rem; color: #6b7280;">Αυτό είναι ένα αυτοματοποιημένο email για λόγους επιβεβαίωσης εκκίνησης.</p>
      </div>
      <div style="background: #ecfdf5; padding: 16px; text-align: center; color: #065f46; font-size: 0.9rem;">
        🤖 Με σεβασμό στην σταθερότητα,<br>
        <strong>Τασκούλης the ProjectBot</strong><br>
        MT Project Tracker
      </div>
    </div>
  </div>`;

  return transporter.sendMail({
    from: `"Τασκούλης the ProjectBot 🤖" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🚀 Ο διακομιστής ξεκίνησε (${environment})`,
    text: `Ο διακομιστής MT Project Tracker ξεκίνησε επιτυχώς στις ${now}. Περιβάλλον: ${environment}. — Τασκούλης the ProjectBot`,
    html: htmlContent,
  });
};

exports.sendDailyReminderEmail = async (toEmail, username, projects) => {
  const htmlTableRows = projects.map(p => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; font-weight: 500;">${p.name}</td>
      <td style="padding: 8px 12px;">${p.deadline}</td>
      <td style="padding: 8px 12px;">${p.daysLeft} μέρες</td>
      <td style="padding: 8px 12px;"><a href="https://mt.miketsak.gr/projects/${p.id}">🔗 Άνοιγμα</a></td>
    </tr>
  `).join('');

  const htmlContent = `
  <div style="font-family: 'Segoe UI', sans-serif; background-color: #f6f8fa; padding: 20px;">
    <div style="max-width: 700px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">
      <div style="background: #3b82f6; padding: 20px; color: #ffffff;">
        <h2 style="margin: 0;">🕘 Ημερήσια Υπενθύμιση Έργων</h2>
      </div>
      <div style="padding: 20px;">
        <p>Καλημέρα <strong>${username}</strong>,</p>
        <p>Ορίστε ο πίνακας με τα έργα που σου έχουν ανατεθεί και τον χρόνο που απομένει για το καθένα:</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.95rem;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px 12px; text-align: left;">📁 Έργο</th>
              <th style="padding: 10px 12px; text-align: left;">📅 Προθεσμία</th>
              <th style="padding: 10px 12px; text-align: left;">⏳ Υπόλοιπο</th>
              <th style="padding: 10px 12px; text-align: left;">🔗 Σύνδεσμος</th>
            </tr>
          </thead>
          <tbody>
            ${htmlTableRows}
          </tbody>
        </table>

        <p style="margin-top: 30px; font-size: 0.9rem; color: #6b7280;">Αυτό είναι ένα αυτοματοποιημένο email από το MT Project Tracker.</p>
      </div>
      <div style="background: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 0.9rem;">
        🤖 Με σεβασμό στην οργάνωση,<br>
        <strong>Τασκούλης the ProjectBot</strong><br>
        MT Project Tracker
      </div>
    </div>
  </div>`;

  return transporter.sendMail({
    from: `"Τασκούλης the ProjectBot 🤖" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🗓️ Υπενθύμιση Έργων – Καλημέρα ${username}!`,
    html: htmlContent,
  });
};

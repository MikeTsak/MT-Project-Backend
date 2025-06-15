const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 587,
  secure: false, // Use STARTTLS instead of SMTPS
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
    subject: `📁 You've been assigned to: ${projectName}`,
    text: `Hello ${username}, you’ve just been assigned to the project "${projectName}". View it here: ${projectUrl} — Tasky the ProjectBot`,
    html: htmlContent,
  });
};


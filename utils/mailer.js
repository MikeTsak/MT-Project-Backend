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
        <h2 style="margin: 0;">📌 New Project Assigned</h2>
      </div>
      <div style="padding: 20px;">
        <p>👋 Hello <strong>${username}</strong>,</p>
        <p>You’ve just been assigned to a new project:</p>
        <p style="font-size: 1.2rem; color: #111827; font-weight: bold;">📁 ${projectName}</p>
        <p>Log in to your dashboard to view details, chat with the team, and start tracking your progress!</p>
        <a href="${projectUrl}" style="display: inline-block; margin-top: 20px; padding: 10px 16px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 4px;">Open Project</a>
        <p style="margin-top: 30px; font-size: 0.9rem; color: #6b7280;">You received this email because you’re part of the MT Project Tracker workspace.</p>
      </div>
      <div style="background: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 0.9rem;">
        🤖 Yours projectfully,<br>
        <strong>Tasky the ProjectBot</strong><br>
        MT Project Tracker
      </div>
    </div>
  </div>`;

  return transporter.sendMail({
    from: `"Tasky the ProjectBot 🤖" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `📁 You've been assigned to: ${projectName}`,
    text: `Hello ${username}, you’ve just been assigned to the project "${projectName}". View it here: ${projectUrl} — Tasky the ProjectBot`,
    html: htmlContent,
  });
};


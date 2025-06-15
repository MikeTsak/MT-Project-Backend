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

exports.sendProjectAssignedEmail = async (toEmail, projectName) => {
  return transporter.sendMail({
    from: `"Project Tracker" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `You've been assigned to project: ${projectName}`,
    text: `Hello! You've been added to a new project called "${projectName}". Log in to see the details.`,
  });
};

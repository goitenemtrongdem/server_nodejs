const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendVerifyEmail = async (email, link) => {
  await transporter.sendMail({
    from: `"My App" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Verify your email",
    html: `
      <h3>Verify your account</h3>
      <p>Click the link below to verify your email:</p>
      <a href="${link}">${link}</a>
      <p>This link will expire in 5 minutes.</p>
    `,
  });
};

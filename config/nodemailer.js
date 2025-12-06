import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
   tls: {
    rejectUnauthorized: false, // 👈 ignore self-signed cert
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Nodemailer connection failed:", error);
  } else {
    console.log("✅ Nodemailer is ready to send emails");
  }
});

export default transporter;

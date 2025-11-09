// server.js
// Node 18+ recommended
import express from 'express';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // serve index.html and files/

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
});
app.use('/api/', limiter);

const OTP_STORE = new Map(); // email -> { otp, expiresAt, used }

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,      // your email e.g. Cheronod769@gmail.com
    pass: process.env.SMTP_PASSWORD,  // app password (DO NOT git commit)
  }
});

// Utility
function generateOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }
function now() { return Date.now(); }

app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Missing email' });
    // generate
    const otp = generateOtp();
    const expiresAt = now() + 60 * 1000; // 60s expiry
    OTP_STORE.set(email, { otp, expiresAt, used: false });

    // send email
    const mail = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'PredictPro — Your OTP code (valid 60s)',
      text: `Your 6-digit OTP is ${otp}. It expires in 60 seconds. Do not share it.`,
    };
    await transporter.sendMail(mail);
    console.log(`Sent OTP to ${email} at ${new Date().toISOString()}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('send-otp error', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Missing email or otp' });

    const record = OTP_STORE.get(email);
    if (!record) return res.status(400).json({ message: 'No OTP requested for this email' });
    if (record.used) return res.status(400).json({ message: 'OTP already used' });
    if (now() > record.expiresAt) return res.status(400).json({ message: 'OTP expired' });
    if (record.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP' });

    // Mark used and return success
    record.used = true;
    console.log(`OTP verified for ${email} at ${new Date().toISOString()}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('verify-otp error', err);
    return res.status(500).json({ message: 'Verification failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));

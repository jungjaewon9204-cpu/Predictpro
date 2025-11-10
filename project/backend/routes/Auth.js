const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const { sendOTPEmail } = require('../config/email');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Referral = require('../models/Referral');
require('dotenv').config();

// @route   POST /api/auth/request-otp
// @desc    Request OTP for login/signup
// @access  Public
router.post('/request-otp', async (req, res) => {
  const { email, refCode } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Please enter your email' });
  }

  try {
    let user = await User.findOne({ email });

    // Check if user is currently banned
    if (user && user.role === 'Banned' && dayjs().isBefore(user.banExpires)) {
      const timeLeft = dayjs(user.banExpires).diff(dayjs(), 'minute');
      return res.status(403).json({
        msg: `Account suspended. ${user.banReason}. Try again in ${timeLeft + 1} minutes.`,
        banned: true,
        banExpires: user.banExpires
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = dayjs().add(5, 'minute').toDate();

    let context = 'login';
    if (!user) {
      // New user signup
      context = 'signup';
      let referredBy = null;

      // Check for referral
      if (refCode) {
        const referrer = await User.findOne({ referralCode: refCode });
        if (referrer) {
          referredBy = referrer._id;
        }
      }

      user = new User({
        email,
        otp,
        otpExpires,
        otpAttempts: 0,
        referredBy: referredBy,
      });

    } else {
      // Existing user
      user.otp = otp;
      user.otpExpires = otpExpires;
      user.otpAttempts = 0; // Reset attempts on new request
      // Ensure ban is lifted if expiry has passed
      if (user.role === 'Banned' && dayjs().isAfter(user.banExpires)) {
        user.role = 'User';
        user.banReason = null;
        user.banExpires = null;
      }
    }

    await user.save();

    // Create referral record if it's a new user with a valid referrer
    if (context === 'signup' && user.referredBy) {
      await Referral.create({
        referrer: user.referredBy,
        referred: user._id,
        status: 'Pending'
      });
    }

    // Send email
    await sendOTPEmail(email, otp, context);

    res.status(200).json({ msg: `OTP sent to ${email}. It will expire in 5 minutes.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and return JWT
// @access  Public
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ msg: 'Please provide email and OTP' });
  }

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check ban status again
    if (user.role === 'Banned' && dayjs().isBefore(user.banExpires)) {
       const timeLeft = dayjs(user.banExpires).diff(dayjs(), 'minute');
      return res.status(403).json({
        msg: `Account suspended. ${user.banReason}. Try again in ${timeLeft + 1} minutes.`,
        banned: true,
        banExpires: user.banExpires
      });
    }

    // Check OTP expiry
    if (dayjs().isAfter(user.otpExpires)) {
      return res.status(400).json({ msg: 'OTP has expired. Please request a new one.' });
    }

    // Check OTP value
    if (user.otp !== otp) {
      user.otpAttempts += 1;

      // Check for 3 failed attempts
      if (user.otpAttempts >= 3) {
        user.role = 'Banned';
        user.banReason = 'Too many failed OTP attempts.';
        user.banExpires = dayjs().add(5, 'hour').toDate();
        user.otp = null; // Clear OTP
        user.otpExpires = null;
        user.otpAttempts = 0;
        await user.save();

        return res.status(403).json({
          msg: 'Account suspended for 5 hours due to too many failed attempts.',
          banned: true,
          banExpires: user.banExpires
        });
      }

      await user.save();
      return res.status(400).json({ msg: `Invalid OTP. You have ${3 - user.otpAttempts} attempts left.` });
    }

    // --- OTP is Valid ---

    // Reset OTP fields
    user.otp = null;
    user.otpExpires = null;
    user.otpAttempts = 0;

    // --- Handle Referral Logic ---
    if (user.referredBy && !user.isReferralVerified) {
      const referrer = await User.findById(user.referredBy);
      const referralRecord = await Referral.findOne({ referred: user._id });

      if (referrer && referralRecord) {
        referrer.referralPoints += 1;
        referralRecord.status = 'Verified';
        user.isReferralVerified = true;

        // Check for premium reward
        if (referrer.referralPoints >= 5) {
          referrer.referralPoints -= 5; // Reset points
          referrer.premiumStatus = 'Basic'; // Grant 7-day premium
          referrer.premiumExpires = dayjs().add(7, 'day').toDate();
        }
        await referrer.save();
        await referralRecord.save();
      }
    }
    
    await user.save();

    // --- Role and Token Generation ---
    let userRole = user.role; // 'User'
    let assistantExpires = null;

    // Check if this user is also an admin
    const admin = await Admin.findOne({ email: user.email });

    if (admin) {
      // Check for assistant expiry
      if (admin.role === 'AssistantAdmin') {
        if (dayjs().isAfter(admin.assistantExpires)) {
          // Assistant has expired. Delete their admin status.
          await Admin.findByIdAndDelete(admin._id);
          userRole = 'User'; // Downgrade
        } else {
          // Assistant is still active
          userRole = admin.role;
          assistantExpires = admin.assistantExpires;
        }
      } else {
        // 'Admin' or 'SuperAdmin'
        userRole = admin.role;
      }
    }
    
    // Create JWT Payload
    const payload = {
      id: user._id,
      role: userRole,
    };

    // Sign Token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }, // Token valid for 7 days
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          role: userRole,
          assistantExpires: assistantExpires,
          email: user.email,
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

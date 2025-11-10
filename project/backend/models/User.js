const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  role: {
    type: String,
    enum: ['User', 'Banned'],
    default: 'User',
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpires: {
    type: Date,
    default: null,
  },
  otpAttempts: {
    type: Number,
    default: 0,
  },
  banReason: {
    type: String,
    default: null,
  },
  banExpires: {
    type: Date,
    default: null,
  },
  premiumStatus: {
    type: String,
    enum: ['None', 'Basic', 'Standard', 'Ultimate'],
    default: 'None',
  },
  premiumExpires: {
    type: Date,
    default: null,
  },
  referralCode: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  referralPoints: {
    type: Number,
    default: 0,
  },
  isReferralVerified: {
    type: Boolean,
    default: false, // Becomes true after first successful OTP verification
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-generate referral code from email username
UserSchema.pre('save', function (next) {
  if (this.isNew && !this.referralCode) {
    const emailUser = this.email.split('@')[0];
    this.referralCode = `${emailUser}${Date.now().toString(36).slice(-4)}`;
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);

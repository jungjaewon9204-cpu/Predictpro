const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  // The user who did the referring
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // The new user who signed up
  referred: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // A user can only be referred once
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified'], // Verified after referred user's first OTP
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Referral', ReferralSchema);

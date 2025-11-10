const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');
const Odds = require('../models/Odds');
const dayjs = require('dayjs');

// @route   GET /api/user/dashboard
// @desc    Get all data for user dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check and update premium status
    if (user.premiumStatus !== 'None' && dayjs().isAfter(user.premiumExpires)) {
      user.premiumStatus = 'None';
      user.premiumExpires = null;
      await user.save();
    }
    
    // Get user's referrals
    const referrals = await Referral.find({ referrer: req.user.id }).populate('referred', 'email createdAt');
    
    // Get user's recent transactions
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10);
    
    // Get available odds
    // Only show active, enabled odds. Premium users might see more.
    let oddsQuery = { isActive: true, isCategoryEnabled: true };
    if (user.premiumStatus === 'None') {
       // TODO: Maybe limit odds for free users?
       // For now, show all.
    }
    const odds = await Odds.find(oddsQuery);

    res.json({
      user: {
        email: user.email,
        role: req.role, // This comes from 'protect' middleware, includes admin status
        premiumStatus: user.premiumStatus,
        premiumExpires: user.premiumExpires,
        referralCode: user.referralCode,
        referralPoints: user.referralPoints,
        banReason: user.banReason,
        banExpires: user.banExpires
      },
      referrals,
      transactions,
      odds,
      support: {
          whatsapp: process.env.SUPPORT_WHATSAPP
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

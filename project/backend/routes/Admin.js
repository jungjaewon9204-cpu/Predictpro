const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Transaction = require('../models/Transaction');
const Odds = require('../models/Odds');
const dayjs = require('dayjs');

// @route   GET /api/admin/summary
// @desc    Get dashboard summary for admins
// @access  Private (Admins)
router.get(
  '/summary',
  [protect, authorize('SuperAdmin', 'Admin', 'AssistantAdmin')],
  async (req, res) => {
    try {
      const users = await User.countDocuments();
      const pendingTransactions = await Transaction.countDocuments({ status: 'Pending' });
      const totalOdds = await Odds.countDocuments({ isActive: true });
      const admins = await Admin.find().select('-__v');
      
      res.json({
          users,
          pendingTransactions,
          totalOdds,
          admins
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST /api/admin/create-assistant
// @desc    Create a new assistant admin
// @access  Private (SuperAdmin)
router.post(
  '/create-assistant',
  [protect, authorize('SuperAdmin')],
  async (req, res) => {
    const { email, durationDays } = req.body;

    if (!email || !durationDays) {
      return res.status(400).json({ msg: 'Please provide email and duration' });
    }

    try {
      let admin = await Admin.findOne({ email });
      if (admin) {
        return res.status(400).json({ msg: 'This email is already an admin' });
      }

      const assistantExpires = dayjs().add(durationDays, 'day').toDate();

      admin = new Admin({
        email,
        role: 'AssistantAdmin',
        assistantExpires,
      });

      await admin.save();
      res.json(admin);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST /api/admin/ban-user
// @desc    Manually ban a user
// @access  Private (Admin, SuperAdmin)
router.post(
  '/ban-user',
  [protect, authorize('SuperAdmin', 'Admin')],
  async (req, res) => {
    const { userId, reason, durationHours } = req.body;

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      user.role = 'Banned';
      user.banReason = reason;
      user.banExpires = dayjs().add(durationHours, 'hour').toDate();

      await user.save();
      res.json({ msg: 'User has been banned', user });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET /api/admin/payments
// @desc    Get all pending payments
// @access  Private (Admins)
router.get(
  '/payments',
  [protect, authorize('SuperAdmin', 'Admin', 'AssistantAdmin')],
  async (req, res) => {
      try {
          const transactions = await Transaction.find({ status: 'Pending' })
              .populate('user', 'email')
              .sort({ createdAt: 'desc' });
          res.json(transactions);
      } catch (err) {
          console.error(err.message);
          res.status(500).send('Server Error');
      }
  }
);

// @route   POST /api/admin/verify-payment/:id
// @desc    Approve or reject a payment
// @access  Private (Admins)
router.post(
  '/verify-payment/:id',
  [protect, authorize('SuperAdmin', 'Admin', 'AssistantAdmin')],
  async (req, res) => {
      const { status, adminNotes } = req.body; // status is 'Approved' or 'Rejected'
      
      try {
          const transaction = await Transaction.findById(req.params.id);
          if (!transaction) {
              return res.status(404).json({ msg: 'Transaction not found' });
          }

          const user = await User.findById(transaction.user);
          if (!user) {
              return res.status(404).json({ msg: 'User associated with transaction not found' });
          }
          
          transaction.status = status;
          transaction.adminNotes = adminNotes || '';

          if (status === 'Approved') {
              // Handle post-approval logic
              if (transaction.type === 'Premium') {
                  let duration = 0;
                  if (transaction.premiumPlan === 'Basic') duration = 7;
                  if (transaction.premiumPlan === 'Standard') duration = 21;
                  if (transaction.premiumPlan === 'Ultimate') duration = 30;

                  user.premiumStatus = transaction.premiumPlan;
                  // Extend if already premium, otherwise set new expiry
                  const startDate = dayjs().isAfter(user.premiumExpires) ? dayjs() : dayjs(user.premiumExpires);
                  user.premiumExpires = startDate.add(duration, 'day').toDate();
                  
                  await user.save();
              }
              
              if (transaction.type === 'Odds') {
                  // TODO: Logic to send user the latest odds
                  // e.g., find latest Odds model and email it, or unlock on dashboard.
                  console.log(`Odds approved for ${user.email}. Implement odds sending.`);
              }
          }
          
          await transaction.save();
          res.json(transaction);
          
      } catch (err) {
          console.error(err.message);
          res.status(500).send('Server Error');
      }
  }
);

// TODO: Add routes for managing Odds (CRUD)

module.exports = router;

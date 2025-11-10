const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Transaction = require('../models/Transaction');

// @route   POST /api/payment/submit
// @desc    Submit payment proof
// @access  Private
router.post('/submit', protect, (req, res) => {
  // Use 'upload' middleware
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ msg: err });
    }

    if (req.file == undefined) {
      return res.status(400).json({ msg: 'Error: No File Selected!' });
    }
    
    const { type, amount, premiumPlan, paymentText } = req.body;

    // User must submit EITHER a file or payment text
    const proof = req.file ? `/uploads/payments/${req.file.filename}` : paymentText;

    if (!proof) {
        return res.status(400).json({ msg: 'Please upload a screenshot or paste payment text.' });
    }

    try {
      const newTransaction = new Transaction({
        user: req.user.id,
        type,
        amount,
        premiumPlan: type === 'Premium' ? premiumPlan : 'None',
        proof: proof,
        status: 'Pending',
      });

      await newTransaction.save();
      res.json({ msg: 'Payment submitted for verification.', transaction: newTransaction });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();

// @route   GET /api/premium/plans
// @desc    Get all available premium plans
// @access  Public
router.get('/plans', (req, res) => {
  const plans = [
    {
      name: 'Basic',
      price: 500,
      duration: '1 week',
      features: ['Daily free signals', 'Basic support'],
    },
    {
      name: 'Standard',
      price: 1500,
      duration: '3 weeks',
      features: ['Daily free signals', 'Advanced support', 'Custom themes'],
    },
    {
      name: 'Ultimate',
      price: 3000,
      duration: '1 month',
      features: ['All signals', 'Priority support', 'Custom themes', 'Badges'],
    },
  ];
  res.json(plans);
});

module.exports = router;

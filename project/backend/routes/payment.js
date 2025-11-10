const router = require('express').Router();

// POST /api/payment/charge
router.post('/charge', (req, res) => {  
  res.json({message: 'payment charge placeholder'});  
});

module.exports = router;  

const router = require('express').Router();

// GET /api/referral/code
router.get('/code', (req, res) => {  
  res.json({message: 'referral code placeholder'});  
});

module.exports = router;  

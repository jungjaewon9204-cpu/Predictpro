const router = require('express').Router();

// GET /api/admin/stats
router.get('/stats', (req, res) => {  
  res.json({message: 'admin stats placeholder'});  
});

module.exports = router;  

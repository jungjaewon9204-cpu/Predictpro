const router = require('express').Router();

// POST /api/auth/login
router.post('/login', (req, res) => {  
  // placeholder  
  res.json({message: 'login endpoint'});  
});

// POST /api/auth/register
router.post('/register', (req, res) => {  
  res.json({message: 'register endpoint'});  
});

module.exports = router;  

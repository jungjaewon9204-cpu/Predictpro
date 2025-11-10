const mongoose = require('mongoose');

const OddsSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Crash', 'Gems', 'Mines', 'Aviator'],
    required: true,
  },
  title: {
    type: String,
    required: true, // e.g., "Mines 5-Star Pick"
  },
  content: {
    type: String,
    required: true, // The actual prediction/tip
  },
  oddsValue: {
    type: Number,
    default: 1.5,
  },
  isActive: {
    type: Boolean,
    default: true, // So admin can disable it
  },
  // The 'Aviator' category can be disabled globally
  isCategoryEnabled: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Odds', OddsSchema);

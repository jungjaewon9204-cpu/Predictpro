const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['Odds', 'Booking', 'LiveSession', 'Premium'],
    required: true,
  },
  // For premium, store the plan
  premiumPlan: {
    type: String,
    enum: ['Basic', 'Standard', 'Ultimate', 'None'],
    default: 'None',
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  // Can be URL to screenshot or payment text
  proof: {
    type: String,
    required: true,
  },
  adminNotes: {
    type: String, // Reason for rejection, etc.
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Transaction', TransactionSchema);

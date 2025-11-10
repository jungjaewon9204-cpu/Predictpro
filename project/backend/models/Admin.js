const mongoose = require('mongoose');
const dayjs = require('dayjs');

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ['SuperAdmin', 'Admin', 'AssistantAdmin'],
    required: true,
  },
  // Used only for AssistantAdmins
  assistantExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-create the Super Admin from .env file
AdminSchema.statics.initializeSuperAdmin = async function () {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    console.warn('SUPER_ADMIN_EMAIL not set. Skipping super admin creation.');
    return;
  }

  try {
    const existing = await this.findOne({ email: superAdminEmail });
    if (!existing) {
      await this.create({
        email: superAdminEmail,
        role: 'SuperAdmin',
      });
      console.log('Super Admin account initialized.');
    }
  } catch (error) {
    console.error('Error initializing Super Admin:', error.message);
  }
};

// Call initialization after model is compiled
const Admin = mongoose.model('Admin', AdminSchema);
Admin.initializeSuperAdmin();

module.exports = Admin;

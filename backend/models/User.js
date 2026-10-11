import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    password: { type: String, select: false },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: '',
    },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    about: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    favoriteProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
    role: {
      type: String,
      enum: ['tenant', 'landlord', 'admin'],
      default: 'tenant',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    preferences: {
      type: Object,
      default: () => ({
        propertyUpdates: true,
        inquiries: true,
        wishlistAlerts: true,
        accountSecurity: true,
        marketingUpdates: false,
      }),
    },
    resetPasswordTokenHash: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;

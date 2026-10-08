import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  city: user.city,
  state: user.state,
  country: user.country,
  about: user.about,
  profileImage: user.profileImage,
  role: user.role,
  createdAt: user.createdAt,
});

export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, address, city, state, country, about, profileImage, role } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    if (role && !['tenant', 'landlord'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      passwordHash,
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      country: country ? country.trim() : '',
      about: about ? about.trim() : '',
      profileImage: profileImage || '',
      role: role || 'tenant',
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: publicUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'This email is already registered.' });
    }
    console.error('[AUTH REGISTER ERROR]', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, phone, identifier, password, role } = req.body || {};
    const loginIdentifier = String(email || phone || identifier || '').trim();
    const loginPassword = String(password || '').trim();

    if (!loginIdentifier && !loginPassword) {
      return res.status(400).json({ success: false, message: 'Please enter your email or phone number and password.' });
    }
    if (!loginIdentifier) {
      return res.status(400).json({ success: false, message: 'Please enter your email or phone number.' });
    }
    if (!loginPassword) {
      return res.status(400).json({ success: false, message: 'Please enter your password.' });
    }

    const isEmail = loginIdentifier.includes('@');
    let candidateUsers = [];
    if (isEmail) {
      const user = await User.findOne({ email: loginIdentifier.toLowerCase().trim() }).select('+passwordHash +password');
      if (user) candidateUsers.push(user);
    } else {
      const cleanPhone = loginIdentifier.replace(/\D/g, '') || loginIdentifier;
      candidateUsers = await User.find({ phone: cleanPhone }).select('+passwordHash +password');
    }

    if (!candidateUsers.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    let matchedUser = null;
    for (const candidate of candidateUsers) {
      const storedHash = candidate.passwordHash || candidate.password;
      const isMatch = storedHash ? await bcrypt.compare(loginPassword, storedHash) : false;
      if (isMatch) {
        matchedUser = candidate;
        if (!role || candidate.role === role) {
          break;
        }
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (matchedUser.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    if (role && matchedUser.role !== role) {
      if (matchedUser.role !== 'admin') {
        return res.status(401).json({
          success: false,
          message: `Role mismatch. This account is registered as a ${matchedUser.role}.`,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: publicUser(matchedUser),
      token: generateToken(matchedUser._id),
    });
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

export const getCurrentUser = async (req, res) => {
  res.status(200).json({ success: true, user: publicUser(req.user) });
};

// In-memory rate limiter for password reset requests (5 requests per 15 minutes per IP/email)
const forgotPwAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FORGOT_ATTEMPTS = 5;

const isRateLimited = (key) => {
  const now = Date.now();
  const records = forgotPwAttempts.get(key) || [];
  const validRecords = records.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (validRecords.length >= MAX_FORGOT_ATTEMPTS) {
    forgotPwAttempts.set(key, validRecords);
    return true;
  }
  validRecords.push(now);
  forgotPwAttempts.set(key, validRecords);
  return false;
};

// Periodically clean up stale rate-limit keys
setInterval(() => {
  const now = Date.now();
  for (const [key, records] of forgotPwAttempts.entries()) {
    const valid = records.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (!valid.length) forgotPwAttempts.delete(key);
    else forgotPwAttempts.set(key, valid);
  }
}, 30 * 60 * 1000).unref();

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client';
    const rateLimitKey = `${clientIp}:${normalizedEmail}`;

    if (isRateLimited(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        message: 'Too many password reset requests. Please wait 15 minutes before trying again.',
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    // Consistent generic response whether the account exists or not (prevent email enumeration)
    const genericResponse = {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate cryptographically secure random token (32 bytes hex)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Store ONLY the SHA-256 hash of the token in the database
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    // Construct the client reset URL
    const configuredFrontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
    if (!configuredFrontendUrl) {
      throw new Error('FRONTEND_URL or CLIENT_URL must be configured to create password reset links.');
    }
    const clientBase = configuredFrontendUrl.replace(/\/$/, '');
    const resetUrl = `${clientBase}/reset-password/${rawToken}`;

    // Send the password reset email or log development fallback
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresInMinutes: 30,
    });

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && emailResult?.devResetUrl) {
      return res.status(200).json({
        ...genericResponse,
        devResetUrl: emailResult.devResetUrl,
      });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ success: false, message: 'An error occurred while processing your request.' });
  }
};

export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Password reset link is invalid or has expired.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Password reset link is invalid or has expired.' });
    }

    res.status(200).json({
      success: true,
      message: 'Reset token is valid.',
      email: user.email,
    });
  } catch (error) {
    console.error('Error in validateResetToken:', error);
    res.status(500).json({ success: false, message: 'Unable to validate reset link.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Password reset link is invalid or has expired.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    // Hash the token from parameter to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+passwordHash +resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Hash the new password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(password, salt);

    user.passwordHash = newPasswordHash;
    user.password = undefined; // clear legacy field if any
    user.resetPasswordTokenHash = undefined; // invalidate single-use token immediately
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
  }
};

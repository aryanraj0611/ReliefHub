const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const { ROLES } = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');

const MAX_DOC_SIZE_BYTES = 2.5 * 1024 * 1024;

// Roles a caller is allowed to self-assign at registration.
// admin and eoc must be assigned manually by an existing admin.
const SELF_ASSIGNABLE_ROLES = ROLES.filter((r) => r !== 'admin' && r !== 'eoc');

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(SELF_ASSIGNABLE_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${SELF_ASSIGNABLE_ROLES.join(', ')}` }),
  }).optional().default('citizen'),
  organizationName: z.string().trim().max(150).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  verificationDocument: z
    .object({
      dataUrl: z.string(),
      fileName: z.string().optional(),
    })
    .optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // requires HTTPS in prod
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth', // only sent back to auth routes, reduces exposure
};

// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400);
    throw new Error(parsed.error.errors.map((e) => e.message).join('; '));
  }

  const { name, email, password, role, organizationName, phone, verificationDocument } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const NON_CITIZEN_ROLES = ['hospital', 'shelter', 'rescue_team', 'ngo', 'volunteer'];

  if (NON_CITIZEN_ROLES.includes(role) && verificationDocument?.dataUrl) {
    const sizeBytes = Buffer.byteLength(verificationDocument.dataUrl, 'utf8');
    if (sizeBytes > MAX_DOC_SIZE_BYTES) {
      res.status(413);
      throw new Error('Verification document exceeds the 2.5 MB limit — please upload a smaller file');
    }
  }

  const docPayload =
    NON_CITIZEN_ROLES.includes(role) && verificationDocument?.dataUrl
      ? {
          dataUrl: verificationDocument.dataUrl,
          fileName: verificationDocument.fileName || '',
          status: 'pending',
          uploadedAt: new Date(),
        }
      : undefined;

  // Construct (not yet saved) so _id exists for token signing.
  const user = new User({
    name,
    email,
    password,
    role,
    organizationName,
    phone,
    verificationDocument: docPayload,
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await user.save(); // single DB round-trip

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({ success: true, user, accessToken });
});

// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400);
    throw new Error(parsed.error.errors.map((e) => e.message).join('; '));
  }

  const { email, password } = parsed.data;

  const user = await User.findOne({ email }).select('+password +refreshTokenHash');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, user, accessToken });
});

// @route POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    res.status(401);
    throw new Error('Refresh token invalid or expired — please log in again');
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    res.status(401);
    throw new Error('Session no longer valid — please log in again');
  }

  const matches = await bcrypt.compare(token, user.refreshTokenHash);
  if (!matches) {
    res.status(401);
    throw new Error('Refresh token does not match — please log in again');
  }

  // Rotate: issue a new refresh token, invalidate the old one.
  const newRefreshToken = generateRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await user.save();

  res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

  const accessToken = generateAccessToken(user);
  res.json({ success: true, accessToken });
});

// @route POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.id, { refreshTokenHash: undefined });
    } catch {
      // token already invalid — nothing to clean up server-side
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out' });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { register, login, refresh, logout, getMe };
import User from '../models/User.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logAction, logSecurity } from '../services/AuditService.js';

// POST /api/v1/auth/register
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    throw new ValidationError('All fields are required');
  }
  
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ValidationError('Email already registered');
  }
  
  const user = new User({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
    role: role === 'admin' ? 'merchant' : (role || 'merchant')
  });
  
  await user.save();
  
  const tokens = generateTokens(user);
  
  await logAction({
    action: 'user_registered',
    category: 'auth',
    actor: { userId: user._id, email: user.email, role: user.role, ipAddress: req.ip },
    resource: { type: 'user', id: user._id }
  });
  
  res.status(201).json({
    message: 'User registered successfully',
    user: user.toJSON(),
    ...tokens
  });
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  
  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    await logSecurity('login_failed', { email, ipAddress: req.ip }, { reason: 'User not found' });
    return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
  }
  
  if (user.isLocked()) {
    return res.status(423).json({ error: 'Account is locked', code: 'ACCOUNT_LOCKED' });
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    await user.incrementLoginAttempts();
    await logSecurity('login_failed', { userId: user._id, email, ipAddress: req.ip }, { reason: 'Invalid password' });
    return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
  }
  
  await user.resetLoginAttempts();
  
  const tokens = generateTokens(user);
  
  user.refreshTokens.push({
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  user.metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  await user.save();
  
  await logAction({
    action: 'user_login',
    category: 'auth',
    actor: { userId: user._id, email: user.email, role: user.role, ipAddress: req.ip }
  });
  
  res.json({ message: 'Login successful', user: user.toJSON(), ...tokens });
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token = req.token;
  
  if (req.user && token) {
    await req.user.blacklistToken(token);
    
    await logAction({
      action: 'user_logout',
      category: 'auth',
      actor: { userId: req.user._id, email: req.user.email, role: req.user.role, ipAddress: req.ip }
    });
  }
  
  res.json({ message: 'Logged out successfully' });
});

// POST /api/v1/auth/refresh
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new ValidationError('Refresh token required');
  }
  
  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.userId);
  
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_TOKEN' });
  }
  
  const validToken = user.refreshTokens.find(t => t.token === refreshToken && t.expiresAt > new Date());
  
  if (!validToken) {
    return res.status(401).json({ error: 'Refresh token expired', code: 'TOKEN_EXPIRED' });
  }
  
  const tokens = generateTokens(user);
  
  res.json({ message: 'Token refreshed', ...tokens });
});

// GET /api/v1/auth/me
export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

export default { register, login, logout, refreshToken, getProfile };

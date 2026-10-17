const rateLimit = require('express-rate-limit');

// Shared handler: returns JSON in the same shape as errorHandler
// { success: false, message: "..." } so the frontend treats it uniformly.
const jsonHandler = (req, res, _next, options) => {
  res.status(options.statusCode).json({
    success: false,
    message: options.message,
  });
};

// POST /api/auth/login — 10 failed attempts per 15 min per IP.
// skipSuccessfulRequests: true means a 200 response doesn't consume a slot,
// so a legitimate user who logs in successfully is never blocked.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts from this IP — please try again after 15 minutes',
  handler: jsonHandler,
});

// POST /api/auth/register — 10 registrations per hour per IP.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many accounts created from this IP — please try again after an hour',
  handler: jsonHandler,
});

// POST /api/auth/refresh — 30 per 15 min per IP.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many token refresh requests from this IP — please try again after 15 minutes',
  handler: jsonHandler,
});

// POST /api/ai/classify, POST /api/ai/chat, POST /api/incidents
// (all three trigger a Groq API call) — 30 per minute per IP.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many AI requests from this IP — please slow down and try again shortly',
  handler: jsonHandler,
});

module.exports = { loginLimiter, registerLimiter, refreshLimiter, aiLimiter };

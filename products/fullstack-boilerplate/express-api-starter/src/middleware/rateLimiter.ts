import rateLimit from "express-rate-limit";

/**
 * General API rate limiter.
 * 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: "15 minutes",
  },
});

/**
 * Strict rate limiter for authentication endpoints.
 * 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    retryAfter: "15 minutes",
  },
  // Skip successful requests from counting against the limit
  skipSuccessfulRequests: false,
});

/**
 * Create a custom rate limiter with specific settings.
 *
 * @example
 * ```ts
 * router.post('/upload', createLimiter({ windowMs: 60000, max: 5 }), uploadHandler);
 * ```
 */
export function createLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: options.message ?? "Too many requests, please try again later",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

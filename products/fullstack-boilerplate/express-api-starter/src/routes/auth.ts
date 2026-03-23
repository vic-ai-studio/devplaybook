import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateTokenPair, generateAccessToken } from "../lib/jwt";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "../middleware/errorHandler";
import { AuthenticatedRequest, TokenResponse } from "../types";

const router = Router();

// --- Schemas ---

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// --- Routes ---

/**
 * POST /auth/register
 * Create a new user account
 */
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      // Check if email is already taken
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw ConflictError("An account with this email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };
      const tokens = generateTokenPair(tokenPayload);

      // Store refresh token
      await prisma.session.create({
        data: {
          userId: user.id,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.refreshTokenExpiry,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        },
      });

      const response: TokenResponse = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiresIn,
        tokenType: "Bearer",
      };

      res.status(201).json({
        success: true,
        message: "Account created successfully",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          tokens: response,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/login
 * Authenticate with email and password
 */
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw UnauthorizedError("Invalid email or password");
      }

      if (!user.active) {
        throw new AppError("Account is deactivated", 403, {
          code: "ACCOUNT_DEACTIVATED",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw UnauthorizedError("Invalid email or password");
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };
      const tokens = generateTokenPair(tokenPayload);

      // Store refresh token
      await prisma.session.create({
        data: {
          userId: user.id,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.refreshTokenExpiry,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        },
      });

      const response: TokenResponse = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiresIn,
        tokenType: "Bearer",
      };

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          tokens: response,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/refresh
 * Exchange a refresh token for a new access token
 */
router.post(
  "/refresh",
  validate(refreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      // Find session
      const session = await prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session) {
        throw UnauthorizedError("Invalid refresh token");
      }

      // Check expiry
      if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } });
        throw UnauthorizedError("Refresh token has expired");
      }

      // Check user is still active
      if (!session.user.active) {
        await prisma.session.delete({ where: { id: session.id } });
        throw new AppError("Account is deactivated", 403);
      }

      // Rotate refresh token (delete old, create new)
      const tokenPayload = {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
      };
      const tokens = generateTokenPair(tokenPayload);

      await prisma.$transaction([
        prisma.session.delete({ where: { id: session.id } }),
        prisma.session.create({
          data: {
            userId: session.user.id,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.refreshTokenExpiry,
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.accessTokenExpiresIn,
          tokenType: "Bearer" as const,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/logout
 * Invalidate the current session
 */
router.post(
  "/logout",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body.refreshToken;

      if (refreshToken) {
        await prisma.session.deleteMany({
          where: {
            refreshToken,
            userId: req.user!.userId,
          },
        });
      }

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/logout-all
 * Invalidate all sessions for the current user
 */
router.post(
  "/logout-all",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await prisma.session.deleteMany({
        where: { userId: req.user!.userId },
      });

      res.json({
        success: true,
        message: `Logged out from ${result.count} session(s)`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /auth/me
 * Get the current authenticated user
 */
router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { sessions: true } },
        },
      });

      if (!user) {
        throw NotFoundError("User");
      }

      res.json({
        success: true,
        data: {
          ...user,
          activeSessions: user._count.sessions,
          _count: undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Router, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validate, validateMultiple } from "../middleware/validate";
import { NotFoundError, ConflictError, BadRequestError } from "../middleware/errorHandler";
import { AuthenticatedRequest, PaginatedResponse, UserResponse } from "../types";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// --- Schemas ---

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(["name", "email", "createdAt", "role"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  active: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().toLowerCase().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  active: z.boolean().optional(),
});

const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

// --- Helper ---

function formatUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// --- Routes ---

/**
 * GET /users
 * List all users with pagination, filtering, and sorting
 */
router.get(
  "/",
  validate(listUsersQuerySchema, "query"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, sortBy, sortOrder, search, role, active } =
        req.query as unknown as z.infer<typeof listUsersQuerySchema>;

      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      if (role) where.role = role;
      if (active !== undefined) where.active = active;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<UserResponse> = {
        data: users.map(formatUser),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      res.json({ success: true, ...response });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /users/:id
 * Get a single user by ID
 */
router.get(
  "/:id",
  validate(userIdParamsSchema, "params"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw NotFoundError("User");
      }

      res.json({ success: true, data: formatUser(user) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /users
 * Create a new user (admin only)
 */
router.post(
  "/",
  requireRole("ADMIN"),
  validate(createUserSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw ConflictError("A user with this email already exists");
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: formatUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /users/:id
 * Update a user (admin only, or self for name)
 */
router.patch(
  "/:id",
  validateMultiple({
    params: userIdParamsSchema,
    body: updateUserSchema,
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Non-admins can only update their own name
      const isSelf = req.user!.userId === id;
      const isAdmin = req.user!.role === "ADMIN";

      if (!isSelf && !isAdmin) {
        throw BadRequestError("You can only update your own profile");
      }

      if (!isAdmin) {
        // Non-admins can only update name
        const allowedKeys = ["name"];
        const attemptedKeys = Object.keys(updates);
        const disallowed = attemptedKeys.filter(
          (k) => !allowedKeys.includes(k)
        );
        if (disallowed.length > 0) {
          throw BadRequestError(
            `You don't have permission to update: ${disallowed.join(", ")}`
          );
        }
      }

      // Check email uniqueness if updating email
      if (updates.email) {
        const existing = await prisma.user.findFirst({
          where: { email: updates.email, NOT: { id } },
        });
        if (existing) {
          throw ConflictError("A user with this email already exists");
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: updates,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: "User updated successfully",
        data: formatUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /users/:id
 * Delete a user (admin only)
 */
router.delete(
  "/:id",
  requireRole("ADMIN"),
  validate(userIdParamsSchema, "params"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (req.user!.userId === id) {
        throw BadRequestError("You cannot delete your own account");
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw NotFoundError("User");
      }

      // Delete user and cascade to sessions
      await prisma.user.delete({ where: { id } });

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

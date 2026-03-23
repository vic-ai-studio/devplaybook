import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    options?: { code?: string; isOperational?: boolean }
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.code = options?.code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Common error factories
export const NotFoundError = (resource: string) =>
  new AppError(`${resource} not found`, 404, { code: "NOT_FOUND" });

export const ConflictError = (message: string) =>
  new AppError(message, 409, { code: "CONFLICT" });

export const BadRequestError = (message: string) =>
  new AppError(message, 400, { code: "BAD_REQUEST" });

export const UnauthorizedError = (message = "Unauthorized") =>
  new AppError(message, 401, { code: "UNAUTHORIZED" });

export const ForbiddenError = (message = "Forbidden") =>
  new AppError(message, 403, { code: "FORBIDDEN" });

/**
 * Global error handler middleware.
 * Must be registered after all routes.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  if (err instanceof AppError && err.isOperational) {
    // Operational errors are expected — log at warn level
    console.warn(`[${err.statusCode}] ${err.message}`);
  } else {
    // Programming errors — log full stack trace
    console.error("Unexpected error:", err);
  }

  // Prisma known errors
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaError = err as { code: string; meta?: { target?: string[] } };

    if (prismaError.code === "P2002") {
      const target = prismaError.meta?.target?.join(", ") ?? "field";
      res.status(409).json({
        success: false,
        message: `A record with this ${target} already exists`,
        code: "DUPLICATE_ENTRY",
      });
      return;
    }

    if (prismaError.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Record not found",
        code: "NOT_FOUND",
      });
      return;
    }
  }

  // AppError — send structured response
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  // Unknown errors — don't leak details in production
  const isDev = process.env.NODE_ENV === "development";

  res.status(500).json({
    success: false,
    message: isDev ? err.message : "Internal server error",
    ...(isDev ? { stack: err.stack } : {}),
  });
}

/**
 * Catch-all for unmatched routes
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: "Route not found",
    code: "ROUTE_NOT_FOUND",
  });
}

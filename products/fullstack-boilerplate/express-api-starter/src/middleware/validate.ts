import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type ValidationTarget = "body" | "query" | "params";

/**
 * Middleware factory that validates request data against a Zod schema.
 *
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (body, query, params)
 *
 * @example
 * ```ts
 * const createUserSchema = z.object({
 *   name: z.string().min(2),
 *   email: z.string().email(),
 * });
 *
 * router.post('/users', validate(createUserSchema), createUser);
 * ```
 */
export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      // Replace the request data with the parsed (and potentially transformed) data
      req[target] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formattedErrors,
        });
        return;
      }

      next(error);
    }
  };
}

/**
 * Validate multiple targets at once
 *
 * @example
 * ```ts
 * router.put('/users/:id',
 *   validateMultiple({
 *     params: z.object({ id: z.string().cuid() }),
 *     body: z.object({ name: z.string().min(2) }),
 *   }),
 *   updateUser
 * );
 * ```
 */
export function validateMultiple(schemas: Partial<Record<ValidationTarget, ZodSchema>>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: Array<{ field: string; message: string; target: string }> = [];

    for (const [target, schema] of Object.entries(schemas) as Array<
      [ValidationTarget, ZodSchema]
    >) {
      try {
        const data = schema.parse(req[target]);
        req[target] = data;
      } catch (error) {
        if (error instanceof ZodError) {
          allErrors.push(
            ...error.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
              target,
            }))
          );
        }
      }
    }

    if (allErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: allErrors,
      });
      return;
    }

    next();
  };
}

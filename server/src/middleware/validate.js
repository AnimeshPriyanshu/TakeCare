import { HttpError } from "../utils/http-error.js";

export function validate(schema, source = "body") {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(new HttpError(400, "Please check the highlighted fields", details));
    }
    req[source] = result.data;
    next();
  };
}

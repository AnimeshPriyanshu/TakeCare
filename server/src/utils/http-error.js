export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new HttpError(400, message, details);
}

export function unauthorized(message = "Authentication required") {
  return new HttpError(401, message);
}

export function forbidden(message = "You do not have permission to do that") {
  return new HttpError(403, message);
}

export function notFound(message = "Resource not found") {
  return new HttpError(404, message);
}

export function conflict(message, details) {
  return new HttpError(409, message, details);
}

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

export function payloadTooLarge(message = "The uploaded file is too large") {
  return new HttpError(413, message);
}

export function serviceUnavailable(message = "The service is temporarily unavailable") {
  return new HttpError(503, message);
}

export function badGateway(message = "The upstream service returned an invalid response") {
  return new HttpError(502, message);
}

export function gatewayTimeout(message = "The upstream service timed out") {
  return new HttpError(504, message);
}

export function conflict(message, details) {
  return new HttpError(409, message, details);
}

export function tooManyRequests(message = "Too many requests") {
  return new HttpError(429, message);
}

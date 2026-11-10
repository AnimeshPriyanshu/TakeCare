import multer from "multer";
import { MAX_AUDIO_BYTES } from "../config/audio.js";
import { badRequest, payloadTooLarge } from "../utils/http-error.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_BYTES,
    files: 1,
    fields: 4,
    fieldSize: 1024,
  },
});

export function audioUpload(req, res, next) {
  upload.single("audio_file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(payloadTooLarge("Audio must be 8 MB or smaller"));
      }
      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return next(badRequest("Upload the audio in the audio_file field"));
      }
      return next(badRequest("Could not read the audio upload"));
    }
    return next(error);
  });
}

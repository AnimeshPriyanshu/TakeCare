import {
  cancelAiAction,
  confirmAiAction,
  getChatHistory,
  handleChat,
} from "../services/ai.service.js";
import { transcribeAudio } from "../services/transcription.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const chat = asyncHandler(async (req, res) => {
  const result = await handleChat(req.user.id, req.body.message);
  res.json(result);
});

export const confirmAction = asyncHandler(async (req, res) => {
  const result = await confirmAiAction(req.user.id, req.params.id);
  res.json(result);
});

export const cancelAction = asyncHandler(async (req, res) => {
  const result = await cancelAiAction(req.user.id, req.params.id);
  res.json(result);
});

export const history = asyncHandler(async (req, res) => {
  const messages = await getChatHistory(req.user.id);
  res.json({ messages });
});

export const transcribe = asyncHandler(async (req, res) => {
  const result = await transcribeAudio({
    file: req.file,
    languageCode: req.body.language_code,
  });
  res.json(result);
});

import { z } from "zod";

export const chatSchema = z.object({
  message: z.string().trim().min(1, "Type a message").max(500),
});

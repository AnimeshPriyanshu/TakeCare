import { env } from "../config/env.js";
import {
  GNANI_STT_TIMEOUT_MS,
  GNANI_STT_URL,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_SECONDS,
  TRANSCRIPTION_LANGUAGES,
} from "../config/audio.js";
import {
  badGateway,
  badRequest,
  gatewayTimeout,
  payloadTooLarge,
  serviceUnavailable,
} from "../utils/http-error.js";

function ascii(buffer, start, length) {
  return buffer.toString("ascii", start, start + length);
}

function detectAudioFormat(buffer) {
  if (buffer.length >= 12 && ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WAVE") {
    return { format: "wav", mime: "audio/wav", extension: "wav" };
  }
  if (buffer.length >= 4 && ascii(buffer, 0, 4) === "OggS") {
    return { format: "ogg", mime: "audio/ogg", extension: "ogg" };
  }
  if (buffer.length >= 4 && ascii(buffer, 0, 4) === "fLaC") {
    return { format: "flac", mime: "audio/flac", extension: "flac" };
  }
  if (buffer.length >= 12 && ascii(buffer, 4, 4) === "ftyp") {
    return { format: "m4a", mime: "audio/mp4", extension: "m4a" };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) {
    return { format: "aac", mime: "audio/aac", extension: "aac" };
  }
  if (
    buffer.length >= 3 &&
    (ascii(buffer, 0, 3) === "ID3" ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))
  ) {
    return { format: "mp3", mime: "audio/mpeg", extension: "mp3" };
  }
  return null;
}

function wavDurationSeconds(buffer) {
  if (buffer.length < 44) return null;
  let offset = 12;
  let byteRate = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = ascii(buffer, offset, 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;

    if (chunkId === "fmt " && chunkSize >= 16 && dataStart + 16 <= buffer.length) {
      byteRate = buffer.readUInt32LE(dataStart + 8);
    }
    if (chunkId === "data") {
      if (!byteRate || byteRate <= 0) return null;
      const available = Math.min(chunkSize, buffer.length - dataStart);
      return available / byteRate;
    }

    offset = dataStart + chunkSize + (chunkSize % 2);
  }
  return null;
}

function mp3DurationSeconds(buffer) {
  // Simple MP3 duration estimation for CBR files.
  // Looks for the first valid MP3 frame header (sync word 0xFFF).
  // Returns duration in seconds or null if unable to parse.
  if (buffer.length < 10) return null;

  // Find first frame sync (0xFFF)
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
      // Found potential frame header at i
      // Need at least 4 bytes for header
      if (i + 4 > buffer.length) return null;
      const header = buffer.readUInt32BE(i);
      // Parse header (simplified)
      // Bits: sync(11), version(2), layer(2), protection(1), bitrate(4), sampling_rate(2), padding(1), private(1), mode(2), mode_extension(2), copyright(1), original(1), emphasis(2)
      // We only need bitrate and sampling_rate for CBR.
      const version = (header >> 19) & 0x3;
      const layer = (header >> 17) & 0x3;
      const bitrateIndex = (header >> 12) & 0xf;
      const samplingRateIndex = (header >> 10) & 0x3;
      const padding = (header >> 9) & 0x1;

      // Skip bad sync (version 1 is reserved, layer 0 is reserved)
      if (version === 0x1 || layer === 0x0) continue;

      // Bitrate tables (kbps) for MPEG 1,2,2.5 and layers I,II,III
      // We'll implement only MPEG 1 Layer III (most common)
      // version: 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
      // layer: 1 = Layer III, 2 = Layer II, 3 = Layer I
      // For simplicity, we only handle MPEG1 Layer III (version=3, layer=1)
      if (version !== 3 || layer !== 1) continue;

      const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
      const samplingRateTable = [44100, 48000, 32000, 0];

      const bitrate = bitrateTable[bitrateIndex];
      const samplingRate = samplingRateTable[samplingRateIndex];

      if (bitrate === 0 || samplingRate === 0) continue;

      // Frame size in bytes for Layer III
      const frameSize = Math.floor(144 * bitrate * 1000 / samplingRate + padding);

      // Duration = (fileSize / frameSize) * samplesPerFrame / samplingRate
      // samplesPerFrame for Layer III = 1152
      const samplesPerFrame = 1152;
      const fileSize = buffer.length;
      const estimatedFrames = fileSize / frameSize;
      const duration = (estimatedFrames * samplesPerFrame) / samplingRate;

      if (duration > 0) return duration;
    }
  }
  return null;
}

function validateAudio(file) {
  if (!file) throw badRequest("Attach an audio file in the audio_file field");
  if (!file.size) throw badRequest("The uploaded audio file is empty");
  if (file.size > MAX_AUDIO_BYTES) {
    throw payloadTooLarge("Audio must be 8 MB or smaller");
  }

  const detected = detectAudioFormat(file.buffer);
  if (!detected) {
    throw badRequest("Unsupported audio format. Use WAV, MP3, OGG, FLAC, AAC or M4A.");
  }

  if (detected.format === "wav") {
    const duration = wavDurationSeconds(file.buffer);
    if (duration != null && duration > MAX_AUDIO_SECONDS + 0.5) {
      throw badRequest(`Audio must be ${MAX_AUDIO_SECONDS} seconds or shorter`);
    }
  } else if (detected.format === "mp3") {
    const duration = mp3DurationSeconds(file.buffer);
    if (duration != null && duration > MAX_AUDIO_SECONDS + 0.5) {
      throw badRequest(`Audio must be ${MAX_AUDIO_SECONDS} seconds or shorter`);
    }
  }

  return detected;
}

function parseUpstreamJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function transcribeAudio({ file, languageCode }) {
  if (!env.gnaniApiKey) {
    throw serviceUnavailable("Speech transcription is not configured on this server");
  }

  const language = languageCode || "en-IN";
  if (!TRANSCRIPTION_LANGUAGES.includes(language)) {
    throw badRequest("Language must be hi-IN or en-IN");
  }

  const detected = validateAudio(file);
  const form = new FormData();
  form.append(
    "audio_file",
    new Blob([file.buffer], { type: detected.mime }),
    `audio.${detected.extension}`,
  );
  form.append("language_code", language);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GNANI_STT_TIMEOUT_MS);
  const startedAt = Date.now();
  let response;
  let text;

  try {
    response = await fetch(GNANI_STT_URL, {
      method: "POST",
      headers: { "X-API-Key-ID": env.gnaniApiKey },
      body: form,
      signal: controller.signal,
    });
    text = await response.text();
  } catch (error) {
    if (error.name === "AbortError") {
      throw gatewayTimeout("Speech transcription timed out. Please try again.");
    }
    throw badGateway("Could not reach the speech transcription service");
  } finally {
    clearTimeout(timeout);
  }

  const data = parseUpstreamJson(text);

  if (!response.ok || data?.success === false) {
    console.error("[takecare] Gnani STT request failed", {
      status: response.status,
      requestId: data?.request_id ?? null,
    });
    throw badGateway("Speech transcription failed. Please try again.");
  }

  const transcript =
    typeof data?.transcript === "string"
      ? data.transcript.trim()
      : typeof data?.output?.literal === "string"
        ? data.output.literal.trim()
        : "";

  if (!transcript) {
    throw badRequest("No speech was detected in the audio");
  }

  return {
    transcript,
    literal:
      typeof data?.output?.literal === "string" ? data.output.literal.trim() : null,
    provider: "gnani",
    model: typeof data?.model === "string" ? data.model : "prisma-v2.5",
    languageCode: language,
    requestId: data?.request_id ?? null,
    processingTimeMs:
      typeof data?.processing_time === "number"
        ? Math.round(data.processing_time * 1000)
        : null,
    latencyMs: Date.now() - startedAt,
    format: detected.format,
  };
}

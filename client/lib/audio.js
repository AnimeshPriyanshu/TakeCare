export const MAX_RECORDING_SECONDS = 30;
export const AUDIO_SAMPLE_RATE = 16000;

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWav(audioBuffer) {
  const samples = audioBuffer.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] || 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export function pickRecordingMimeType() {
  if (typeof window === "undefined" || !window.MediaRecorder?.isTypeSupported) {
    return "";
  }
  return (
    [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ].find((type) => window.MediaRecorder.isTypeSupported(type)) ?? ""
  );
}

export async function convertToWav(
  blob,
  { sampleRate = AUDIO_SAMPLE_RATE, maxSeconds = MAX_RECORDING_SECONDS } = {},
) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const OfflineContextClass =
    window.OfflineAudioContext || window.webkitOfflineAudioContext;

  if (!AudioContextClass || !OfflineContextClass) {
    throw new Error("This browser cannot process audio for transcription.");
  }

  const arrayBuffer = await blob.arrayBuffer();
  const decodeContext = new AudioContextClass();

  let decoded;
  try {
    decoded = await new Promise((resolve, reject) => {
      decodeContext.decodeAudioData(arrayBuffer, resolve, reject);
    });
  } catch {
    throw new Error(
      "Could not read this audio. Try a WAV, MP3, M4A, OGG or FLAC file.",
    );
  } finally {
    if (typeof decodeContext.close === "function") {
      decodeContext.close().catch(() => {});
    }
  }

  const durationSeconds = Math.min(decoded.duration, maxSeconds);
  const frames = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  const renderContext = new OfflineContextClass(1, frames, sampleRate);
  const source = renderContext.createBufferSource();
  source.buffer = decoded;
  source.connect(renderContext.destination);
  source.start(0);

  const rendered = await renderContext.startRendering();
  return {
    blob: new Blob([encodeWav(rendered)], { type: "audio/wav" }),
    durationSeconds,
    trimmed: decoded.duration > maxSeconds + 0.05,
  };
}

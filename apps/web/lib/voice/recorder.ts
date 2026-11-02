import { DICTATION_SAMPLE_RATE, MAX_DICTATION_SECONDS } from "./protocol";

/**
 * Records the microphone as raw PCM and hands back a WAV clip in the one
 * format Muse Voice Transcribe accepts: mono, 16-bit, 16 kHz. MediaRecorder
 * would give us Opus in WebM, which the server has no decoder for, so the
 * samples are captured with the Web Audio API instead.
 */

export type Recording = {
  wav: Blob;
  durationMs: number;
  /** Loudest moment, 0 to 1. Near zero means the microphone heard nothing. */
  peakLevel: number;
};

export type Recorder = {
  /** Stops the microphone and returns what it heard. */
  stop(): Promise<Recording>;
  /** Stops the microphone and throws the audio away. */
  cancel(): void;
};

export function isDictationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window.AudioContext === "function"
  );
}

/** Copies each block of input samples to the main thread, where they are kept. */
const CAPTURE_PROCESSOR = "westride-dictation-capture";
const CAPTURE_WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      const copy = new Float32Array(channel);
      this.port.postMessage(copy, [copy.buffer]);
    }
    return true;
  }
}
registerProcessor(${JSON.stringify(CAPTURE_PROCESSOR)}, Capture);
`;

/** Script-processor block size when the worklet is unavailable. */
const FALLBACK_BLOCK = 4096;

function createContext(): AudioContext {
  try {
    return new AudioContext({ sampleRate: DICTATION_SAMPLE_RATE });
  } catch {
    // Older Safari ignores or rejects the rate; the clip is resampled on stop.
    return new AudioContext();
  }
}

function peakOf(block: Float32Array): number {
  let peak = 0;
  for (let index = 0; index < block.length; index += 1) {
    const magnitude = Math.abs(block[index] ?? 0);
    if (magnitude > peak) {
      peak = magnitude;
    }
  }
  return peak;
}

function concat(blocks: Float32Array[], total: number): Float32Array<ArrayBuffer> {
  const merged = new Float32Array(total);
  let offset = 0;
  for (const block of blocks) {
    merged.set(block, offset);
    offset += block.length;
  }
  return merged;
}

async function resample(
  samples: Float32Array<ArrayBuffer>,
  from: number,
  to: number,
): Promise<Float32Array> {
  if (from === to || samples.length === 0) {
    return samples;
  }
  const length = Math.ceil((samples.length * to) / from);
  try {
    const offline = new OfflineAudioContext(1, length, to);
    const buffer = offline.createBuffer(1, samples.length, from);
    buffer.copyToChannel(samples, 0);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } catch {
    // Linear interpolation is good enough for speech when the browser cannot render offline.
    const ratio = from / to;
    const out = new Float32Array(length);
    for (let index = 0; index < length; index += 1) {
      const position = index * ratio;
      const low = Math.floor(position);
      const high = Math.min(low + 1, samples.length - 1);
      const mix = position - low;
      out[index] = (samples[low] ?? 0) * (1 - mix) + (samples[high] ?? 0) * mix;
    }
    return out;
  }
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/** RIFF/WAVE, one channel, 16-bit integer PCM. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Asks for the microphone and starts capturing. Call it from the click that
 * asked to dictate: browsers only grant the microphone, and only let audio
 * start, in response to a user gesture.
 */
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const context = createContext();
  // Counted at the rate the context actually runs, which may not be 16 kHz.
  const maxSamples = MAX_DICTATION_SECONDS * context.sampleRate;
  const blocks: Float32Array[] = [];
  let total = 0;
  let peak = 0;
  let stopped = false;

  const keep = (block: Float32Array) => {
    if (stopped || total >= maxSamples) {
      return;
    }
    const room = maxSamples - total;
    const kept = block.length > room ? block.subarray(0, room) : block;
    blocks.push(kept);
    total += kept.length;
    peak = Math.max(peak, peakOf(kept));
  };

  const source = context.createMediaStreamSource(stream);
  // Capture nodes only run while connected to the destination; the gain is
  // zero so the member never hears themselves.
  const sink = context.createGain();
  sink.gain.value = 0;
  sink.connect(context.destination);

  let capture: AudioWorkletNode | ScriptProcessorNode;
  try {
    const moduleUrl = URL.createObjectURL(
      new Blob([CAPTURE_WORKLET], { type: "application/javascript" }),
    );
    try {
      await context.audioWorklet.addModule(moduleUrl);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
    const worklet = new AudioWorkletNode(context, CAPTURE_PROCESSOR, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
    });
    worklet.port.onmessage = (event: MessageEvent<Float32Array>) => keep(event.data);
    capture = worklet;
  } catch {
    const processor = context.createScriptProcessor(FALLBACK_BLOCK, 1, 1);
    processor.onaudioprocess = (event) => keep(new Float32Array(event.inputBuffer.getChannelData(0)));
    capture = processor;
  }
  source.connect(capture);
  capture.connect(sink);
  await context.resume();

  const release = () => {
    stopped = true;
    source.disconnect();
    capture.disconnect();
    sink.disconnect();
    for (const track of stream.getTracks()) {
      track.stop();
    }
    void context.close().catch(() => undefined);
  };

  return {
    async stop() {
      if (stopped) {
        throw new Error("This recording was already stopped.");
      }
      const captured = context.sampleRate;
      release();
      const samples = await resample(concat(blocks, total), captured, DICTATION_SAMPLE_RATE);
      return {
        wav: encodeWav(samples, DICTATION_SAMPLE_RATE),
        durationMs: Math.round((samples.length / DICTATION_SAMPLE_RATE) * 1000),
        peakLevel: peak,
      };
    },
    cancel() {
      if (!stopped) {
        release();
      }
    },
  };
}

/**
 * AudioWorklet processor: captures Float32 audio → converts to Int16 PCM16.
 *
 * Posts PCM16 Int16Array to main thread every ~200ms (4800 samples at 24kHz).
 * Handles resampling if browser native sample rate differs from 24kHz.
 */

const TARGET_SAMPLE_RATE = 24000;
const CHUNK_SIZE = 4800; // 200ms at 24kHz

class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._buffer = new Float32Array(0);
    this._nativeSampleRate = options.processorOptions?.sampleRate || sampleRate;
    this._resampleRatio = this._nativeSampleRate / TARGET_SAMPLE_RATE;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0]; // Mono channel

    // Resample if needed
    let samples;
    if (Math.abs(this._resampleRatio - 1.0) < 0.01) {
      samples = channelData;
    } else {
      samples = this._resample(channelData);
    }

    // Append to buffer
    const newBuffer = new Float32Array(this._buffer.length + samples.length);
    newBuffer.set(this._buffer);
    newBuffer.set(samples, this._buffer.length);
    this._buffer = newBuffer;

    // Send chunks when we have enough
    while (this._buffer.length >= CHUNK_SIZE) {
      const chunk = this._buffer.slice(0, CHUNK_SIZE);
      this._buffer = this._buffer.slice(CHUNK_SIZE);

      // Float32 → Int16
      const pcm16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.port.postMessage({ pcm16: pcm16.buffer }, [pcm16.buffer]);
    }

    return true;
  }

  /**
   * Linear interpolation resampling from native rate to 24kHz.
   */
  _resample(input) {
    const outputLength = Math.round(input.length / this._resampleRatio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * this._resampleRatio;
      const srcFloor = Math.floor(srcIndex);
      const srcCeil = Math.min(srcFloor + 1, input.length - 1);
      const frac = srcIndex - srcFloor;
      output[i] = input[srcFloor] * (1 - frac) + input[srcCeil] * frac;
    }

    return output;
  }
}

registerProcessor("pcm-processor", PCMProcessor);

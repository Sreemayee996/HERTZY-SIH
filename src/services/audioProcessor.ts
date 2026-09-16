// Audio processing utility for acoustic extraction, WAV encoding, normalization, and Web Audio handling

export interface ClientAcoustics {
  pitchHz: number;
  pitchRange: string;
  pitchJitterPercent: number;
  energyRmsDb: number;
  spectralCentroidHz: number;
  pauseDurationMs: number;
  pauseFrequencyPerMin: number;
  durationSeconds: number;
}

export interface PreprocessedAudioResult {
  wavBase64: string;
  audioBuffer: AudioBuffer;
  acoustics: ClientAcoustics;
  durationSeconds: number;
  isEmptyOrSilent: boolean;
  peakAmplitude: number;
}

// Convert AudioBuffer to 16-bit PCM WAV base64 with fast chunked encoding and linear interpolation resampling
export function audioBufferToWavBase64(buffer: AudioBuffer, targetSampleRate: number = 16000): string {
  const numChannels = 1;
  const srcSampleRate = buffer.sampleRate;
  
  // Extract mono channel or downmix
  let srcData: Float32Array;
  if (buffer.numberOfChannels === 1) {
    srcData = buffer.getChannelData(0);
  } else {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    srcData = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      srcData[i] = (left[i] + right[i]) / 2;
    }
  }

  // Resample with linear interpolation if target sample rate differs
  let channelData: Float32Array;
  let sampleRate = srcSampleRate;

  if (targetSampleRate && targetSampleRate !== srcSampleRate) {
    sampleRate = targetSampleRate;
    const ratio = srcSampleRate / targetSampleRate;
    const newLength = Math.max(1, Math.round(srcData.length / ratio));
    channelData = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcPos = i * ratio;
      const index = Math.floor(srcPos);
      const frac = srcPos - index;
      const sample1 = srcData[Math.min(index, srcData.length - 1)];
      const sample2 = srcData[Math.min(index + 1, srcData.length - 1)];
      channelData[i] = sample1 + frac * (sample2 - sample1);
    }
  } else {
    channelData = srcData;
  }

  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = channelData.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM audio data (clamped 16-bit signed ints)
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  // Fast chunked base64 conversion (prevents browser UI thread freeze)
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000; // 32KB
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Unified Audio Preprocessor for both Upload & Microphone inputs
export function preprocessAudioBuffer(
  buffer: AudioBuffer,
  options: { targetSampleRate?: number; normalize?: boolean } = {}
): PreprocessedAudioResult {
  const targetSampleRate = options.targetSampleRate || 16000;
  const shouldNormalize = options.normalize !== false;
  const srcSampleRate = buffer.sampleRate;
  const totalSrcSamples = buffer.length;

  // 1. Extract mono or downmix
  let monoData: Float32Array;
  if (buffer.numberOfChannels === 1) {
    monoData = new Float32Array(buffer.getChannelData(0));
  } else {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    monoData = new Float32Array(totalSrcSamples);
    for (let i = 0; i < totalSrcSamples; i++) {
      monoData[i] = (left[i] + right[i]) / 2;
    }
  }

  // 2. Measure energy & check for silence/empty
  let peak = 0;
  let sumSquares = 0;
  for (let i = 0; i < monoData.length; i++) {
    const absVal = Math.abs(monoData[i]);
    if (absVal > peak) peak = absVal;
    sumSquares += monoData[i] * monoData[i];
  }

  const rms = monoData.length > 0 ? Math.sqrt(sumSquares / monoData.length) : 0;
  const durationSeconds = buffer.duration;
  const isEmptyOrSilent = durationSeconds < 0.3 || peak < 0.003 || rms < 0.001;

  // 3. Peak Normalization (scale to 0.88 headroom to avoid clipping while ensuring consistent levels)
  if (shouldNormalize && !isEmptyOrSilent && peak > 0.005) {
    const targetPeak = 0.88;
    const scale = Math.min(20.0, targetPeak / peak);
    for (let i = 0; i < monoData.length; i++) {
      monoData[i] = Math.max(-1, Math.min(1, monoData[i] * scale));
    }
  }

  // 4. Resample to standard targetSampleRate (16,000 Hz) using linear interpolation
  let resampledData: Float32Array;
  if (targetSampleRate && targetSampleRate !== srcSampleRate) {
    const ratio = srcSampleRate / targetSampleRate;
    const targetLength = Math.max(1, Math.round(monoData.length / ratio));
    resampledData = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
      const srcPos = i * ratio;
      const idx = Math.floor(srcPos);
      const frac = srcPos - idx;
      const s1 = monoData[Math.min(idx, monoData.length - 1)];
      const s2 = monoData[Math.min(idx + 1, monoData.length - 1)];
      resampledData[i] = s1 + frac * (s2 - s1);
    }
  } else {
    resampledData = monoData;
  }

  // 5. Create standardized AudioBuffer for UI playback & visualizer
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const normalizedBuffer = audioCtx.createBuffer(1, resampledData.length, targetSampleRate);
  normalizedBuffer.copyToChannel(resampledData, 0);

  // 6. Encode standardized 16-bit PCM WAV base64
  const wavBase64 = audioBufferToWavBase64(normalizedBuffer, targetSampleRate);

  // 7. Extract acoustic features deterministically
  const acoustics = extractAcousticFeatures(normalizedBuffer);

  return {
    wavBase64,
    audioBuffer: normalizedBuffer,
    acoustics,
    durationSeconds: Number(normalizedBuffer.duration.toFixed(2)),
    isEmptyOrSilent,
    peakAmplitude: peak,
  };
}

// Extract detailed acoustic indicators from an AudioBuffer
export function extractAcousticFeatures(buffer: AudioBuffer): ClientAcoustics {
  const rawData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const totalSamples = rawData.length;
  const duration = buffer.duration;

  // 1. RMS Energy
  let sumSquares = 0;
  for (let i = 0; i < totalSamples; i++) {
    sumSquares += rawData[i] * rawData[i];
  }
  const rms = totalSamples > 0 ? Math.sqrt(sumSquares / totalSamples) || 0.0001 : 0.0001;
  const rawDb = 20 * Math.log10(rms);
  const energyRmsDb = Number.isFinite(rawDb) ? Math.max(-80, Math.min(0, rawDb)) : -20;

  // 2. Pitch estimation via Auto-Correlation on 2048-sample windows
  const frameSize = 2048;
  const hopSize = 1024;
  const pitches: number[] = [];

  const minPeriod = Math.floor(sampleRate / 400); // 400 Hz max
  const maxPeriod = Math.floor(sampleRate / 70); // 70 Hz min

  if (totalSamples >= frameSize) {
    for (let offset = 0; offset + frameSize < totalSamples; offset += hopSize) {
      let frameRms = 0;
      for (let j = 0; j < frameSize; j++) {
        frameRms += rawData[offset + j] * rawData[offset + j];
      }
      frameRms = Math.sqrt(frameRms / frameSize);

      // Only estimate pitch if frame has voiced energy
      if (frameRms > 0.02) {
        let bestCorrelation = -1;
        let bestLag = -1;

        for (let lag = minPeriod; lag <= maxPeriod; lag++) {
          let corr = 0;
          for (let i = 0; i < frameSize - lag; i++) {
            corr += rawData[offset + i] * rawData[offset + i + lag];
          }
          if (corr > bestCorrelation) {
            bestCorrelation = corr;
            bestLag = lag;
          }
        }

        if (bestLag > 0 && bestCorrelation > 0.3) {
          const pitch = sampleRate / bestLag;
          if (pitch >= 75 && pitch <= 350) {
            pitches.push(pitch);
          }
        }
      }
    }
  }

  const avgPitch = pitches.length > 0
    ? pitches.reduce((a, b) => a + b, 0) / pitches.length
    : 145;

  const minPitch = pitches.length > 0 ? Math.min(...pitches) : 110;
  const maxPitch = pitches.length > 0 ? Math.max(...pitches) : 220;

  // Jitter calculation (relative cycle-to-cycle frequency variation)
  let jitterSum = 0;
  if (pitches.length > 1) {
    for (let i = 1; i < pitches.length; i++) {
      jitterSum += Math.abs(pitches[i] - pitches[i - 1]);
    }
  }
  const rawJitter = pitches.length > 1 && avgPitch > 0
    ? (jitterSum / (pitches.length - 1) / avgPitch) * 100
    : 1.2;
  const pitchJitterPercent = Number.isFinite(rawJitter) ? Number(rawJitter.toFixed(2)) : 1.2;

  // 3. Pause analysis (Silence detection)
  const silenceThreshold = 0.015;
  const windowMs = 50;
  const samplesPerWindow = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const pauseIntervals: number[] = [];
  let currentSilenceMs = 0;

  for (let i = 0; i < totalSamples; i += samplesPerWindow) {
    let subSum = 0;
    const count = Math.min(samplesPerWindow, totalSamples - i);
    if (count <= 0) break;
    for (let j = 0; j < count; j++) {
      subSum += Math.abs(rawData[i + j]);
    }
    const subAvg = subSum / count;

    if (subAvg < silenceThreshold) {
      currentSilenceMs += windowMs;
    } else {
      if (currentSilenceMs >= 150) {
        pauseIntervals.push(currentSilenceMs);
      }
      currentSilenceMs = 0;
    }
  }
  if (currentSilenceMs >= 150) {
    pauseIntervals.push(currentSilenceMs);
  }

  const totalPauses = pauseIntervals.length;
  const avgPauseDuration = totalPauses > 0
    ? pauseIntervals.reduce((a, b) => a + b, 0) / totalPauses
    : 320;
  const rawPauseFreq = (duration > 0 && Number.isFinite(duration))
    ? (totalPauses / duration) * 60
    : 14;
  const pauseFrequencyPerMin = Number.isFinite(rawPauseFreq) ? Number(rawPauseFreq.toFixed(1)) : 14;

  // 4. Spectral Centroid approximation
  let zcr = 0;
  for (let i = 1; i < totalSamples; i++) {
    if ((rawData[i] >= 0 && rawData[i - 1] < 0) || (rawData[i] < 0 && rawData[i - 1] >= 0)) {
      zcr++;
    }
  }
  const zcrRate = totalSamples > 0 ? zcr / totalSamples : 0.1;
  const rawCentroid = Math.round(zcrRate * (sampleRate / 2));
  const spectralCentroidHz = Number.isFinite(rawCentroid) && rawCentroid > 0 ? rawCentroid : 2100;

  return {
    pitchHz: Number.isFinite(avgPitch) ? Math.round(avgPitch) : 145,
    pitchRange: `${Number.isFinite(minPitch) ? Math.round(minPitch) : 110}Hz - ${Number.isFinite(maxPitch) ? Math.round(maxPitch) : 220}Hz`,
    pitchJitterPercent: Number.isFinite(pitchJitterPercent) ? pitchJitterPercent : 1.2,
    energyRmsDb: Number.isFinite(energyRmsDb) ? Number(energyRmsDb.toFixed(1)) : -20.0,
    spectralCentroidHz,
    pauseDurationMs: Number.isFinite(avgPauseDuration) ? Math.round(avgPauseDuration) : 320,
    pauseFrequencyPerMin,
    durationSeconds: Number.isFinite(duration) ? Number(duration.toFixed(1)) : 0,
  };
}

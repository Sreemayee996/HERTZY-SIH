import { audioBufferToWavBase64 } from "../services/audioProcessor";

export interface SampleScenario {
  id: string;
  title: string;
  category: "Deepfake Scam" | "Legitimate Call" | "Urgent Threat" | "Suspicious Extortion";
  riskTier: "High (80-100)" | "Elevated (60-80)" | "Very Low (0-20)";
  duration: string;
  description: string;
  speaker: string;
  expectedRiskScore: number;
  syntheticProbability: number;
  transcriptPreview: string;
  generateAudio: () => Promise<{ base64: string; buffer: AudioBuffer }>;
}

// Generates high-fidelity synthetic vocalized acoustic signals (with formant filters + harmonic speech rhythms)
async function createSyntheticAcousticBuffer(
  type: "deepfake_urgent" | "irs_threat" | "otp_trap" | "legit_support" | "casual_friendly"
): Promise<{ base64: string; buffer: AudioBuffer }> {
  const sampleRate = 22050;
  const durationSeconds = 8;
  const numSamples = sampleRate * durationSeconds;

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate,
  });
  const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const data = audioBuffer.getChannelData(0);

  // Fundamental frequency baseline & formant parameters
  let f0 = 140;
  let roboticGlitch = false;
  let jitterRate = 0.005;

  if (type === "deepfake_urgent") {
    f0 = 185;
    roboticGlitch = true;
    jitterRate = 0.035;
  } else if (type === "irs_threat") {
    f0 = 195;
    roboticGlitch = true;
    jitterRate = 0.042;
  } else if (type === "otp_trap") {
    f0 = 160;
    roboticGlitch = true;
    jitterRate = 0.025;
  } else if (type === "legit_support") {
    f0 = 145;
    roboticGlitch = false;
    jitterRate = 0.008;
  } else {
    f0 = 135;
    roboticGlitch = false;
    jitterRate = 0.006;
  }

  // Generate speech-like phoneme bursts with rhythmic pauses
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Speech rhythm cadence (syllable envelope)
    const syllableCadence = Math.sin(2 * Math.PI * 4.2 * t);
    const wordPauseEnvelope = Math.sin(2 * Math.PI * 0.7 * t);
    const isSpeech = wordPauseEnvelope > -0.2 && syllableCadence > -0.3;

    if (!isSpeech) {
      // Room background acoustic floor
      data[i] = (Math.random() * 2 - 1) * 0.002;
      continue;
    }

    // Micro-pitch jitter & dynamic pitch contour
    const dynamicF0 = f0 + Math.sin(2 * Math.PI * 1.5 * t) * (roboticGlitch ? 3 : 25) +
      (Math.random() * 2 - 1) * f0 * jitterRate;

    // Formant harmonics (F1, F2, F3 simulating human vocal tract resonances)
    const fundamental = Math.sin(2 * Math.PI * dynamicF0 * t);
    const harmonic2 = 0.5 * Math.sin(2 * Math.PI * dynamicF0 * 2 * t);
    const harmonic3 = 0.3 * Math.sin(2 * Math.PI * dynamicF0 * 3 * t);
    const formantF1 = 0.4 * Math.sin(2 * Math.PI * 700 * t);
    const formantF2 = 0.2 * Math.sin(2 * Math.PI * 1800 * t);

    // Deepfake robotic artifact injection (spectral phase distortion)
    let artifact = 0;
    if (roboticGlitch) {
      // Periodic phase slip typical of neural vocoders
      artifact = (Math.sin(2 * Math.PI * 3400 * t) > 0.8 ? 0.08 : 0) +
                 Math.sign(Math.sin(2 * Math.PI * dynamicF0 * t)) * 0.04;
    }

    const rawSignal = (fundamental + harmonic2 + harmonic3 + formantF1 + formantF2 + artifact) * 0.22;
    data[i] = rawSignal;
  }

  const base64 = audioBufferToWavBase64(audioBuffer);
  return { base64, buffer: audioBuffer };
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: "sample_ceo_deepfake",
    title: "🚨 CEO Voice Clone Emergency Wire Scam",
    category: "Deepfake Scam",
    riskTier: "High (80-100)",
    duration: "8.0s",
    description: "Synthetic voice cloned CEO demanding emergency $250,000 vendor wire before 5 PM deadline.",
    speaker: "Cloned Executive Voice (Neural Vocoder)",
    expectedRiskScore: 92,
    syntheticProbability: 91.4,
    transcriptPreview: "Mark, this is David. We have an urgent acquisition closing. Wire $250,000 to the offshore escrow account immediately. Do not call my cell.",
    generateAudio: () => createSyntheticAcousticBuffer("deepfake_urgent"),
  },
  {
    id: "sample_irs_threat",
    title: "⚠️ IRS Enforcement Arrest Warrant Threat",
    category: "Urgent Threat",
    riskTier: "High (80-100)",
    duration: "8.0s",
    description: "Impersonation scam claiming federal arrest warrant unless instant crypto voucher payment is made.",
    speaker: "Scam Impersonator (High Coercion)",
    expectedRiskScore: 88,
    syntheticProbability: 86.8,
    transcriptPreview: "This is federal investigator James Cole. An arrest warrant is active under your tax ID. Settle the unpaid penalty within 15 minutes or marshals will be dispatched.",
    generateAudio: () => createSyntheticAcousticBuffer("irs_threat"),
  },
  {
    id: "sample_bank_otp",
    title: "💳 Bank Security 6-Digit OTP Extraction Trap",
    category: "Suspicious Extortion",
    riskTier: "Elevated (60-80)",
    duration: "8.0s",
    description: "Fraudster claiming debit card compromise to extract 6-digit one-time password.",
    speaker: "Financial Phishing Bot",
    expectedRiskScore: 76,
    syntheticProbability: 72.3,
    transcriptPreview: "Security alert: suspicious charge of $1,400 detected. To cancel this transaction, please read the 6-digit confirmation code sent to your mobile device now.",
    generateAudio: () => createSyntheticAcousticBuffer("otp_trap"),
  },
  {
    id: "sample_legit_support",
    title: "📞 Legitimate Bank Customer Support Call",
    category: "Legitimate Call",
    riskTier: "Very Low (0-20)",
    duration: "8.0s",
    description: "Genuine support agent answering a benign mobile app login & travel notification inquiry.",
    speaker: "Human Verified Representative",
    expectedRiskScore: 14,
    syntheticProbability: 4.8,
    transcriptPreview: "Hello, thank you for calling Premier Banking. I see your international travel note was placed successfully. Is there anything else I can help you with today?",
    generateAudio: () => createSyntheticAcousticBuffer("legit_support"),
  },
  {
    id: "sample_casual_chat",
    title: "☕ Colleague Casual Discussion",
    category: "Legitimate Call",
    riskTier: "Very Low (0-20)",
    duration: "8.0s",
    description: "Relaxed human conversation about project timelines with natural prosodic dynamics and pauses.",
    speaker: "Human Colleague",
    expectedRiskScore: 8,
    syntheticProbability: 3.1,
    transcriptPreview: "Hey Sarah, hope you're having a good morning. Just wanted to see if we're still meeting at two for the sprint review. Let me know when you're free!",
    generateAudio: () => createSyntheticAcousticBuffer("casual_friendly"),
  },
];

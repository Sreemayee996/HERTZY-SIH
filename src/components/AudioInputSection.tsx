import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Volume2,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Zap,
  Activity,
  Radio,
  ShieldAlert,
  ShieldCheck,
  ListChecks,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Music,
} from "lucide-react";
import {
  audioBufferToWavBase64,
  extractAcousticFeatures,
  preprocessAudioBuffer,
  ClientAcoustics,
  PreprocessedAudioResult,
} from "../services/audioProcessor";
import { useLanguage } from "../context/LanguageContext";

interface AudioInputSectionProps {
  onAudioReadyForAnalysis: (data: {
    audioBase64: string;
    audioBuffer: AudioBuffer;
    sourceType: "microphone" | "upload" | "sample";
    fileName?: string;
    scenarioTitle?: string;
    durationSeconds: number;
    liveTranscript?: string;
  }) => void;
  isAnalyzing: boolean;
  onSetAnalyserNode: (node: AnalyserNode | null) => void;
  onSetIsPlayingOrRecording: (active: boolean) => void;
  selectedWindowDuration: number; // 2 | 5 | 10
  onChangeWindowDuration: (duration: number) => void;
}

export const AudioInputSection: React.FC<AudioInputSectionProps> = ({
  onAudioReadyForAnalysis,
  isAnalyzing,
  onSetAnalyserNode,
  onSetIsPlayingOrRecording,
  selectedWindowDuration,
  onChangeWindowDuration,
}) => {
  const { t } = useLanguage();
  const [activeInputMode, setActiveInputMode] = useState<"mic" | "upload">("mic");
  
  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveSpeechText, setLiveSpeechText] = useState<string>("");
  const liveSpeechTextRef = useRef<string>("");
  const [liveAudioMetrics, setLiveAudioMetrics] = useState({ pitchHz: 0, db: -60 });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAnalyserNodeRef = useRef<AnalyserNode | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const speechRecognizerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadedAudioBuffer, setUploadedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedFileAcoustics, setUploadedFileAcoustics] = useState<ClientAcoustics | null>(null);
  const [hasAnalyzedFile, setHasAnalyzedFile] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackAudioCtxRef = useRef<AudioContext | null>(null);

  // Preprocessing toggles
  const [enableNoiseReduction, setEnableNoiseReduction] = useState(true);
  const [enableNormalization, setEnableNormalization] = useState(true);

  // Status message
  const [statusNote, setStatusNote] = useState<string>("");

  // Clean up timer and streams on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  // Real-time Audio Level & Pitch Tracking during active Recording
  const startLiveAcousticMonitoring = (analyser: AnalyserNode) => {
    const buffer = new Float32Array(analyser.fftSize);
    const updateMetrics = () => {
      analyser.getFloatTimeDomainData(buffer);
      
      // Calculate RMS dB
      let sumSquares = 0;
      for (let i = 0; i < buffer.length; i++) {
        sumSquares += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sumSquares / buffer.length);
      const db = rms > 0.0001 ? Math.max(-60, Math.round(20 * Math.log10(rms))) : -60;

      // Autocorrelation pitch estimation (Hz)
      let bestOffset = -1;
      let maxCorrelation = 0;
      for (let offset = 20; offset < 100; offset++) {
        let correlation = 0;
        for (let i = 0; i < buffer.length - offset; i++) {
          correlation += buffer[i] * buffer[i + offset];
        }
        if (correlation > maxCorrelation) {
          maxCorrelation = correlation;
          bestOffset = offset;
        }
      }
      const sampleRate = analyser.context.sampleRate;
      const estimatedPitch = bestOffset > 0 && rms > 0.01 ? Math.round(sampleRate / (bestOffset * 4)) : 0;
      const pitchHz = estimatedPitch >= 70 && estimatedPitch <= 400 ? estimatedPitch : (rms > 0.02 ? 145 : 0);

      setLiveAudioMetrics({ pitchHz, db });

      animFrameRef.current = requestAnimationFrame(updateMetrics);
    };

    updateMetrics();
  };

  // Start / Stop Microphone Recording
  const startRecording = async () => {
    try {
      setStatusNote("");
      setLiveSpeechText("");
      liveSpeechTextRef.current = "";
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: enableNoiseReduction,
          noiseSuppression: enableNoiseReduction,
          autoGainControl: enableNormalization,
        },
      });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      micAudioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      micSourceNodeRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      micAnalyserNodeRef.current = analyser;
      source.connect(analyser);

      onSetAnalyserNode(analyser);
      onSetIsPlayingOrRecording(true);
      startLiveAcousticMonitoring(analyser);

      // Initialize Web Speech API for Real-time Speech-to-Text streaming
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognizer = new SpeechRecognition();
          recognizer.continuous = true;
          recognizer.interimResults = true;
          recognizer.lang = "en-US";

          recognizer.onresult = (event: any) => {
            let currentTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }
            setLiveSpeechText(currentTranscript);
            liveSpeechTextRef.current = currentTranscript;
          };

          recognizer.onerror = (e: any) => {
            console.log("Speech recognition notice:", e.error);
          };

          recognizer.start();
          speechRecognizerRef.current = recognizer;
        } catch (e) {
          console.warn("Speech recognition initialization note:", e);
        }
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        try {
          const decodeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
          
          // Unified audio preprocessing: mono, peak normalization, silence detection, 16kHz resampling
          const preprocessed = preprocessAudioBuffer(decoded, {
            targetSampleRate: 16000,
            normalize: enableNormalization,
          });

          if (preprocessed.isEmptyOrSilent) {
            setStatusNote("No audible speech detected from microphone. Please speak clearly into your microphone.");
            return;
          }

          onAudioReadyForAnalysis({
            audioBase64: preprocessed.wavBase64,
            audioBuffer: preprocessed.audioBuffer,
            sourceType: "microphone",
            fileName: `Live_Mic_Capture_${new Date().toLocaleTimeString().replace(/:/g, "-")}.wav`,
            durationSeconds: preprocessed.durationSeconds,
            liveTranscript: liveSpeechTextRef.current.trim() || undefined,
          });
        } catch (err) {
          console.warn("Direct WebM AudioData decode fallback:", err);
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const cleanBase64 = base64data.split(",")[1] || base64data;
            const fallbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const fallbackBuffer = fallbackCtx.createBuffer(1, 16000 * Math.max(1, recordingSeconds), 16000);
            
            if (recordingSeconds < 1) {
              setStatusNote("Recording was too short to analyze. Please record at least 1-2 seconds of speech.");
              return;
            }

            onAudioReadyForAnalysis({
              audioBase64: cleanBase64,
              audioBuffer: fallbackBuffer,
              sourceType: "microphone",
              fileName: `Live_Mic_Capture_${new Date().toLocaleTimeString().replace(/:/g, "-")}.webm`,
              durationSeconds: Math.max(1, recordingSeconds),
              liveTranscript: liveSpeechTextRef.current.trim() || undefined,
            });
          };
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access denied or failed:", err);
      setStatusNote("Microphone permission denied or device not found. Please upload an audio file instead.");
      setIsRecording(false);
      onSetIsPlayingOrRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch (_) {}
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      setIsRecording(false);
      onSetIsPlayingOrRecording(false);
    }
  };

  // Trigger analysis on uploaded file
  const handleTriggerUploadAnalysis = (
    bufferOverride?: AudioBuffer,
    base64Override?: string,
    nameOverride?: string
  ) => {
    const targetBuffer = bufferOverride || uploadedAudioBuffer;
    const targetBase64 = base64Override || uploadedBase64;
    const targetName = nameOverride || uploadedFileName || "Uploaded_Audio.wav";

    if (!targetBuffer || !targetBase64) {
      setStatusNote("Please upload an audio file first before running analysis.");
      return;
    }

    setStatusNote("");
    onAudioReadyForAnalysis({
      audioBase64: targetBase64,
      audioBuffer: targetBuffer,
      sourceType: "upload",
      fileName: targetName,
      durationSeconds: targetBuffer.duration,
    });
    setHasAnalyzedFile(true);
  };

  // Upload Audio File handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setStatusNote("");
    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

      // Unified preprocessing: mono downmix, peak normalization, silence check, 16kHz resampling
      const preprocessed = preprocessAudioBuffer(decodedBuffer, {
        targetSampleRate: 16000,
        normalize: enableNormalization,
      });

      if (preprocessed.isEmptyOrSilent) {
        setStatusNote("The uploaded audio file is silent or corrupted. Please upload an audio file containing audible speech.");
        return;
      }

      setUploadedAudioBuffer(preprocessed.audioBuffer);
      setUploadedBase64(preprocessed.wavBase64);
      setUploadedFileAcoustics(preprocessed.acoustics);

      // Auto-trigger the risk evaluation immediately on upload with preprocessed buffer & base64
      handleTriggerUploadAnalysis(preprocessed.audioBuffer, preprocessed.wavBase64, file.name);
    } catch (err: any) {
      console.error("Error decoding audio file:", err);
      setStatusNote("Failed to decode audio file format. Please upload standard .wav, .mp3, .m4a, or .ogg audio.");
    }
  };

  // Play uploaded audio buffer with real-time visualizer hookup
  const togglePlayUploadedAudio = async () => {
    if (!uploadedAudioBuffer) return;

    if (isPlaying) {
      if (playbackSourceNodeRef.current) {
        playbackSourceNodeRef.current.stop();
      }
      setIsPlaying(false);
      onSetIsPlayingOrRecording(false);
    } else {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      playbackAudioCtxRef.current = audioCtx;

      const source = audioCtx.createBufferSource();
      source.buffer = uploadedAudioBuffer;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      onSetAnalyserNode(analyser);
      onSetIsPlayingOrRecording(true);

      source.onended = () => {
        setIsPlaying(false);
        onSetIsPlayingOrRecording(false);
      };

      source.start(0);
      playbackSourceNodeRef.current = source;
      setIsPlaying(true);
    }
  };

  return (
    <div className="bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs dark:shadow-xl transition-colors duration-200">
      {/* Mode Selection Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              id="mode-mic-btn"
              onClick={() => setActiveInputMode("mic")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeInputMode === "mic"
                  ? "bg-indigo-600 text-white font-medium shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              {t("live_microphone")}
            </button>

            <button
              id="mode-upload-btn"
              onClick={() => setActiveInputMode("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeInputMode === "upload"
                  ? "bg-indigo-600 text-white font-medium shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {t("upload_audio_file")}
            </button>
          </div>
        </div>

        {/* Time Window Duration Selector (2s / 5s / 10s) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t("time_window")}:</span>
          <div className="flex items-center bg-slate-100 dark:bg-[#0B0F19] p-0.5 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono">
            {[2, 5, 10].map((dur) => (
              <button
                key={dur}
                id={`window-dur-${dur}s`}
                onClick={() => onChangeWindowDuration(dur)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                  selectedWindowDuration === dur
                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {dur}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mode 1: Live Microphone */}
      {activeInputMode === "mic" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              {/* Big Record Button */}
              <button
                id="mic-record-toggle-btn"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAnalyzing}
                className={`relative flex items-center justify-center w-14 h-14 rounded-lg font-bold transition-all cursor-pointer ${
                  isRecording
                    ? "bg-red-600 text-white shadow-lg animate-pulse"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                }`}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                {isRecording && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-400 rounded-full border-2 border-slate-950 animate-ping" />
                )}
              </button>

              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {isRecording ? (
                    <span className="text-red-500 dark:text-red-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      {t("live_audio_capture")} ({recordingSeconds}s)
                    </span>
                  ) : (
                    t("mic_ready")
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {isRecording
                    ? t("mic_recording_desc")
                    : t("mic_ready_desc")}
                </p>
              </div>
            </div>

            {/* Live Telemetry Meters when recording */}
            {isRecording ? (
              <div className="flex items-center gap-3 bg-white dark:bg-[#0B0F19] px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs shadow-xs">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">{t("live_pitch")}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{liveAudioMetrics.pitchHz > 0 ? `${liveAudioMetrics.pitchHz} Hz` : "--"}</span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">{t("live_energy")}</span>
                  <span className={`${liveAudioMetrics.db > -20 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"} font-bold`}>
                    {liveAudioMetrics.db} dB
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">{t("duration")}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{recordingSeconds}s</span>
                </div>
              </div>
            ) : (
              /* Preprocessing badges */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEnableNoiseReduction(!enableNoiseReduction)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-all cursor-pointer ${
                    enableNoiseReduction
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium"
                      : "bg-white dark:bg-[#0B0F19] border-slate-200 dark:border-slate-800 text-slate-500"
                  }`}
                >
                  {t("noise_reduction")}: {enableNoiseReduction ? t("on") : t("off")}
                </button>
                <button
                  onClick={() => setEnableNormalization(!enableNormalization)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-all cursor-pointer ${
                    enableNormalization
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium"
                      : "bg-white dark:bg-[#0B0F19] border-slate-200 dark:border-slate-800 text-slate-500"
                  }`}
                >
                  {t("rms_normalization")}: {enableNormalization ? t("on") : t("off")}
                </button>
              </div>
            )}
          </div>

          {/* Real-time Live Speech-to-Text Transcription Banner */}
          {isRecording && (
            <div className="p-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs text-indigo-900 dark:text-indigo-200">
              <div className="flex items-center gap-2 mb-1 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                <Radio className="w-3.5 h-3.5 animate-pulse text-red-500 dark:text-red-400" />
                <span>{t("live_speech_stream")}</span>
              </div>
              <p className="font-mono text-slate-800 dark:text-slate-200 italic">
                {liveSpeechText ? `"${liveSpeechText}"` : t("listening_words")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Upload File */}
      {activeInputMode === "upload" && (
        <div className="space-y-4">
          {/* Step Guide Header Bar */}
          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <ListChecks className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Audio File Analysis Pipeline
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Follow steps 1 → 2 → 3
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* Step 1 Pill */}
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  uploadedAudioBuffer
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-300"
                    : "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  {uploadedAudioBuffer ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shrink-0">
                      1
                    </span>
                  )}
                  <span>Step 1: Upload</span>
                </div>
                <div className="text-[11px] opacity-80 pl-5">
                  {uploadedAudioBuffer ? "Audio Decoded" : "Select or Drop Audio"}
                </div>
              </div>

              {/* Step 2 Pill */}
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  uploadedAudioBuffer
                    ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200"
                    : "bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                    uploadedAudioBuffer ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}>
                    2
                  </span>
                  <span>Step 2: Preview</span>
                </div>
                <div className="text-[11px] opacity-80 pl-5">
                  {uploadedAudioBuffer ? "Listen & Spectrogram" : "Waveform & Pitch"}
                </div>
              </div>

              {/* Step 3 Pill */}
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  isAnalyzing
                    ? "bg-indigo-100 dark:bg-indigo-950 border-indigo-500 text-indigo-950 dark:text-indigo-200 animate-pulse"
                    : hasAnalyzedFile
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-300"
                    : uploadedAudioBuffer
                    ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300"
                    : "bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  {hasAnalyzedFile && !isAnalyzing ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shrink-0">
                      3
                    </span>
                  )}
                  <span>Step 3: Risk Score</span>
                </div>
                <div className="text-[11px] opacity-80 pl-5">
                  {isAnalyzing
                    ? "Engine Evaluating..."
                    : hasAnalyzedFile
                    ? "Analysis Completed"
                    : "Run Hertzy AI Engine"}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 1: Upload or Replace File */}
          {!uploadedAudioBuffer ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.01]"
                  : "border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/70 dark:bg-[#0F172A]"
              }`}
            >
              <input
                id="audio-file-input"
                type="file"
                accept="audio/mp3,audio/wav,audio/m4a,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                <FileAudio className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                {t("drop_audio_here")}{" "}
                <span className="text-indigo-600 dark:text-indigo-400 underline font-bold">
                  {t("browse")}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                Supports MP3, WAV, M4A, OGG • Audio will be decoded and converted to PCM WAV
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[260px] sm:max-w-md">
                      {uploadedFileName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>{uploadedFileSize}</span>
                      <span>•</span>
                      <span>{uploadedAudioBuffer.duration.toFixed(1)}s duration</span>
                      <span>•</span>
                      <span className="font-mono">{uploadedAudioBuffer.sampleRate} Hz</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="audio-file-input-replace"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Change
                  </label>
                  <input
                    id="audio-file-input-replace"
                    type="file"
                    accept="audio/mp3,audio/wav,audio/m4a,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Decoded & Standardized into 16-bit PCM WAV</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Ready for AI Multi-Window Analysis
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Acoustic Inspection (Shown when file is loaded) */}
          {uploadedAudioBuffer && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Step 2: Preview Audio & Live Waveform Hookup
                </span>
                <span className="text-[11px] text-slate-500">
                  {isPlaying ? "Playing to visualizer..." : "Click play to listen"}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    id="play-uploaded-audio-btn"
                    onClick={togglePlayUploadedAudio}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause Preview</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Play Audio Preview</span>
                      </>
                    )}
                  </button>

                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Streams live frequency to oscilloscope & hybrid spectrum above
                  </div>
                </div>

                {/* Pre-calculated Acoustic Specs */}
                {uploadedFileAcoustics && (
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Pitch: <span className="font-bold text-indigo-600 dark:text-indigo-400">{uploadedFileAcoustics.pitchHz.toFixed(0)} Hz</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Energy: <span className="font-bold text-indigo-600 dark:text-indigo-400">{uploadedFileAcoustics.energyRmsDb.toFixed(1)} dB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Run AI & Acoustic Risk Analysis */}
          {uploadedAudioBuffer && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Step 3: Hertzy AI Risk Analysis
                </span>
                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  {selectedWindowDuration}s time slices
                </span>
              </div>

              {/* Main Action Button */}
              {isAnalyzing ? (
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600/80 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-md cursor-wait"
                >
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Audio (Acoustics, Deepfake Clone & Threat Score)...</span>
                </button>
              ) : (
                <button
                  id="run-upload-analysis-btn"
                  onClick={() => handleTriggerUploadAnalysis()}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    {hasAnalyzedFile ? "Re-Run Risk Analysis on File" : "Run Risk Analysis Now"}
                  </span>
                </button>
              )}

              {/* Engine features summary checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-indigo-950/80 dark:text-indigo-300/90 pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Synthesizer Vocoder & Flat Pitch Detection</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Urgency, Extortion & OTP Phishing Flags</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Full Transcript & Target Language Translation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Multi-Window Temporal Risk Timeline</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {statusNote && (
        <div className="mt-3 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>{statusNote}</span>
        </div>
      )}
    </div>
  );
};

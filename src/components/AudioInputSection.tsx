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
} from "lucide-react";
import { audioBufferToWavBase64 } from "../services/audioProcessor";
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
          const cleanWavBase64 = audioBufferToWavBase64(decoded);
          
          onAudioReadyForAnalysis({
            audioBase64: cleanWavBase64,
            audioBuffer: decoded,
            sourceType: "microphone",
            fileName: `Live_Mic_Capture_${new Date().toLocaleTimeString().replace(/:/g, "-")}.wav`,
            durationSeconds: decoded.duration,
            liveTranscript: liveSpeechText || undefined,
          });
        } catch (err) {
          console.warn("Direct WebM AudioData decode fallback:", err);
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const cleanBase64 = base64data.split(",")[1] || base64data;
            const fallbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const fallbackBuffer = fallbackCtx.createBuffer(1, 22050 * Math.max(2, recordingSeconds), 22050);
            
            onAudioReadyForAnalysis({
              audioBase64: cleanBase64,
              audioBuffer: fallbackBuffer,
              sourceType: "microphone",
              fileName: `Live_Mic_Capture_${new Date().toLocaleTimeString().replace(/:/g, "-")}.webm`,
              durationSeconds: Math.max(2, recordingSeconds),
              liveTranscript: liveSpeechText || undefined,
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
      setUploadedAudioBuffer(decodedBuffer);

      // Convert file to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const cleanBase64 = base64data.split(",")[1] || base64data;
        setUploadedBase64(cleanBase64);

        onAudioReadyForAnalysis({
          audioBase64: cleanBase64,
          audioBuffer: decodedBuffer,
          sourceType: "upload",
          fileName: file.name,
          durationSeconds: decodedBuffer.duration,
        });
      };
    } catch (err: any) {
      console.error("Error decoding audio file:", err);
      setStatusNote("Failed to decode audio file format. Please upload standard .wav or .mp3 audio.");
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
        <div className="space-y-3">
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
            className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all ${
              isDragging
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                : "border-slate-300 dark:border-slate-800 hover:border-indigo-500 bg-slate-50 dark:bg-[#0F172A]"
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

            <FileAudio className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-2" />
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("drop_audio_here")} <span className="text-indigo-600 dark:text-indigo-400 underline">{t("browse")}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("supports_formats")}
            </p>
          </div>

          {/* Uploaded File Info & Playback Bar */}
          {uploadedFileName && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  id="play-uploaded-audio-btn"
                  onClick={togglePlayUploadedAudio}
                  className="p-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer shadow-xs"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200">{uploadedFileName}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {uploadedFileSize} • {uploadedAudioBuffer ? `${uploadedAudioBuffer.duration.toFixed(1)}s duration` : "Processing..."}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono text-[11px] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("decoded_ready")}
                </span>
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

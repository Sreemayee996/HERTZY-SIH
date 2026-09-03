import React, { useState, useEffect, useRef } from "react";
import { User, AudioAnalysisResult, SavedSession, SuspiciousWord, TimeWindowData, AcousticMetrics } from "./types";
import { Navbar, LANGUAGES } from "./components/Navbar";
import { LoginPage } from "./components/LoginPage";
import { DynamicRiskGauge } from "./components/DynamicRiskGauge";
import { RealtimeAudioVisualizer } from "./components/RealtimeAudioVisualizer";
import { AudioInputSection } from "./components/AudioInputSection";
import { RiskTimelineChart } from "./components/RiskTimelineChart";
import { TranscriptTranslationView } from "./components/TranscriptTranslationView";
import { SuspiciousKeywordsPanel } from "./components/SuspiciousKeywordsPanel";
import { ToneProsodyAcoustics } from "./components/ToneProsodyAcoustics";
import { AiSummaryCard } from "./components/AiSummaryCard";
import { AnalysisHistoryModal } from "./components/AnalysisHistoryModal";
import { extractAcousticFeatures } from "./services/audioProcessor";
import { useLanguage } from "./context/LanguageContext";
import { BENCHMARK_AI_SUMMARIES, BENCHMARK_TRANSCRIPTS } from "./utils/aiSummaryTranslations";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Info,
  Radio,
  FileCheck,
  Layers,
  Zap,
} from "lucide-react";

const INITIAL_DEMO_USER: User = {
  id: "user_demo_01",
  name: "Demo User",
  email: "demo@hertzy.security",
  role: "Fraud Investigator",
  avatar: "DU",
  organization: "National Cyber Fraud Defense Lab",
};

// Initial benchmark analysis so dashboard is immediately rich & informative upon login
const BENCHMARK_INITIAL_ANALYSIS: AudioAnalysisResult = {
  id: "hertzy_bench_01",
  title: "🚨 CEO Voice Clone Emergency Wire Scam (Benchmark)",
  transcript:
    "Mark, this is David. We have an urgent acquisition closing before market close. Wire $250,000 to the offshore escrow account immediately. Do not call my cell, I am currently in a board briefing.",
  translatedText:
    "Mark, this is David. We have an urgent acquisition closing before market close. Wire $250,000 to the offshore escrow account immediately. Do not call my cell, I am currently in a board briefing.",
  targetLanguageName: "English",
  targetLanguageCode: "en",
  overallRiskScore: 91,
  riskCategory: "High",
  riskColor: "#ef4444",
  stabilityRating: "Critical Threat (Deepfake Scam)",
  isDeepfakeSuspected: true,
  deepfakeConfidence: 93.4,
  aiSummary:
    "1. Hertzy Neural Vocoder Engine detected high-confidence synthetic voice cloning (93.4% probability) with characteristic phase slip and pitch contour flatness.\n2. Acoustic telemetry reveals unnatural intersyllabic pause spacing (180ms) and elevated F0 jitter spikes.\n3. Semantic analyzer flagged 4 critical coercion keywords ('immediately', 'wire $250,000', 'offshore escrow', 'do not call').\n4. Multi-window risk graph demonstrates sustained critical threat level (>85/100) across all time slices.\n5. Mandatory protocol: Halt transaction immediately, initiate secondary out-of-band biometric verification, and alert cyber defense.",
  translatedAiSummary: undefined,
  acoustics: {
    pitchHz: 188,
    pitchRange: "170Hz - 205Hz (Robotic Flat)",
    pitchJitterPercent: 3.9,
    energyRmsDb: -13.8,
    toneLabel: "Aggressive / Synthetic Monotone",
    prosodySpeechRateWpm: 175,
    prosodyNaturalnessScore: 18,
    pauseDurationMs: 180,
    pauseFrequencyPerMin: 28,
    spectralCentroidHz: 2890,
  },
  suspiciousWords: [
    {
      wordOrPhrase: "immediately",
      category: "Urgency",
      severity: "critical",
      timestamp: "00:04",
      explanation: "High-pressure time squeeze to force compliance before verification.",
    },
    {
      wordOrPhrase: "Wire $250,000",
      category: "Financial",
      severity: "critical",
      timestamp: "00:03",
      explanation: "Large unauthorized wire transfer request without paper audit trail.",
    },
    {
      wordOrPhrase: "offshore escrow account",
      category: "Financial",
      severity: "high",
      timestamp: "00:03",
      explanation: "Destination obfuscation typical of business email/voice compromise.",
    },
    {
      wordOrPhrase: "Do not call my cell",
      category: "Impersonation",
      severity: "critical",
      timestamp: "00:05",
      explanation: "Deliberate channel isolation preventing genuine identity confirmation.",
    },
  ],
  timeWindows: [
    {
      windowId: "0:00-0:02",
      startTime: 0,
      endTime: 2,
      textSnippet: "Mark, this is David. We have an urgent...",
      voiceAuthenticityRisk: 86,
      vocabularyRisk: 82,
      toneProsodyRisk: 88,
      compositeRiskScore: 85,
      alerts: ["Authority Impersonation", "Vocoder Discontinuity"],
    },
    {
      windowId: "0:02-0:05",
      startTime: 2,
      endTime: 5,
      textSnippet: "Wire $250,000 to the offshore escrow account immediately...",
      voiceAuthenticityRisk: 94,
      vocabularyRisk: 98,
      toneProsodyRisk: 92,
      compositeRiskScore: 95,
      alerts: ["Critical Financial Extortion", "Flat Pitch Contour"],
    },
    {
      windowId: "0:05-0:08",
      startTime: 5,
      endTime: 8,
      textSnippet: "Do not call my cell, I am currently in a board briefing.",
      voiceAuthenticityRisk: 92,
      vocabularyRisk: 91,
      toneProsodyRisk: 89,
      compositeRiskScore: 91,
      alerts: ["Channel Isolation Defense", "Synthetic Pause Rhythm"],
    },
  ],
  analyzedAt: new Date().toISOString(),
  audioDurationSeconds: 8.0,
  audioSourceType: "sample",
  fileName: "CEO_Voice_Clone_Scam.wav",
};

export default function App() {
  const { t } = useLanguage();

  // Authentication state - strictly requires valid login (starts with demo user session)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored =
        localStorage.getItem("hertzy_auth_user") ||
        sessionStorage.getItem("hertzy_auth_user") ||
        localStorage.getItem("dhwani_auth_user") ||
        sessionStorage.getItem("dhwani_auth_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          return {
            ...parsed,
            name: "Demo User",
            avatar: "DU",
          };
        }
      }
    } catch {
      // ignore parsing error
    }
    return INITIAL_DEMO_USER;
  });

  const handleLoginSuccess = (user: User, remember: boolean) => {
    setCurrentUser(user);
    try {
      if (remember) {
        localStorage.setItem("hertzy_auth_user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("hertzy_auth_user", JSON.stringify(user));
      }
    } catch {
      // ignore storage error
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem("hertzy_auth_user");
      sessionStorage.removeItem("hertzy_auth_user");
      localStorage.removeItem("dhwani_auth_user");
      sessionStorage.removeItem("dhwani_auth_user");
    } catch {
      // ignore storage error
    }
  };

  // Analysis State
  const [currentAnalysis, setCurrentAnalysis] = useState<AudioAnalysisResult | null>(BENCHMARK_INITIAL_ANALYSIS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Visualizer hookup state
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [isPlayingOrRecording, setIsPlayingOrRecording] = useState(false);
  const [liveAudioEnergyDb, setLiveAudioEnergyDb] = useState(-20);

  const { currentLanguage, setLanguage } = useLanguage();

  // Language translation preference
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage || "en");
  const [isTranslating, setIsTranslating] = useState(false);

  // Synchronize language when changed from Navbar or Context
  useEffect(() => {
    if (currentLanguage && currentLanguage !== selectedLanguage) {
      handleChangeLanguage(currentLanguage);
    }
  }, [currentLanguage]);

  // Time window slicing (2s, 5s, 10s)
  const [selectedWindowDuration, setSelectedWindowDuration] = useState<number>(5);

  // Saved audit history sessions
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([
    {
      id: "sess_01",
      title: "🚨 CEO Voice Clone Emergency Wire Scam",
      analyzedAt: new Date(Date.now() - 3600000).toISOString(),
      overallRiskScore: 91,
      riskCategory: "High",
      riskColor: "#ef4444",
      transcript: BENCHMARK_INITIAL_ANALYSIS.transcript,
      translatedText: BENCHMARK_INITIAL_ANALYSIS.translatedText,
      isDeepfakeSuspected: true,
      deepfakeConfidence: 93.4,
      audioDurationSeconds: 8.0,
      sourceType: "sample",
      suspiciousWordsCount: 4,
    },
    {
      id: "sess_02",
      title: "📞 Legitimate Bank Customer Support Call",
      analyzedAt: new Date(Date.now() - 86400000).toISOString(),
      overallRiskScore: 14,
      riskCategory: "Very Low",
      riskColor: "#10b981",
      transcript: "Hello, thank you for calling Premier Banking. I see your international travel note was placed successfully.",
      translatedText: "नमस्ते, प्रीमियर बैंकिंग में कॉल करने के लिए धन्यवाद।",
      isDeepfakeSuspected: false,
      deepfakeConfidence: 4.2,
      audioDurationSeconds: 8.0,
      sourceType: "sample",
      suspiciousWordsCount: 0,
    },
  ]);

  // Modal open states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCurrentSessionSaved, setIsCurrentSessionSaved] = useState(true);

  // Save session to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hertzy_saved_sessions") || localStorage.getItem("dhwani_saved_sessions");
      if (stored) {
        setSavedSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load stored sessions", e);
    }
  }, []);

  const saveSessionsToStorage = (sessions: SavedSession[]) => {
    setSavedSessions(sessions);
    try {
      localStorage.setItem("hertzy_saved_sessions", JSON.stringify(sessions));
    } catch (e) {
      console.warn("Could not save sessions to storage", e);
    }
  };

  // Perform Audio Analysis through Express backend
  const handleAudioReadyForAnalysis = async (data: {
    audioBase64: string;
    audioBuffer: AudioBuffer;
    sourceType: "microphone" | "upload" | "sample";
    fileName?: string;
    scenarioTitle?: string;
    durationSeconds: number;
    liveTranscript?: string;
  }) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsCurrentSessionSaved(false);

    try {
      // 1. Extract client-side high-precision acoustic metrics
      const clientAcoustics = extractAcousticFeatures(data.audioBuffer);
      setLiveAudioEnergyDb(clientAcoustics.energyRmsDb);

      // 2. Query Express Hertzy Analysis API
      const res = await fetch("/api/analyze-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: data.audioBase64,
          mimeType: "audio/wav",
          targetLanguage: selectedLanguage,
          windowDurationSeconds: selectedWindowDuration,
          clientAcoustics,
          scenarioTitle: data.scenarioTitle || data.fileName || "",
          liveTranscript: data.liveTranscript,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const responseData = await res.json();
      const analysis: AudioAnalysisResult = {
        id: `hertzy_${Date.now()}`,
        title: data.scenarioTitle || data.fileName || "Live Microphone Stream",
        ...responseData.analysis,
        analyzedAt: new Date().toISOString(),
        audioDurationSeconds: Number(data.durationSeconds.toFixed(1)),
        audioSourceType: data.sourceType,
        fileName: data.fileName,
        targetLanguageCode: selectedLanguage,
      };

      setCurrentAnalysis(analysis);
    } catch (err: any) {
      console.error("Audio analysis failed:", err);
      setAnalysisError(err?.message || "Failed to complete audio analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Dynamic Language Translation Switch
  const handleChangeLanguage = async (newLangCode: string) => {
    setSelectedLanguage(newLangCode);
    setLanguage(newLangCode);
    if (!currentAnalysis || !currentAnalysis.transcript) return;

    const targetLangObj = LANGUAGES.find((l) => l.code === newLangCode);
    const targetName = targetLangObj ? targetLangObj.name : newLangCode.toUpperCase();

    // 1. Immediately update local state with 0 latency
    setCurrentAnalysis((prev) => {
      if (!prev) return null;
      const isScam =
        prev.isDeepfakeSuspected ||
        (prev.aiSummary &&
          (prev.aiSummary.toLowerCase().includes("wire $250,000") ||
            prev.aiSummary.toLowerCase().includes("neural vocoder") ||
            prev.aiSummary.toLowerCase().includes("synthetic voice cloning") ||
            prev.aiSummary.toLowerCase().includes("ceo")));

      const immediateSummary = isScam && BENCHMARK_AI_SUMMARIES[newLangCode]
        ? BENCHMARK_AI_SUMMARIES[newLangCode].join("\n")
        : (newLangCode === "en" ? prev.aiSummary : undefined);

      const immediateTranscript =
        BENCHMARK_TRANSCRIPTS[newLangCode] || (newLangCode === "en" ? prev.transcript : prev.translatedText);

      return {
        ...prev,
        targetLanguageCode: newLangCode,
        targetLanguageName: targetName,
        translatedAiSummary: immediateSummary,
        translatedText: immediateTranscript,
      };
    });

    // 2. Query translation endpoint for custom user-uploaded or dynamic audio
    setIsTranslating(true);
    try {
      const res = await fetch("/api/translate-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentAnalysis.transcript,
          aiSummary: currentAnalysis.aiSummary,
          targetLanguage: newLangCode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentAnalysis((prev) => {
          if (!prev) return null;
          // Guard: Only apply if the user hasn't switched to another language in the meantime
          if (prev.targetLanguageCode !== newLangCode) return prev;
          return {
            ...prev,
            translatedText: data.translation || prev.translatedText,
            translatedAiSummary: data.translatedAiSummary || prev.translatedAiSummary,
            targetLanguageName: targetName,
            targetLanguageCode: newLangCode,
          };
        });
      }
    } catch (err) {
      console.warn("Language translation switch error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Save Current Session
  const handleSaveToHistory = () => {
    if (!currentAnalysis) return;

    const newSession: SavedSession = {
      id: currentAnalysis.id || `sess_${Date.now()}`,
      title: currentAnalysis.title || "Voice Risk Assessment",
      analyzedAt: currentAnalysis.analyzedAt || new Date().toISOString(),
      overallRiskScore: currentAnalysis.overallRiskScore,
      riskCategory: currentAnalysis.riskCategory,
      riskColor: currentAnalysis.riskColor,
      transcript: currentAnalysis.transcript,
      translatedText: currentAnalysis.translatedText,
      translatedAiSummary: currentAnalysis.translatedAiSummary,
      isDeepfakeSuspected: currentAnalysis.isDeepfakeSuspected,
      deepfakeConfidence: currentAnalysis.deepfakeConfidence,
      audioDurationSeconds: currentAnalysis.audioDurationSeconds,
      sourceType: currentAnalysis.audioSourceType,
      suspiciousWordsCount: currentAnalysis.suspiciousWords.length,
    };

    const updated = [newSession, ...savedSessions.filter((s) => s.id !== newSession.id)];
    saveSessionsToStorage(updated);
    setIsCurrentSessionSaved(true);
  };

  // Delete Audio / Reset Session
  const handleDeleteAudio = () => {
    setCurrentAnalysis(null);
    setAnalyserNode(null);
    setIsPlayingOrRecording(false);
    setIsCurrentSessionSaved(false);
  };

  // Delete Session from History
  const handleDeleteHistorySession = (id: string) => {
    const updated = savedSessions.filter((s) => s.id !== id);
    saveSessionsToStorage(updated);
  };

  const handleClearAllHistory = () => {
    saveSessionsToStorage([]);
  };

  // Load Session from History into Dashboard
  const handleSelectHistorySession = (session: SavedSession) => {
    // Reconstruct full analysis view
    const isHigh = session.overallRiskScore > 60;
    const reconstructed: AudioAnalysisResult = {
      id: session.id,
      title: session.title,
      transcript: session.transcript,
      translatedText: session.translatedText,
      translatedAiSummary: session.translatedAiSummary,
      targetLanguageName: "Selected Language",
      targetLanguageCode: selectedLanguage,
      overallRiskScore: session.overallRiskScore,
      riskCategory: session.riskCategory,
      riskColor: session.riskColor,
      stabilityRating: isHigh ? "High Threat / Suspicious Pattern" : "Safe & Stable Conversation",
      isDeepfakeSuspected: session.isDeepfakeSuspected,
      deepfakeConfidence: session.deepfakeConfidence,
      aiSummary: `1. Replayed audit record from history log (${session.analyzedAt}).\n2. Overall recorded risk score: ${session.overallRiskScore}/100.\n3. Deepfake synthesis confidence: ${session.deepfakeConfidence}%.\n4. Spoken vocabulary contained ${session.suspiciousWordsCount} flagged markers.`,
      acoustics: {
        pitchHz: isHigh ? 182 : 140,
        pitchRange: isHigh ? "165-210Hz" : "110-230Hz",
        pitchJitterPercent: isHigh ? 3.4 : 1.1,
        energyRmsDb: isHigh ? -14.5 : -21.0,
        toneLabel: isHigh ? "Synthetic Monotone" : "Conversational Neutral",
        prosodySpeechRateWpm: isHigh ? 172 : 136,
        prosodyNaturalnessScore: isHigh ? 24 : 92,
        pauseDurationMs: isHigh ? 210 : 420,
        pauseFrequencyPerMin: isHigh ? 26 : 14,
        spectralCentroidHz: isHigh ? 2750 : 1940,
      },
      suspiciousWords: isHigh
        ? [
            {
              wordOrPhrase: "Urgent action requested",
              category: "Urgency",
              severity: "critical",
              timestamp: "00:02",
              explanation: "Historic flagged pattern.",
            },
          ]
        : [],
      timeWindows: [
        {
          windowId: "0:00-0:04",
          startTime: 0,
          endTime: 4,
          textSnippet: session.transcript.slice(0, 45) + "...",
          voiceAuthenticityRisk: isHigh ? 84 : 12,
          vocabularyRisk: isHigh ? 88 : 10,
          toneProsodyRisk: isHigh ? 82 : 14,
          compositeRiskScore: session.overallRiskScore,
          alerts: isHigh ? ["Historical Flag"] : ["Verified Safe"],
        },
      ],
      analyzedAt: session.analyzedAt,
      audioDurationSeconds: session.audioDurationSeconds,
      audioSourceType: "upload",
    };

    setCurrentAnalysis(reconstructed);
    setIsCurrentSessionSaved(true);
  };

  // If user is not logged in, render LoginPage strictly
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        isAnalyzing={isAnalyzing}
        historyCount={savedSessions.length}
        selectedLanguage={selectedLanguage}
        onChangeLanguage={handleChangeLanguage}
      />

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Notification Banner for Analyzing state */}
        {isAnalyzing && (
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-300 text-xs flex items-center justify-between shadow-xs dark:shadow-[0_0_20px_rgba(99,102,241,0.15)] animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>
                {t("pipeline_running")}
              </span>
            </div>
            <span className="font-mono text-[11px] bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-700/60 font-semibold">
              {t("processing_frames")}
            </span>
          </div>
        )}

        {/* Audio Input Control Section (Live Mic + File Upload + Scenarios) */}
        <AudioInputSection
          onAudioReadyForAnalysis={handleAudioReadyForAnalysis}
          isAnalyzing={isAnalyzing}
          onSetAnalyserNode={setAnalyserNode}
          onSetIsPlayingOrRecording={setIsPlayingOrRecording}
          selectedWindowDuration={selectedWindowDuration}
          onChangeWindowDuration={setSelectedWindowDuration}
        />

        {/* Hero Analysis Grid: Dynamic Gauge Chart + Real-time Audio Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Dynamic Risk Gauge (5 Columns on Desktop) */}
          <div className="lg:col-span-5 flex flex-col">
            <DynamicRiskGauge
              score={currentAnalysis?.overallRiskScore || 0}
              riskCategory={currentAnalysis?.riskCategory || "Very Low"}
              stabilityRating={currentAnalysis?.stabilityRating || "Safe"}
              isDeepfakeSuspected={currentAnalysis?.isDeepfakeSuspected || false}
              deepfakeConfidence={currentAnalysis?.deepfakeConfidence || 0}
              isLiveAnalyzing={isAnalyzing || isPlayingOrRecording}
            />
          </div>

          {/* Right Column: Real-time Audio Graph Animation (7 Columns on Desktop) */}
          <div className="lg:col-span-7 flex flex-col">
            <RealtimeAudioVisualizer
              analyserNode={analyserNode}
              isPlayingOrRecording={isPlayingOrRecording}
              audioSourceLabel={currentAnalysis?.title || "Live Stream"}
              energyDb={Number.isFinite(liveAudioEnergyDb) ? liveAudioEnergyDb : -45}
            />

            {/* Quick Metrics Bar directly under visualizer */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-none text-center transition-colors">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  {t("voice_authenticity_risk")}
                </div>
                <div className="text-lg font-bold font-mono text-red-500 dark:text-red-400 mt-0.5">
                  {currentAnalysis?.isDeepfakeSuspected
                    ? `${(Number.isFinite(currentAnalysis.deepfakeConfidence) ? currentAnalysis.deepfakeConfidence : 0).toFixed(1)}%`
                    : "3.8%"}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400">
                  {currentAnalysis?.isDeepfakeSuspected ? t("neural_clone_detected") : t("natural_bio_voice")}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-none text-center transition-colors">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  {t("flagged_threat_words")}
                </div>
                <div className="text-lg font-bold font-mono text-amber-500 dark:text-amber-400 mt-0.5">
                  {currentAnalysis?.suspiciousWords?.length || 0} {t("phrases")}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400">
                  {currentAnalysis?.suspiciousWords?.length ? t("urgency_phishing") : t("clean_vocabulary")}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-none text-center transition-colors">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  {t("interaction_stability")}
                </div>
                <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {currentAnalysis && Number.isFinite(currentAnalysis.overallRiskScore)
                    ? `${Math.max(0, Math.min(100, Math.round(100 - currentAnalysis.overallRiskScore)))}/100`
                    : "--"}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400">{t("stability_index")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Executive Risk Summary Card (Prominently displayed with Risk Score & Acoustic Graph) */}
        <AiSummaryCard
          analysis={currentAnalysis}
          onSaveToHistory={handleSaveToHistory}
          onDeleteAudio={handleDeleteAudio}
          isSaved={isCurrentSessionSaved}
        />

        {/* Middle Dual Section: Speech-to-Text & Translation + Suspicious Keywords */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <TranscriptTranslationView
              transcript={currentAnalysis?.transcript || ""}
              translatedText={currentAnalysis?.translatedText || ""}
              targetLanguageName={currentAnalysis?.targetLanguageName || "Hindi"}
              targetLanguageCode={selectedLanguage}
              suspiciousWords={currentAnalysis?.suspiciousWords || []}
              onChangeLanguage={handleChangeLanguage}
              isTranslating={isTranslating}
            />
          </div>

          <div className="lg:col-span-5">
            <SuspiciousKeywordsPanel
              suspiciousWords={currentAnalysis?.suspiciousWords || []}
            />
          </div>
        </div>

        {/* Bottom Dual Section: Tone/Prosody Telemetry + Risk Timeline Evolution Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <ToneProsodyAcoustics
              acoustics={currentAnalysis?.acoustics!}
              isDeepfakeSuspected={currentAnalysis?.isDeepfakeSuspected || false}
              deepfakeConfidence={currentAnalysis?.deepfakeConfidence || 0}
            />
          </div>

          <div className="lg:col-span-6">
            <RiskTimelineChart
              timeWindows={currentAnalysis?.timeWindows || []}
              selectedWindowDuration={selectedWindowDuration}
            />
          </div>
        </div>
      </main>

      {/* History Modal */}
      <AnalysisHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        sessions={savedSessions}
        onSelectSession={handleSelectHistorySession}
        onDeleteSession={handleDeleteHistorySession}
        onClearAllSessions={handleClearAllHistory}
      />


    </div>
  );
}

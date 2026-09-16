export interface User {
  id: string;
  name: string;
  email: string;
  role: "Chief Security Officer" | "Fraud Investigator" | "Compliance Auditor" | "Guest Evaluator";
  avatar: string;
  organization: string;
}

export type RiskCategory = "Very Low" | "Low" | "Moderate" | "Elevated" | "High";

export interface SuspiciousWord {
  wordOrPhrase: string;
  category: "Urgency" | "Financial" | "Impersonation" | "Threat" | "SyntheticArtifact" | string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  explanation: string;
}

export interface TimeWindowData {
  windowId: string;
  startTime: number;
  endTime: number;
  textSnippet: string;
  voiceAuthenticityRisk: number;
  vocabularyRisk: number;
  toneProsodyRisk: number;
  compositeRiskScore: number;
  alerts: string[];
}

export interface AcousticMetrics {
  pitchHz: number;
  pitchRange: string;
  pitchJitterPercent: number;
  energyRmsDb: number;
  toneLabel: string;
  prosodySpeechRateWpm: number;
  prosodyNaturalnessScore: number;
  pauseDurationMs: number;
  pauseFrequencyPerMin: number;
  spectralCentroidHz: number;
}

export interface AudioAnalysisResult {
  id: string;
  title: string;
  transcript: string;
  translatedText: string;
  targetLanguageName: string;
  targetLanguageCode: string;
  overallRiskScore: number;
  riskCategory: RiskCategory;
  riskColor: string;
  stabilityRating: string;
  isDeepfakeSuspected: boolean;
  deepfakeConfidence: number;
  aiSummary: string;
  translatedAiSummary?: string;
  acoustics: AcousticMetrics;
  suspiciousWords: SuspiciousWord[];
  timeWindows: TimeWindowData[];
  analyzedAt: string;
  audioDurationSeconds: number;
  audioSourceType: "microphone" | "upload" | "sample";
  fileName?: string;
}

export interface SavedSession {
  id: string;
  title: string;
  analyzedAt: string;
  overallRiskScore: number;
  riskCategory: RiskCategory;
  riskColor: string;
  transcript: string;
  translatedText: string;
  translatedAiSummary?: string;
  isDeepfakeSuspected: boolean;
  deepfakeConfidence: number;
  audioDurationSeconds: number;
  sourceType: string;
  suspiciousWordsCount: number;
}

export interface AnalysisRecord {
  time: string;
  userId: string;
  input: string;
  riskScore: number;
  result: string;
}

export interface AdminAnalysisLogEntry {
  id: string;
  userCode: string;
  timestamp: string;
  overallRiskScore: number;
  riskCategory: RiskCategory;
  isDeepfakeSuspected: boolean;
  audioSourceType: "microphone" | "upload" | "sample";
  durationSeconds: number;
  targetLanguage: string;
}

export interface AdminUserBreakdown {
  userCode: string;
  analysisCount: number;
  averageScore: number;
  highRiskCount: number;
  lastActive: string;
}

export interface AdminSummaryData {
  totalAnalyses: number;
  averageRiskScore: number;
  deepfakeSuspectedCount: number;
  deepfakeRatePercent: number;
  uniqueUserCount: number;
  countByRiskCategory: Record<string, number>;
  userBreakdown: AdminUserBreakdown[];
}

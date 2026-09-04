import React, { useState, useMemo } from "react";
import {
  Brain,
  ShieldCheck,
  ShieldAlert,
  Download,
  BookmarkPlus,
  Trash2,
  Copy,
  Check,
  FileCheck,
  Globe,
  Cpu,
  Activity,
  BarChart2,
  Sparkles,
} from "lucide-react";
import { AudioAnalysisResult } from "../types";
import { useLanguage } from "../context/LanguageContext";
import {
  getLocalizedSummaryLines,
  SUMMARY_CATEGORIES,
} from "../utils/aiSummaryTranslations";

interface AiSummaryCardProps {
  analysis: AudioAnalysisResult | null;
  onSaveToHistory: () => void;
  onDeleteAudio: () => void;
  isSaved?: boolean;
}

const CATEGORY_ICONS = [Cpu, Activity, ShieldAlert, BarChart2, ShieldCheck];

const CATEGORY_COLORS = [
  {
    bg: "bg-indigo-100 dark:bg-indigo-950/80",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200/70 dark:border-indigo-800/60",
    badgeBg: "bg-indigo-50 dark:bg-indigo-900/40",
  },
  {
    bg: "bg-cyan-100 dark:bg-cyan-950/80",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200/70 dark:border-cyan-800/60",
    badgeBg: "bg-cyan-50 dark:bg-cyan-900/40",
  },
  {
    bg: "bg-amber-100 dark:bg-amber-950/80",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/70 dark:border-amber-800/60",
    badgeBg: "bg-amber-50 dark:bg-amber-900/40",
  },
  {
    bg: "bg-rose-100 dark:bg-rose-950/80",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200/70 dark:border-rose-800/60",
    badgeBg: "bg-rose-50 dark:bg-rose-900/40",
  },
  {
    bg: "bg-emerald-100 dark:bg-emerald-950/80",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/70 dark:border-emerald-800/60",
    badgeBg: "bg-emerald-50 dark:bg-emerald-900/40",
  },
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिंदी (Hindi)",
  te: "తెలుగు (Telugu)",
  ar: "العربية (Arabic)",
  bn: "বাংলা (Bengali)",
  mr: "मराठी (Marathi)",
  ta: "தமிழ் (Tamil)",
  ml: "മലയാളം (Malayalam)",
  kn: "ಕನ್ನಡ (Kannada)",
};

export const AiSummaryCard: React.FC<AiSummaryCardProps> = ({
  analysis,
  onSaveToHistory,
  onDeleteAudio,
  isSaved = false,
}) => {
  const { t, currentLanguage, isRTL } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"translated" | "original">("translated");

  // Localized summary bullets calculated dynamically based on active language
  const localizedLines = useMemo(() => {
    if (!analysis) return [];
    return getLocalizedSummaryLines(
      analysis.aiSummary,
      analysis.translatedAiSummary,
      currentLanguage,
      analysis.isDeepfakeSuspected
    );
  }, [analysis, currentLanguage]);

  // Original English lines
  const originalLines = useMemo(() => {
    if (!analysis || !analysis.aiSummary) return [];
    return analysis.aiSummary.split("\n").filter((l) => l.trim().length > 0);
  }, [analysis]);

  if (!analysis) {
    return (
      <div className="bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs dark:shadow-xl backdrop-blur-md flex flex-col justify-center items-center text-center text-xs text-slate-500 dark:text-slate-400 py-10 transition-colors">
        <Brain className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2 animate-pulse" />
        <span>{t("awaiting_analysis_pass")}</span>
      </div>
    );
  }

  const isTranslatedActive = viewMode === "translated" && currentLanguage !== "en";
  const displayLines = isTranslatedActive ? localizedLines : originalLines;
  const categories = SUMMARY_CATEGORIES[currentLanguage] || SUMMARY_CATEGORIES.en;

  const handleCopySummary = () => {
    const textToCopy = displayLines
      .map((line, idx) => `${idx + 1}. ${line.replace(/^\d+\.\s*/, "")}`)
      .join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const reportData = {
      ...analysis,
      activeLanguage: currentLanguage,
      localizedAiSummary: localizedLines,
    };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `Hertzy_Risk_Report_${analysis.id || Date.now()}_${currentLanguage}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const activeLangName = LANGUAGE_LABELS[currentLanguage] || currentLanguage.toUpperCase();

  return (
    <div
      id="ai-executive-risk-summary-card"
      className="bg-white dark:bg-[#161D30] border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs dark:shadow-xl backdrop-blur-md flex flex-col h-full transition-colors relative overflow-hidden"
    >
      {/* Subtle top indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-2xs">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {t("ai_summary_title")}
              </h3>
              {currentLanguage !== "en" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70">
                  <Globe className="w-2.5 h-2.5" />
                  {activeLangName}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
              {t("ai_summary_subtitle")}
            </span>
          </div>
        </div>

        {/* Action Buttons & Language View Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentLanguage !== "en" && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium mr-1">
              <button
                type="button"
                onClick={() => setViewMode("translated")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  viewMode === "translated"
                    ? "bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="View translated summary"
              >
                Translated
              </button>
              <button
                type="button"
                onClick={() => setViewMode("original")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  viewMode === "original"
                    ? "bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="View original English summary"
              >
                Original (EN)
              </button>
            </div>
          )}

          <button
            id="copy-ai-summary-btn"
            onClick={handleCopySummary}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0B0F19] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-all cursor-pointer"
            title="Copy Summary"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{t("copy")}</span>
          </button>

          <button
            id="export-report-json-btn"
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0B0F19] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-all cursor-pointer"
            title="Export JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("export_json")}</span>
          </button>
        </div>
      </div>

      {/* Summary Bullet Points */}
      <div
        id="ai-summary-bullet-list"
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        dir={isTranslatedActive && isRTL ? "rtl" : "ltr"}
      >
        {displayLines.map((line, idx) => {
          const cleanText = line.replace(/^\d+\.\s*/, "");
          const IconComponent = CATEGORY_ICONS[idx % CATEGORY_ICONS.length];
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          const categoryBadge =
            categories[idx]?.badge || `Analysis Point ${idx + 1}`;
          const isSpanningFull = idx === displayLines.length - 1 && displayLines.length % 2 === 1;
          const isFinalWarning = idx === displayLines.length - 1;

          // Determine risk level based on overallRiskScore and riskCategory
          // Low risk: score <= 40 or category "Low" / "Very Low"
          // Moderate risk: score between 41 and 70, or category "Moderate" / "Elevated"
          // High risk: score > 70 or category "High" / deepfake suspected
          const currentScore = typeof analysis?.overallRiskScore === "number" && Number.isFinite(analysis.overallRiskScore)
            ? analysis.overallRiskScore
            : 0;

          const rawCategory = (analysis?.riskCategory || "").toLowerCase();
          const isLowRisk =
            rawCategory.includes("low") ||
            rawCategory.includes("safe") ||
            (!rawCategory.includes("high") && !rawCategory.includes("elevated") && !rawCategory.includes("moderate") && currentScore <= 40);

          const isModerateRisk =
            !isLowRisk &&
            (rawCategory.includes("moderate") || rawCategory.includes("elevated") || (currentScore > 40 && currentScore <= 70));

          let finalWarningContainerClass = "";
          let finalWarningTextClass = "";
          let finalWarningBadgeClass = "";
          let finalWarningGlyphClass = "";

          if (isFinalWarning) {
            if (isLowRisk) {
              // Vibrant Green glow and bold emerald styling for Low / Very Low Risk
              finalWarningContainerClass =
                "bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 dark:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400/50";
              finalWarningTextClass = "font-bold text-emerald-900 dark:text-emerald-200 text-sm";
              finalWarningBadgeClass = "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/50 font-bold";
              finalWarningGlyphClass = "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
            } else if (isModerateRisk) {
              // Warm Amber/Orange glow for Moderate / Elevated Risk
              finalWarningContainerClass =
                "bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-500 dark:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.45)] ring-1 ring-amber-400/50";
              finalWarningTextClass = "font-bold text-amber-900 dark:text-amber-200 text-sm";
              finalWarningBadgeClass = "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50 font-bold";
              finalWarningGlyphClass = "bg-amber-600 text-white border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
            } else {
              // High threat / Scam Red glow
              finalWarningContainerClass =
                "bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 dark:border-rose-400 shadow-[0_0_22px_rgba(239,68,68,0.5)] ring-1 ring-rose-400/50";
              finalWarningTextClass = "font-bold text-rose-950 dark:text-rose-100 text-sm";
              finalWarningBadgeClass = "bg-rose-500/25 text-rose-800 dark:text-rose-200 border-rose-500/60 font-bold";
              finalWarningGlyphClass = "bg-rose-600 text-white border-rose-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]";
            }
          }

          return (
            <div
              key={idx}
              id={`ai-summary-point-${idx + 1}`}
              className={`group relative p-3.5 rounded-xl border transition-all duration-150 flex items-start gap-3 text-xs leading-relaxed ${
                isFinalWarning
                  ? finalWarningContainerClass
                  : "bg-slate-50/90 dark:bg-[#0F172A]/90 border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-400/80 dark:hover:border-indigo-500/60 hover:bg-white dark:hover:bg-[#131C35] hover:shadow-xs text-slate-800 dark:text-slate-200"
              } ${isSpanningFull ? "md:col-span-2" : ""}`}
            >
              {/* Step / Point Number Glyph */}
              <div
                className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-[11px] font-mono shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${
                  isFinalWarning
                    ? finalWarningGlyphClass
                    : `${color.bg} ${color.text} ${color.border}`
                }`}
              >
                {idx + 1}
              </div>

              {/* Point Content Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                      isFinalWarning
                        ? finalWarningBadgeClass
                        : `${color.badgeBg} ${color.text} ${color.border}`
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    {categoryBadge}
                  </span>
                </div>
                <p
                  className={`text-xs sm:text-[13px] leading-relaxed ${
                    isFinalWarning
                      ? finalWarningTextClass
                      : "text-slate-700 dark:text-slate-200 font-normal"
                  }`}
                >
                  {cleanText}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Footer (Save to History & Delete Audio) */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Save to History Button */}
          <button
            id="save-to-history-btn"
            onClick={onSaveToHistory}
            disabled={isSaved}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isSaved
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hover:shadow-md"
            }`}
          >
            {isSaved ? (
              <FileCheck className="w-4 h-4" />
            ) : (
              <BookmarkPlus className="w-4 h-4" />
            )}
            <span>{isSaved ? t("saved_to_vault") : t("save_to_history")}</span>
          </button>
        </div>

        {/* Delete Audio / Purge Action */}
        <button
          id="delete-audio-btn"
          onClick={onDeleteAudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t("delete_audio_reset")}</span>
        </button>
      </div>
    </div>
  );
};

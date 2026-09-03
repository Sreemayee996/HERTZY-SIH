import React, { useState } from "react";
import {
  FileText,
  Languages,
  Copy,
  Check,
  Volume2,
  Sparkles,
  Search,
  ExternalLink,
} from "lucide-react";
import { SuspiciousWord } from "../types";
import { LANGUAGES } from "./Navbar";
import { useLanguage } from "../context/LanguageContext";

interface TranscriptTranslationViewProps {
  transcript: string;
  translatedText: string;
  targetLanguageName: string;
  targetLanguageCode: string;
  suspiciousWords: SuspiciousWord[];
  onChangeLanguage: (code: string) => void;
  isTranslating?: boolean;
}

export const TranscriptTranslationView: React.FC<TranscriptTranslationViewProps> = ({
  transcript = "",
  translatedText = "",
  targetLanguageName = "English",
  targetLanguageCode = "en",
  suspiciousWords = [],
  onChangeLanguage,
  isTranslating = false,
}) => {
  const { t } = useLanguage();
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);
  const [activeTab, setActiveTab] = useState<"dual" | "transcript" | "translation">("dual");
  const [searchTerm, setSearchTerm] = useState("");

  const handleCopy = (text: string, type: "original" | "translated") => {
    navigator.clipboard.writeText(text);
    if (type === "original") {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedTranslated(true);
      setTimeout(() => setCopiedTranslated(false), 2000);
    }
  };

  // Function to highlight suspicious words inside original transcript
  const renderHighlightedTranscript = () => {
    if (!transcript) {
      return (
        <span className="text-slate-500 italic text-xs">
          {t("awaiting_audio")}
        </span>
      );
    }

    if (!suspiciousWords || suspiciousWords.length === 0) {
      return <span className="text-slate-800 dark:text-slate-200">{transcript}</span>;
    }

    // Build regex pattern for suspicious words
    const escapedPhrases = suspiciousWords
      .map((sw) => sw.wordOrPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .filter((p) => p.length > 1);

    if (escapedPhrases.length === 0) {
      return <span className="text-slate-800 dark:text-slate-200">{transcript}</span>;
    }

    const regex = new RegExp(`(${escapedPhrases.join("|")})`, "gi");
    const parts = transcript.split(regex);

    return parts.map((part, i) => {
      const matched = suspiciousWords.find(
        (sw) => sw.wordOrPhrase.toLowerCase() === part.toLowerCase()
      );

      if (matched) {
        let badgeColor = "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/40";
        if (matched.category === "Financial") {
          badgeColor = "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40";
        } else if (matched.category === "Urgency") {
          badgeColor = "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40";
        }

        return (
          <mark
            key={i}
            title={`${matched.category}: ${matched.explanation || "Flagged phrase"}`}
            className={`px-1.5 py-0.5 rounded font-semibold border ${badgeColor} inline-block mx-0.5 animate-pulse`}
          >
            {part}
          </mark>
        );
      }
      return <span key={i} className="text-slate-800 dark:text-slate-200">{part}</span>;
    });
  };

  return (
    <div className="bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs dark:shadow-xl backdrop-blur-md flex flex-col h-full transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
              {t("speech_to_text_title")}
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {t("speech_to_text_subtitle")}
            </span>
          </div>
        </div>

        {/* View Layout Tabs & Language Picker */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0F19] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveTab("dual")}
              className={`px-2 py-1 rounded cursor-pointer font-medium transition-all ${
                activeTab === "dual" ? "bg-indigo-600 text-white font-semibold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t("side_by_side")}
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`px-2 py-1 rounded cursor-pointer font-medium transition-all ${
                activeTab === "transcript" ? "bg-indigo-600 text-white font-semibold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t("original")}
            </button>
            <button
              onClick={() => setActiveTab("translation")}
              className={`px-2 py-1 rounded cursor-pointer font-medium transition-all ${
                activeTab === "translation" ? "bg-indigo-600 text-white font-semibold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t("translation")}
            </button>
          </div>

          <select
            id="transcript-target-lang-select"
            value={targetLanguageCode}
            onChange={(e) => onChangeLanguage(e.target.value)}
            className="bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-100">
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Original Spoken Transcript */}
        {(activeTab === "dual" || activeTab === "transcript") && (
          <div className="flex flex-col rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                {t("original_transcript_title")}
              </span>
              <button
                id="copy-original-transcript-btn"
                onClick={() => handleCopy(transcript, "original")}
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded transition-colors cursor-pointer"
                title={t("copy_original")}
              >
                {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-52 text-xs leading-relaxed font-sans select-text">
              {renderHighlightedTranscript()}
            </div>
          </div>
        )}

        {/* Live Translation */}
        {(activeTab === "dual" || activeTab === "translation") && (
          <div className="flex flex-col rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                {t("live_translation_title")} ({targetLanguageName})
              </span>
              <button
                id="copy-translated-transcript-btn"
                onClick={() => handleCopy(translatedText, "translated")}
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded transition-colors cursor-pointer"
                title={t("copy_translation")}
              >
                {copiedTranslated ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-52 text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-sans select-text">
              {isTranslating ? (
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs py-4">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>{t("translating_realtime")}</span>
                </div>
              ) : translatedText ? (
                <span>{translatedText}</span>
              ) : (
                <span className="text-slate-500 italic">
                  {t("translation_will_appear")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

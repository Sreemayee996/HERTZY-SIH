import React, { useState } from "react";
import { AlertOctagon, ShieldAlert, Tag, Clock, ChevronRight, Filter } from "lucide-react";
import { SuspiciousWord } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface SuspiciousKeywordsPanelProps {
  suspiciousWords: SuspiciousWord[];
}

export const SuspiciousKeywordsPanel: React.FC<SuspiciousKeywordsPanelProps> = ({
  suspiciousWords = [],
}) => {
  const { t } = useLanguage();
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = Array.from(new Set(suspiciousWords.map((w) => w.category)));

  const filteredWords = filterCategory === "all"
    ? suspiciousWords
    : suspiciousWords.filter((w) => w.category === filterCategory);

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/50";
      case "high":
        return "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-500/50";
      case "medium":
        return "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/50";
      default:
        return "bg-slate-100 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getSeverityLabel = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === "critical") return t("critical");
    if (s === "high") return t("high");
    if (s === "medium") return t("medium");
    return severity || t("medium");
  };

  return (
    <div className="bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs dark:shadow-xl backdrop-blur-md flex flex-col h-full transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-red-500/10 text-red-500 dark:text-red-400">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
              {t("suspicious_vocab_title")}
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {t("suspicious_vocab_subtitle")}
            </span>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/40">
          {suspiciousWords.length} {t("detected")}
        </span>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 text-[11px]">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
              filterCategory === "all"
                ? "bg-indigo-600 text-white font-semibold border-indigo-500"
                : "bg-slate-100 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("all")} ({suspiciousWords.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                filterCategory === cat
                  ? "bg-indigo-600 text-white font-semibold border-indigo-500"
                  : "bg-slate-100 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Words List */}
      <div className="space-y-2 overflow-y-auto max-h-60 flex-1 pr-1">
        {filteredWords.length > 0 ? (
          filteredWords.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-500/40 transition-all text-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  "{item.wordOrPhrase}"
                </span>
                <div className="flex items-center gap-1.5">
                  {item.timestamp && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                      item.severity
                    )}`}
                  >
                    {getSeverityLabel(item.severity)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">{t("category")}: {item.category}</span>
              </div>

              {item.explanation && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 bg-white dark:bg-[#0B0F19] p-2 rounded border border-slate-200 dark:border-slate-800">
                  {item.explanation}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <Tag className="w-6 h-6 text-slate-400 dark:text-slate-600 mb-1" />
            <span>{t("no_suspicious_markers")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

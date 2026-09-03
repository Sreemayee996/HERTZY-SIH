import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TimeWindowData } from "../types";
import { TrendingUp, Layers } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

interface RiskTimelineChartProps {
  timeWindows: TimeWindowData[];
  selectedWindowDuration: number;
}

export const RiskTimelineChart: React.FC<RiskTimelineChartProps> = ({
  timeWindows = [],
  selectedWindowDuration = 5,
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [selectedMetric, setSelectedMetric] = useState<"all" | "composite" | "authenticity" | "vocabulary" | "tone">("all");

  const chartData = timeWindows.map((w, index) => {
    const startTime = typeof w.startTime === "number" && Number.isFinite(w.startTime) ? w.startTime : index * selectedWindowDuration;
    const endTime = typeof w.endTime === "number" && Number.isFinite(w.endTime) ? w.endTime : (index + 1) * selectedWindowDuration;
    const comp = typeof w.compositeRiskScore === "number" && Number.isFinite(w.compositeRiskScore) ? Math.round(w.compositeRiskScore) : 10;
    const auth = typeof w.voiceAuthenticityRisk === "number" && Number.isFinite(w.voiceAuthenticityRisk) ? Math.round(w.voiceAuthenticityRisk) : 10;
    const voc = typeof w.vocabularyRisk === "number" && Number.isFinite(w.vocabularyRisk) ? Math.round(w.vocabularyRisk) : 10;
    const tone = typeof w.toneProsodyRisk === "number" && Number.isFinite(w.toneProsodyRisk) ? Math.round(w.toneProsodyRisk) : 10;

    return {
      time: `${startTime}s - ${endTime}s`,
      shortTime: `${startTime}s`,
      compositeRisk: comp,
      voiceAuthenticityRisk: auth,
      vocabularyRisk: voc,
      toneProsodyRisk: tone,
      textSnippet: w.textSnippet || "",
      alerts: w.alerts || [],
    };
  });

  const peakVoiceRisk = timeWindows.length > 0
    ? Math.max(0, ...timeWindows.map((w) => typeof w.voiceAuthenticityRisk === "number" && Number.isFinite(w.voiceAuthenticityRisk) ? Math.round(w.voiceAuthenticityRisk) : 0))
    : 0;

  const peakVocabRisk = timeWindows.length > 0
    ? Math.max(0, ...timeWindows.map((w) => typeof w.vocabularyRisk === "number" && Number.isFinite(w.vocabularyRisk) ? Math.round(w.vocabularyRisk) : 0))
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-white/95 dark:bg-[#0B0F19]/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl backdrop-blur-md max-w-xs text-xs text-slate-800 dark:text-slate-200">
          <div className="font-bold text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2 flex items-center justify-between">
            <span>{t("time")}: {label}</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              {t("risk")}: {data.compositeRisk}/100
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <span>{t("composite")}:</span>
              <span className="font-mono font-bold">{data.compositeRisk}</span>
            </div>
            <div className="flex items-center justify-between text-red-500 dark:text-red-400">
              <span>{t("voice_clone")}:</span>
              <span className="font-mono font-bold">{data.voiceAuthenticityRisk}</span>
            </div>
            <div className="flex items-center justify-between text-amber-500 dark:text-amber-400">
              <span>{t("vocabulary")}:</span>
              <span className="font-mono font-bold">{data.vocabularyRisk}</span>
            </div>
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <span>{t("tone_prosody")}:</span>
              <span className="font-mono font-bold">{data.toneProsodyRisk}</span>
            </div>
          </div>

          {data.textSnippet && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300 italic">
              "{data.textSnippet}"
            </div>
          )}

          {data.alerts && data.alerts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {data.alerts.map((a: string, i: number) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-[9px] font-medium border border-red-300 dark:border-red-500/40">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="risk-timeline-chart-card"
      className="bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs dark:shadow-xl backdrop-blur-md transition-colors flex flex-col justify-between h-full"
    >
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
              {t("risk_timeline_title")}
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {t("risk_timeline_subtitle")} ({selectedWindowDuration}s)
            </span>
          </div>
        </div>

        {/* Metric Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0F19] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
          <button
            onClick={() => setSelectedMetric("all")}
            className={`px-2.5 py-1 rounded transition-all cursor-pointer font-medium ${
              selectedMetric === "all" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("all_metrics")}
          </button>
          <button
            onClick={() => setSelectedMetric("composite")}
            className={`px-2.5 py-1 rounded transition-all cursor-pointer font-medium ${
              selectedMetric === "composite" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("composite")}
          </button>
          <button
            onClick={() => setSelectedMetric("authenticity")}
            className={`px-2.5 py-1 rounded transition-all cursor-pointer font-medium ${
              selectedMetric === "authenticity" ? "bg-red-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("voice_clone")}
          </button>
          <button
            onClick={() => setSelectedMetric("vocabulary")}
            className={`px-2.5 py-1 rounded transition-all cursor-pointer font-medium ${
              selectedMetric === "vocabulary" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("vocabulary")}
          </button>
          <button
            onClick={() => setSelectedMetric("tone")}
            className={`px-2.5 py-1 rounded transition-all cursor-pointer font-medium ${
              selectedMetric === "tone" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("tone_prosody")}
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      {chartData.length > 0 ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="authGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="vocabGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="toneGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
              <XAxis dataKey="shortTime" stroke={isDark ? "#64748b" : "#94a3b8"} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} />
              <YAxis domain={[0, 100]} stroke={isDark ? "#64748b" : "#94a3b8"} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} />
              <Tooltip content={<CustomTooltip />} />

              {/* Threshold Lines */}
              <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Critical (80)", fill: "#ef4444", fontSize: 10 }} />
              <ReferenceLine y={40} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Safe (40)", fill: "#10b981", fontSize: 10 }} />

              {(selectedMetric === "all" || selectedMetric === "composite") && (
                <Area
                  type="monotone"
                  dataKey="compositeRisk"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#compGradient)"
                  name={t("composite")}
                />
              )}

              {(selectedMetric === "all" || selectedMetric === "authenticity") && (
                <Area
                  type="monotone"
                  dataKey="voiceAuthenticityRisk"
                  stroke="#ef4444"
                  strokeWidth={1.8}
                  strokeDasharray={selectedMetric === "all" ? "3 3" : undefined}
                  fillOpacity={1}
                  fill="url(#authGradient)"
                  name={t("voice_clone")}
                />
              )}

              {(selectedMetric === "all" || selectedMetric === "vocabulary") && (
                <Area
                  type="monotone"
                  dataKey="vocabularyRisk"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                  strokeDasharray={selectedMetric === "all" ? "3 3" : undefined}
                  fillOpacity={1}
                  fill="url(#vocabGradient)"
                  name={t("vocabulary")}
                />
              )}

              {(selectedMetric === "all" || selectedMetric === "tone") && (
                <Area
                  type="monotone"
                  dataKey="toneProsodyRisk"
                  stroke="#a855f7"
                  strokeWidth={1.8}
                  strokeDasharray={selectedMetric === "all" ? "3 3" : undefined}
                  fillOpacity={1}
                  fill="url(#toneGradient)"
                  name={t("tone_prosody")}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-44 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <Layers className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2" />
          <span>{t("no_timeline_data")}</span>
        </div>
      )}

      {/* Average Window Breakdown Pills */}
      {timeWindows.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>{t("windows_analyzed")}: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{timeWindows.length} {t("intervals")}</strong></span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>{t("slice_resolution")}: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedWindowDuration}s</strong></span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              {t("composite")}
            </span>
            <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {t("peak_voice")}: {peakVoiceRisk}/100
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              {t("peak_vocab")}: {peakVocabRisk}/100
            </span>
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              {t("tone_prosody")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

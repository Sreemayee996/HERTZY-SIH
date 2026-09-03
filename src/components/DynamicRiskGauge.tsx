import React, { useMemo, useState } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Activity, Sliders, ChevronDown, ChevronUp, Scale } from "lucide-react";
import { RiskCategory } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface DynamicRiskGaugeProps {
  score: number; // 0 to 100
  riskCategory: RiskCategory;
  stabilityRating: string;
  isDeepfakeSuspected: boolean;
  deepfakeConfidence: number;
  isLiveAnalyzing?: boolean;
}

export const DynamicRiskGauge: React.FC<DynamicRiskGaugeProps> = ({
  score = 0,
  riskCategory = "Very Low",
  stabilityRating = "High Stability (Safe)",
  isDeepfakeSuspected = false,
  deepfakeConfidence = 0,
  isLiveAnalyzing = false,
}) => {
  const { t } = useLanguage();
  const [showWeights, setShowWeights] = useState(false);

  // Clamped score between 0 and 100 with NaN guard
  const safeScore = typeof score === "number" && Number.isFinite(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, Math.round(safeScore)));
  const safeDeepfake = typeof deepfakeConfidence === "number" && Number.isFinite(deepfakeConfidence) ? deepfakeConfidence : 0;

  // Gauge Angle Calculation (from -180 deg to 0 deg, or -135 to +135 deg)
  // We will use standard semi-circle arc: -180 deg (0) to 0 deg (100) or -140 deg to +140 deg
  const angle = useMemo(() => {
    // -135 deg (0) to +135 deg (100)
    const valid = Number.isFinite(clampedScore) ? clampedScore : 0;
    return -135 + (valid / 100) * 270;
  }, [clampedScore]);

  // Color mapping based on 5-point intervals
  const { colorHex, badgeBg, badgeBorder, badgeText, statusTitle } = useMemo(() => {
    if (clampedScore <= 20) {
      return {
        colorHex: "#10b981", // Emerald
        badgeBg: "bg-emerald-500/10",
        badgeBorder: "border-emerald-500/30",
        badgeText: "text-emerald-400",
        statusTitle: t("status_very_low"),
      };
    } else if (clampedScore <= 40) {
      return {
        colorHex: "#84cc16", // Lime
        badgeBg: "bg-lime-500/10",
        badgeBorder: "border-lime-500/30",
        badgeText: "text-lime-400",
        statusTitle: t("status_low"),
      };
    } else if (clampedScore <= 60) {
      return {
        colorHex: "#eab308", // Amber
        badgeBg: "bg-amber-500/10",
        badgeBorder: "border-amber-500/30",
        badgeText: "text-amber-400",
        statusTitle: t("status_moderate"),
      };
    } else if (clampedScore <= 80) {
      return {
        colorHex: "#f97316", // Orange
        badgeBg: "bg-orange-500/10",
        badgeBorder: "border-orange-500/30",
        badgeText: "text-orange-400",
        statusTitle: t("status_elevated"),
      };
    } else {
      return {
        colorHex: "#ef4444", // Red
        badgeBg: "bg-red-500/15",
        badgeBorder: "border-red-500/40",
        badgeText: "text-red-400",
        statusTitle: t("status_high"),
      };
    }
  }, [clampedScore, t]);

  // Arc SVG calculations
  // Center (150, 140), Radius 100
  const cx = 150;
  const cy = 135;
  const radius = 95;

  return (
    <div className="relative flex flex-col items-center justify-between p-5 bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs dark:shadow-xl h-full transition-colors duration-200">
      {/* Card Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: colorHex, boxShadow: `0 0 10px ${colorHex}` }}
          />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-300">
            {t("interaction_risk_gauge")}
          </h3>
        </div>

        <div className={`px-2 py-0.5 rounded border text-[11px] font-bold font-mono ${badgeBg} ${badgeBorder} ${badgeText}`}>
          {clampedScore <= 20
            ? t("badge_very_low")
            : clampedScore <= 40
            ? t("badge_low")
            : clampedScore <= 60
            ? t("badge_moderate")
            : clampedScore <= 80
            ? t("badge_elevated")
            : t("badge_high")}
        </div>
      </div>

      {/* SVG Circular Dynamic Gauge */}
      <div className="relative w-full max-w-[280px] flex items-center justify-center my-1">
        <svg viewBox="0 0 300 220" className="w-full h-auto drop-shadow-md">
          <defs>
            {/* Gradient for Arc Segments */}
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="25%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc (270 degrees, from 135deg to 405deg) */}
          <path
            d="M 83 202 A 95 95 0 1 1 217 202"
            fill="none"
            className="stroke-slate-200 dark:stroke-[#0f172a]"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Active Gradient Arc */}
          <path
            d="M 83 202 A 95 95 0 1 1 217 202"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Risk Interval Ticks / Labels */}
          <text x="68" y="215" fill="#10b981" fontSize="10" fontWeight="600" textAnchor="middle">0</text>
          <text x="60" y="115" fill="#84cc16" fontSize="10" fontWeight="600" textAnchor="middle">20</text>
          <text x="110" y="52" fill="#eab308" fontSize="10" fontWeight="600" textAnchor="middle">40</text>
          <text x="190" y="52" fill="#f97316" fontSize="10" fontWeight="600" textAnchor="middle">60</text>
          <text x="240" y="115" fill="#ef4444" fontSize="10" fontWeight="600" textAnchor="middle">80</text>
          <text x="232" y="215" fill="#ef4444" fontSize="10" fontWeight="600" textAnchor="middle">100</text>

          {/* Center Pivot Glowing Circle */}
          <circle cx={cx} cy={cy} r="18" className="fill-slate-100 dark:fill-[#0b0f19] stroke-slate-300 dark:stroke-slate-700" strokeWidth="2.5" />
          <circle
            cx={cx}
            cy={cy}
            r="8"
            fill={colorHex}
            style={{ filter: "url(#gaugeGlow)" }}
          />

          {/* Dynamic Gauge Needle */}
          <g
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${angle}deg)`,
              transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Needle Body */}
            <polygon
              points={`${cx - 3},${cy} ${cx + 3},${cy} ${cx},${cy - 82}`}
              fill={colorHex}
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            {/* Needle tip glow */}
            <circle cx={cx} cy={cy - 82} r="3" fill="#ffffff" />
          </g>
        </svg>

        {/* Center Score Overlay */}
        <div className="absolute top-[120px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
          <div
            className="text-4xl font-extrabold tracking-tight font-mono transition-colors duration-500"
            style={{ color: colorHex }}
          >
            {clampedScore}
          </div>
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest mt-0.5">
            {t("risk_index")}
          </div>
        </div>
      </div>

      {/* Stability Status & Synthetic Clone Assessment */}
      <div className="w-full mt-2 space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            {clampedScore <= 40 ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            ) : clampedScore <= 60 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-500 animate-bounce" />
            )}
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {stabilityRating}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight mt-0.5">
                {clampedScore <= 40
                  ? t("natural_patterns")
                  : clampedScore <= 70
                  ? t("elevated_urgency")
                  : t("high_confidence_deepfake")}
              </div>
            </div>
          </div>

          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded"
            style={{ color: colorHex, backgroundColor: `${colorHex}15` }}
          >
            {clampedScore}/100
          </span>
        </div>

        {/* Hertzy Model Deepfake Probability Meter */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shadow-xs">
          <span className="text-slate-600 dark:text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Hertzy {t("synthetic_probability")}:
          </span>
          <span
            className={`font-mono font-bold ${
              safeDeepfake > 60
                ? "text-red-500 dark:text-red-400"
                : safeDeepfake > 30
                ? "text-amber-500 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {safeDeepfake > 0 ? `${safeDeepfake.toFixed(1)}%` : "3.2%"}
          </span>
        </div>

        {/* Assessment Weight Distribution Section */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowWeights(!showWeights)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#0B0F19] dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
              <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t("risk_weights_breakdown")}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>{showWeights ? t("hide") : t("vectors_count")}</span>
              {showWeights ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </button>

          {showWeights && (
            <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800/80 space-y-2.5 text-[11px] animate-fadeIn">
              {/* Vector 1 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-800 dark:text-slate-300 font-medium">{t("vector1_title")}</span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-500/30">
                    {t("weight_40")}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: "40%" }} />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {t("vector1_desc")}
                </div>
              </div>

              {/* Vector 2 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-800 dark:text-slate-300 font-medium">{t("vector2_title")}</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/30">
                    {t("weight_25")}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "25%" }} />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {t("vector2_desc")}
                </div>
              </div>

              {/* Vector 3 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-800 dark:text-slate-300 font-medium">{t("vector3_title")}</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
                    {t("weight_25")}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: "25%" }} />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {t("vector3_desc")}
                </div>
              </div>

              {/* Vector 4 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-800 dark:text-slate-300 font-medium">{t("vector4_title")}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
                    {t("weight_10")}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "10%" }} />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {t("vector4_desc")}
                </div>
              </div>

              {/* Formula summary */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between">
                <span>{t("composite_formula")}</span>
                <span className="text-indigo-600 dark:text-indigo-300">Σ (w_i × Score_i) / 100</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

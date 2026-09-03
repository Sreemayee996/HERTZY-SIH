import React from "react";
import {
  Mic2,
  Activity,
  Volume2,
  Gauge,
  Clock,
  Radio,
  Sliders,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AcousticMetrics } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface ToneProsodyAcousticsProps {
  acoustics: AcousticMetrics;
  isDeepfakeSuspected: boolean;
  deepfakeConfidence: number;
}

export const ToneProsodyAcoustics: React.FC<ToneProsodyAcousticsProps> = ({
  acoustics,
  isDeepfakeSuspected = false,
  deepfakeConfidence = 0,
}) => {
  const { t } = useLanguage();
  const safePitchHz = Number.isFinite(acoustics?.pitchHz) ? Math.round(acoustics.pitchHz) : 145;
  const safePitchRange = acoustics?.pitchRange || "110-230Hz";
  const safeJitter = Number.isFinite(acoustics?.pitchJitterPercent) ? acoustics.pitchJitterPercent : 1.2;
  const safeEnergyRmsDb = Number.isFinite(acoustics?.energyRmsDb) ? acoustics.energyRmsDb : -18.4;
  const safeToneLabel = acoustics?.toneLabel || "Conversational Neutral";
  const safeProsodyRate = Number.isFinite(acoustics?.prosodySpeechRateWpm) ? Math.round(acoustics.prosodySpeechRateWpm) : 140;
  const safeNaturalness = Number.isFinite(acoustics?.prosodyNaturalnessScore) ? Math.round(acoustics.prosodyNaturalnessScore) : 88;
  const safePauseMs = Number.isFinite(acoustics?.pauseDurationMs) ? Math.round(acoustics.pauseDurationMs) : 340;
  const safePauseFreq = Number.isFinite(acoustics?.pauseFrequencyPerMin) ? acoustics.pauseFrequencyPerMin : 16;
  const safeCentroid = Number.isFinite(acoustics?.spectralCentroidHz) ? Math.round(acoustics.spectralCentroidHz) : 2100;

  const energyWidth = Math.min(100, Math.max(10, 100 + safeEnergyRmsDb * 1.5));

  return (
    <div className="bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs dark:shadow-xl backdrop-blur-md flex flex-col h-full transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
              {t("tone_telemetry_title")}
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {t("tone_telemetry_subtitle")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-indigo-700 dark:text-indigo-300">
          <Cpu className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
          Hertzy {t("acoustic_ml_badge")}
        </div>
      </div>

      {/* 6-Grid Acoustic Telemetry Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
        {/* 1. Fundamental Pitch (F0) */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-medium">{t("pitch_f0")}</span>
            <Activity className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {safePitchHz} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">Hz</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t("range")}: {safePitchRange}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-300 font-mono">
            {t("jitter")}: {safeJitter}% {safeJitter > 2.5 ? `(${t("elevated")})` : `(${t("stable")})`}
          </div>
        </div>

        {/* 2. Volume Energy (RMS) */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-medium">{t("energy_level")}</span>
            <Volume2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {safeEnergyRmsDb} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">dB</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t("rms_headroom")}
            </div>
          </div>
          <div className="mt-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full"
              style={{ width: `${energyWidth}%` }}
            />
          </div>
        </div>

        {/* 3. Tone Classification */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-medium">{t("tone_classification")}</span>
            <Mic2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 leading-tight">
              {safeToneLabel}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t("inferred_vocal_stance")}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            {t("neural_formant_analysis")}
          </div>
        </div>

        {/* 4. Prosody & Cadence */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-medium">{t("prosody_rate")}</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {safeProsodyRate} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">WPM</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t("speech_flow_cadence")}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
            {t("naturalness")}: {safeNaturalness}/100
          </div>
        </div>

        {/* 5. Pause Duration */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-medium">{t("pause_duration")}</span>
            <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {safePauseMs} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ms</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t("avg_intersyllabic_gap")}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-400">
            {safePauseMs < 200 ? `⚠️ ${t("unusually_rapid_synthetic")}` : `✓ ${t("natural_breathing_gap")}`}
          </div>
        </div>

        {/* 6. Pause Frequency */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-medium">{t("pause_frequency")}</span>
            <Radio className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {safePauseFreq} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">/min</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t("breathing_rate")}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-300 font-mono">
            {t("centroid")}: {safeCentroid} Hz
          </div>
        </div>
      </div>
    </div>
  );
};

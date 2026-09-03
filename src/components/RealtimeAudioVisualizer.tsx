import React, { useEffect, useRef, useState } from "react";
import { Waves, Activity } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

interface RealtimeAudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isPlayingOrRecording: boolean;
  audioSourceLabel?: string;
  energyDb?: number;
}

export const RealtimeAudioVisualizer: React.FC<RealtimeAudioVisualizerProps> = ({
  analyserNode,
  isPlayingOrRecording = false,
  audioSourceLabel = "Microphone Stream",
  energyDb = -45,
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visualMode, setVisualMode] = useState<"hybrid" | "waveform" | "spectrum">("hybrid");
  const [liveCalculatedDb, setLiveCalculatedDb] = useState<number>(-50);

  // Persistent data buffers
  const timeDataRef = useRef<Uint8Array | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize handling
    const updateCanvasSize = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.max(300, Math.floor(rect.width || 400));
        const h = Math.max(120, Math.floor(rect.height || 160));

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
      }
    };

    updateCanvasSize();
    const resizeObserver = new ResizeObserver(() => updateCanvasSize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    let phase = 0;
    let lastDbTime = 0;

    const render = (time: number) => {
      phase += 0.04;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      if (width <= 0 || height <= 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Theme-adaptive canvas background
      ctx.fillStyle = isDark ? "#0B0F19" : "#F8FAFC";
      ctx.fillRect(0, 0, width, height);

      // Cyber telemetry grid
      ctx.strokeStyle = isDark ? "rgba(30, 41, 59, 0.45)" : "rgba(226, 232, 240, 0.85)";
      ctx.lineWidth = 1;
      const gridGap = 24;
      for (let x = 0; x < width; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Check if real active audio is flowing through analyser
      if (analyserNode && isPlayingOrRecording) {
        const bufferLength = analyserNode.frequencyBinCount;
        if (!timeDataRef.current || timeDataRef.current.length !== bufferLength) {
          timeDataRef.current = new Uint8Array(bufferLength);
          freqDataRef.current = new Uint8Array(bufferLength);
        }

        const timeData = timeDataRef.current;
        const freqData = freqDataRef.current!;

        analyserNode.getByteTimeDomainData(timeData);
        analyserNode.getByteFrequencyData(freqData);

        // Compute RMS and peak
        let sumSquares = 0;
        let maxDev = 0;
        for (let i = 0; i < bufferLength; i++) {
          const norm = (timeData[i] - 128) / 128.0;
          sumSquares += norm * norm;
          const absVal = Math.abs(norm);
          if (absVal > maxDev) maxDev = absVal;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        const computedDb = rms > 0.0005 ? Math.max(-60, Math.round(20 * Math.log10(rms))) : -60;

        if (time - lastDbTime > 120) {
          lastDbTime = time;
          setLiveCalculatedDb(computedDb);
        }

        // Dynamic AGC boost for human voice (laptop mics can be quiet)
        const dynamicGain = maxDev > 0.01 ? Math.min(8.0, Math.max(2.5, 0.45 / maxDev)) : 4.0;

        // 1. Spectrum Bars (Bottom/Back Layer)
        if (visualMode === "spectrum" || visualMode === "hybrid") {
          const barCount = 48;
          const totalSlot = width / barCount;
          const barWidth = Math.max(3, totalSlot * 0.75);
          const barGap = totalSlot * 0.25;

          for (let i = 0; i < barCount; i++) {
            // Voice-weighted logarithmic frequency bin distribution
            const binIdx = Math.min(
              bufferLength - 1,
              Math.floor(Math.pow(i / barCount, 1.35) * (bufferLength * 0.8))
            );
            const val = freqData[binIdx] || 0;
            // Boost sensitivity
            const boostedPercent = Math.min(1.0, (val / 255) * 1.45);
            const maxBarH = height * 0.8;
            const barH = Math.max(4, boostedPercent * maxBarH);

            const x = i * (barWidth + barGap) + barGap / 2;
            const y = height - barH;

            // Vibrant Indigo/Cyan gradient
            const barGrad = ctx.createLinearGradient(0, height, 0, y);
            barGrad.addColorStop(0, "rgba(99, 102, 241, 0.15)");
            barGrad.addColorStop(0.5, "rgba(99, 102, 241, 0.7)");
            barGrad.addColorStop(1, "rgba(56, 189, 248, 0.95)");

            ctx.fillStyle = barGrad;
            ctx.shadowColor = "rgba(56, 189, 248, 0.4)";
            ctx.shadowBlur = 4;

            ctx.beginPath();
            if (typeof (ctx as any).roundRect === "function") {
              (ctx as any).roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
            } else {
              ctx.rect(x, y, barWidth, barH);
            }
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // 2. Oscillogram Waveform (Top Layer)
        if (visualMode === "waveform" || visualMode === "hybrid") {
          ctx.lineWidth = visualMode === "waveform" ? 3.0 : 2.2;
          const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
          waveGrad.addColorStop(0, "#6366F1");
          waveGrad.addColorStop(0.4, "#818CF8");
          waveGrad.addColorStop(0.7, "#38BDF8");
          waveGrad.addColorStop(1, "#34D399");

          ctx.strokeStyle = waveGrad;
          ctx.shadowColor = "rgba(99, 102, 241, 0.8)";
          ctx.shadowBlur = 8;

          ctx.beginPath();
          const sliceWidth = width / (bufferLength - 1);
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const rawNorm = (timeData[i] - 128) / 128.0;
            // Apply dynamic AGC voice amplification
            const boosted = Math.max(-0.95, Math.min(0.95, rawNorm * dynamicGain));
            const y = height / 2 + boosted * (height * 0.42);

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      } else {
        // Idle Mode: Vivid, multi-layered moving harmonic waves
        setLiveCalculatedDb(-55);

        // Layer 1: Ambient Cyan Glow Wave
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y =
            height / 2 +
            Math.sin(x * 0.015 - phase * 0.8) * 12 +
            Math.cos(x * 0.03 + phase) * 6;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Layer 2: Main Indigo Primary Wave
        ctx.lineWidth = 2.4;
        const idleGrad = ctx.createLinearGradient(0, 0, width, 0);
        idleGrad.addColorStop(0, "#6366F1");
        idleGrad.addColorStop(0.5, "#818CF8");
        idleGrad.addColorStop(1, "#38BDF8");
        ctx.strokeStyle = idleGrad;
        ctx.shadowColor = "rgba(99, 102, 241, 0.7)";
        ctx.shadowBlur = 8;

        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y =
            height / 2 +
            Math.sin(x * 0.02 + phase) * 18 +
            Math.sin(x * 0.045 - phase * 1.4) * 8 +
            Math.cos(x * 0.01 + phase * 0.5) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Subtle Center Baseline
        ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [analyserNode, isPlayingOrRecording, visualMode, isDark]);

  const displayDb = isPlayingOrRecording
    ? liveCalculatedDb > -60
      ? `${liveCalculatedDb} dB`
      : typeof energyDb === "number" && Number.isFinite(energyDb) && energyDb > -60
      ? `${energyDb.toFixed(0)} dB`
      : "-48 dB"
    : t("standby");

  return (
    <div className="relative flex flex-col p-4 bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs dark:shadow-xl backdrop-blur-md transition-colors">
      {/* Header Controls */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <Waves className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
              {t("live_acoustic_graph")}
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {isPlayingOrRecording ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {t("streaming_active")} ({audioSourceLabel})
                </span>
              ) : (
                <span className="text-indigo-600 dark:text-indigo-300 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                  {t("oscilloscope_ready")}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Visual Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0F172A] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
          <button
            onClick={() => setVisualMode("hybrid")}
            className={`px-2 py-1 rounded transition-all cursor-pointer font-medium ${
              visualMode === "hybrid" ? "bg-indigo-600 text-white font-semibold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("hybrid")}
          </button>
          <button
            onClick={() => setVisualMode("waveform")}
            className={`px-2 py-1 rounded transition-all cursor-pointer font-medium ${
              visualMode === "waveform" ? "bg-indigo-600 text-white font-semibold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("oscilloscope")}
          </button>
          <button
            onClick={() => setVisualMode("spectrum")}
            className={`px-2 py-1 rounded transition-all cursor-pointer font-medium ${
              visualMode === "spectrum" ? "bg-indigo-600 text-white font-semibold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t("fft_spectrum")}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="relative w-full h-36 sm:h-44 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F19] transition-colors">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Real-time telemetry badge */}
        <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded bg-white/95 dark:bg-[#0F172A]/90 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-indigo-700 dark:text-indigo-300 shadow-xs">
          {t("signal")}: <strong className="text-slate-900 dark:text-white">{displayDb}</strong>
        </div>
      </div>
    </div>
  );
};

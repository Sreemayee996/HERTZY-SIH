import React, { useState } from "react";
import {
  X,
  History,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Download,
  Search,
  ExternalLink,
  Clock,
  FileAudio,
} from "lucide-react";
import { SavedSession } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface AnalysisHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SavedSession[];
  onSelectSession: (session: SavedSession) => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
}

export const AnalysisHistoryModal: React.FC<AnalysisHistoryModalProps> = ({
  isOpen,
  onClose,
  sessions = [],
  onSelectSession,
  onDeleteSession,
  onClearAllSessions,
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filtered = sessions.filter(
    (s) =>
      s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.transcript?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.riskCategory?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCsv = () => {
    if (sessions.length === 0) return;
    const headers = "ID,Title,Date,RiskScore,RiskCategory,DeepfakeProbability,DurationSeconds,SuspiciousWordsCount\n";
    const rows = sessions
      .map(
        (s) =>
          `"${s.id}","${(s.title || "").replace(/"/g, '""')}","${s.analyzedAt}",${Number.isFinite(s.overallRiskScore) ? s.overallRiskScore : 0},"${s.riskCategory || "Very Low"}",${Number.isFinite(s.deepfakeConfidence) ? s.deepfakeConfidence : 0},${Number.isFinite(s.audioDurationSeconds) ? s.audioDurationSeconds : 0},${Number.isFinite(s.suspiciousWordsCount) ? s.suspiciousWordsCount : 0}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Hertzy_Analysis_History_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">{t("vault_history_title")}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sessions.length} {t("saved_audit_sessions")}
              </p>
            </div>
          </div>

          <button
            id="close-history-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="history-search-input"
              type="text"
              placeholder={t("search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="export-csv-history-btn"
              onClick={handleExportCsv}
              disabled={sessions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0F19] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("export_csv")}</span>
            </button>

            <button
              id="clear-all-history-btn"
              onClick={onClearAllSessions}
              disabled={sessions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("clear_all")}</span>
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {filtered.length > 0 ? (
            filtered.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{s.title}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                      style={{
                        backgroundColor: `${s.riskColor || "#10b981"}20`,
                        color: s.riskColor || "#10b981",
                        border: `1px solid ${s.riskColor || "#10b981"}40`,
                      }}
                    >
                      {t("risk")}: {Number.isFinite(s.overallRiskScore) ? s.overallRiskScore : 0}/100 ({s.riskCategory || "Safe"})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {new Date(s.analyzedAt).toLocaleString()}
                    </span>
                    <span>• {Number.isFinite(s.audioDurationSeconds) ? s.audioDurationSeconds : 0}s {t("duration")}</span>
                    <span>• {Number.isFinite(s.suspiciousWordsCount) ? s.suspiciousWordsCount : 0} {t("threat_words")}</span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-1 italic pt-0.5">
                    "{s.transcript}"
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onSelectSession(s);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    <span>{t("load")}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteSession(s.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center justify-center">
              <FileAudio className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-2" />
              <span>{t("no_audit_logs")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

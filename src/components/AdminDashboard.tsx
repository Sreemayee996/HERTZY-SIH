import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Search,
  Users,
  Radio,
  FileAudio,
  Mic,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { AnalysisRecord } from "../types";

interface AdminDashboardProps {
  onExit?: () => void;
}

const ADMIN_SESSION_KEY = "hertzy_admin_session_key";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  // Authentication State
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [storedAdminKey, setStoredAdminKey] = useState<string | null>(() => {
    try {
      // Strictly use sessionStorage (session-only, never normal user localStorage)
      return sessionStorage.getItem(ADMIN_SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Data State
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [totalAnalyses, setTotalAnalyses] = useState<number>(0);
  const [uniqueUsers, setUniqueUsers] = useState<number>(0);
  const [averageRiskScore, setAverageRiskScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter State
  const [searchUserId, setSearchUserId] = useState<string>("");
  const [inputFilter, setInputFilter] = useState<string>("all");

  // If a session key was previously saved in sessionStorage, try verifying it
  useEffect(() => {
    if (storedAdminKey) {
      verifyAndFetch(storedAdminKey);
    }
  }, []);

  const verifyAndFetch = async (key: string) => {
    setIsVerifying(true);
    setAuthError(null);
    setFetchError(null);

    try {
      const res = await fetch("/api/admin/analyses", {
        headers: { "x-admin-key": key },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid admin key. Access denied.");
        }
        throw new Error(`Server returned error status ${res.status}`);
      }

      const data = await res.json();
      const records: AnalysisRecord[] = Array.isArray(data.analyses)
        ? data.analyses
        : Array.isArray(data)
        ? data
        : [];

      // Update records (sorted newest first)
      const sortedRecords = [...records].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      setAnalyses(sortedRecords);

      // Total analyses
      const total = data.totalAnalyses ?? sortedRecords.length;
      setTotalAnalyses(total);

      // Unique users
      const usersCount =
        data.uniqueUsers ?? new Set(sortedRecords.map((r) => r.userId)).size;
      setUniqueUsers(usersCount);

      // Average risk score
      const avgScore =
        data.averageRiskScore ??
        (sortedRecords.length > 0
          ? Math.round(
              sortedRecords.reduce((sum, r) => sum + (Number(r.riskScore) || 0), 0) /
                sortedRecords.length
            )
          : 0);
      setAverageRiskScore(avgScore);

      // Persist in session storage only
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, key);
      } catch (_) {}
      setStoredAdminKey(key);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err?.message || "Authentication failed.");
      setIsAuthenticated(false);
      try {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
      } catch (_) {}
      setStoredAdminKey(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = adminKeyInput.trim();
    if (!trimmed) {
      setAuthError("Please enter the admin key.");
      return;
    }
    verifyAndFetch(trimmed);
  };

  const handleLock = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (_) {}
    setStoredAdminKey(null);
    setIsAuthenticated(false);
    setAnalyses([]);
    setAdminKeyInput("");
    setAuthError(null);
  };

  const refreshData = () => {
    if (storedAdminKey) {
      setIsLoading(true);
      verifyAndFetch(storedAdminKey).finally(() => setIsLoading(false));
    }
  };

  // Filtered analysis list
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((item) => {
      if (searchUserId.trim()) {
        const query = searchUserId.trim().toLowerCase();
        if (!item.userId.toLowerCase().includes(query)) return false;
      }
      if (inputFilter !== "all") {
        if (item.input.toLowerCase() !== inputFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [analyses, searchUserId, inputFilter]);

  // Risk color helper
  const getRiskBadge = (score: number) => {
    if (score <= 30) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    }
    if (score <= 60) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    }
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Hertzy Admin</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Analyses Console
              </span>
            </div>
            <p className="text-xs text-slate-400">Anonymous analysis history telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <button
                id="admin-refresh-button"
                onClick={refreshData}
                disabled={isLoading || isVerifying}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Refresh analysis records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isVerifying ? "animate-spin text-indigo-400" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                id="admin-lock-button"
                onClick={handleLock}
                className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-300 hover:text-red-200 text-xs font-medium border border-red-800/40 transition flex items-center gap-1.5 cursor-pointer"
                title="Lock admin page"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock</span>
              </button>
            </>
          )}

          {onExit && (
            <button
              id="admin-back-button"
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!isAuthenticated ? (
          /* ============================================================ */
          /* UNLOCKED: Admin Access Key Challenge                         */
          /* ============================================================ */
          <div className="max-w-md mx-auto mt-16 p-6 sm:p-8 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Admin Access</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Please enter your administrator key to access the analysis history and telemetry.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Admin Key
                </label>
                <input
                  id="admin-key-input"
                  type="password"
                  value={adminKeyInput}
                  onChange={(e) => {
                    setAdminKeyInput(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Enter admin key..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                id="admin-unlock-button"
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Key...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Zero-Retention Architecture</span>
              </div>
              <p>
                Analyses store only timestamp, anonymous user ID, input type, risk score, and result. No audio or transcripts are retained.
              </p>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* UNLOCKED: Stats Summary and Table                             */
          /* ============================================================ */
          <div className="space-y-6">
            {/* KPI Cards: Total analyses, Unique users, Average risk score */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Analyses */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Total analyses</span>
                  <Activity className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">
                  {totalAnalyses}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Recorded in /data/analyses.jsonl
                </div>
              </div>

              {/* Unique Users */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Unique users</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">
                  {uniqueUsers}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Anonymous client browser tokens
                </div>
              </div>

              {/* Average Risk Score */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Average risk score</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-white tracking-tight">
                    {averageRiskScore}
                    <span className="text-sm font-normal text-slate-500">/100</span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                      averageRiskScore > 60
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : averageRiskScore > 30
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {averageRiskScore > 60
                      ? "High"
                      : averageRiskScore > 30
                      ? "Moderate"
                      : "Low"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Mean score across recorded analyses
                </div>
              </div>
            </div>

            {/* Simple Search & Filter Bar */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search by User ID */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-search-userid"
                  type="text"
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                  placeholder="Search by User ID (e.g. U-A31F92C1)..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchUserId && (
                  <button
                    onClick={() => setSearchUserId("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter by Input */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400">Input:</span>
                <select
                  id="admin-filter-input"
                  value={inputFilter}
                  onChange={(e) => setInputFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Inputs</option>
                  <option value="microphone">Microphone</option>
                  <option value="upload">Upload</option>
                  <option value="sample">Sample</option>
                </select>
              </div>
            </div>

            {/* Analysis History Table: Time | User ID | Input | Risk Score | Result */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Analysis Records ({filteredAnalyses.length})
                </h2>
                <span className="text-xs text-slate-500">Newest records appear first</span>
              </div>

              {filteredAnalyses.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  {analyses.length === 0
                    ? "No analyses recorded yet."
                    : "No records match your filter criteria."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                        <th className="px-4 py-3 font-semibold">Time</th>
                        <th className="px-4 py-3 font-semibold">User ID</th>
                        <th className="px-4 py-3 font-semibold">Input</th>
                        <th className="px-4 py-3 font-semibold">Risk Score</th>
                        <th className="px-4 py-3 font-semibold">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAnalyses.map((record, index) => (
                        <tr key={`${record.time}_${record.userId}_${index}`} className="hover:bg-slate-900/40 transition">
                          {/* Time */}
                          <td className="px-4 py-3 text-slate-300 font-mono whitespace-nowrap">
                            {new Date(record.time).toLocaleString()}
                          </td>

                          {/* User ID */}
                          <td className="px-4 py-3 font-mono text-indigo-300 font-semibold whitespace-nowrap">
                            <span
                              onClick={() => setSearchUserId(record.userId)}
                              className="cursor-pointer hover:underline"
                              title="Click to filter by this User ID"
                            >
                              {record.userId}
                            </span>
                          </td>

                          {/* Input */}
                          <td className="px-4 py-3 capitalize text-slate-300">
                            <span className="inline-flex items-center gap-1.5">
                              {record.input.toLowerCase() === "microphone" && (
                                <Mic className="w-3.5 h-3.5 text-sky-400" />
                              )}
                              {record.input.toLowerCase() === "upload" && (
                                <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              {record.input.toLowerCase() === "sample" && (
                                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                              )}
                              <span>{record.input}</span>
                            </span>
                          </td>

                          {/* Risk Score */}
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold border ${getRiskBadge(
                                Number(record.riskScore) || 0
                              )}`}
                            >
                              {record.riskScore}/100
                            </span>
                          </td>

                          {/* Result */}
                          <td className="px-4 py-3 text-slate-200">
                            <span className="font-medium">{record.result}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

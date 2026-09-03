import React, { useState, useEffect } from "react";
import {
  Lock,
  User as UserIcon,
  ChevronRight,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Fingerprint,
  RefreshCw,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import { User } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

interface LoginPageProps {
  onLoginSuccess: (user: User, remember: boolean) => void;
}

// Registered authorized credentials
const VALID_CREDENTIALS: Record<
  string,
  { password: string; user: User }
> = {
  demo: {
    password: "demo123",
    user: {
      id: "usr_demo_01",
      name: "Demo User",
      email: "demo@dhwani.security",
      role: "Fraud Investigator",
      avatar: "DU",
      organization: "National Cyber Fraud Defense Lab",
    },
  },
  "demo@dhwani.app": {
    password: "demo123",
    user: {
      id: "usr_demo_01",
      name: "Demo User",
      email: "demo@dhwani.security",
      role: "Fraud Investigator",
      avatar: "DU",
      organization: "National Cyber Fraud Defense Lab",
    },
  },
  elena: {
    password: "demo123",
    user: {
      id: "usr_cso_01",
      name: "Demo User",
      email: "elena.rostova@cyberdefense.org",
      role: "Chief Security Officer",
      avatar: "DU",
      organization: "Global Threat Intelligence Lab",
    },
  },
  aarav: {
    password: "demo123",
    user: {
      id: "usr_fraud_02",
      name: "Demo User",
      email: "aarav.sharma@finsec.in",
      role: "Fraud Investigator",
      avatar: "DU",
      organization: "National Cyber Crime Unit",
    },
  },
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Countdown timer for security lockout
  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  const handleFillDemoCredentials = () => {
    setLoginId("demo");
    setPassword("demo123");
    setErrorMessage(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    const trimmedId = loginId.trim().toLowerCase();
    const trimmedPw = password.trim();

    if (!trimmedId || !trimmedPw) {
      setErrorMessage(t("enter_credentials_error"));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Simulate cryptographic verification & access token exchange
    setTimeout(() => {
      setIsLoading(false);

      const matched = VALID_CREDENTIALS[trimmedId];

      if (matched && matched.password === trimmedPw) {
        setFailedAttempts(0);
        onLoginSuccess(matched.user, rememberMe);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 4) {
          setLockoutTimer(30);
          setErrorMessage("Too many failed attempts. Security rate-limit active for 30 seconds.");
        } else {
          setErrorMessage(
            `${t("invalid_credentials_error")} (${4 - nextAttempts} attempts remaining).`
          );
        }
      }
    }, 650);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19] p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-6 sm:p-10 backdrop-blur-xl transition-colors">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              H
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Hertzy
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("app_tagline")}</p>
            </div>
          </div>

          {/* Language & Theme Controls on Login Screen */}
          <div className="flex items-center gap-2">
            <button
              id="login-theme-toggle"
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title={isDark ? "Switch to Light" : "Switch to Dark"}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            </button>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs">
              <Languages className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <select
                id="login-language-select"
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs text-indigo-600 dark:text-indigo-300 font-medium focus:outline-none cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-200">
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Demo Credentials Quick-Action Banner */}
        <div className="mb-6 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <span className="font-semibold text-indigo-950 dark:text-white">{t("demo_credentials_title")}</span>{" "}
              User: <code className="bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-300 font-mono font-bold">demo</code> &bull; Password: <code className="bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-300 font-mono font-bold">demo123</code>
            </div>
          </div>

          <button
            type="button"
            id="fill-demo-credentials-btn"
            onClick={handleFillDemoCredentials}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {t("auto_fill")}
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-shake shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-900 dark:text-red-200 mb-0.5">{t("auth_error_title")}</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Primary Secure Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {/* User ID Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("login_id_label")}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="login-username-input"
                type="text"
                required
                autoComplete="username"
                disabled={isLoading || lockoutTimer > 0}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder={t("login_id_placeholder")}
                className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Password Field with Show/Hide toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("security_password_label")}
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("default_label")} <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">demo123</span>
              </span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                disabled={isLoading || lockoutTimer > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me & security info */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                id="login-remember-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0F19] text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>{t("remember_session")}</span>
            </label>

            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono text-[11px]">
              <Fingerprint className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              TLS 1.3
            </span>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit-button"
            type="submit"
            disabled={isLoading || lockoutTimer > 0}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t("signing_in")}</span>
              </div>
            ) : lockoutTimer > 0 ? (
              <span>Locked ({lockoutTimer}s remaining)</span>
            ) : (
              <>
                <span>{t("sign_in_btn")}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};


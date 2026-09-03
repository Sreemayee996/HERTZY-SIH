import React from "react";
import {
  ShieldAlert,
  Mic,
  Activity,
  History,
  LogOut,
  Sparkles,
  Layers,
  HelpCircle,
  AudioWaveform,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import { User } from "../types";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenHistory: () => void;
  isAnalyzing: boolean;
  historyCount: number;
  selectedLanguage: string;
  onChangeLanguage: (lang: string) => void;
}

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi (हिंदी)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "bn", name: "Bengali (বাংলা)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "ml", name: "Malayalam (മലയാളം)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenHistory,
  isAnalyzing,
  historyCount,
  selectedLanguage,
  onChangeLanguage,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { currentLanguage, setLanguage, t } = useLanguage();

  const handleLanguageSelect = (newCode: string) => {
    setLanguage(newCode);
    onChangeLanguage(newCode);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md px-4 lg:px-6 h-16 shrink-0 transition-colors duration-200 flex items-center justify-between shadow-xs dark:shadow-none">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
        {/* Brand & Model Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white italic shadow-[0_0_12px_rgba(79,70,229,0.35)]">
            H
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white flex items-center">
              Hertzy
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight hidden sm:block">
              {t("app_tagline")}
            </p>
          </div>
        </div>

        {/* Global Controls & User Info */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* System Live indicator */}
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
              {isAnalyzing ? t("processing_audio") : t("system_live")}
            </span>
          </div>

          <div className="hidden md:block h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Dark / Light Mode Toggle Button */}
          <button
            id="theme-mode-toggle-btn"
            onClick={toggleTheme}
            type="button"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 shadow-xs"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-medium">{t("light")}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline font-medium">{t("dark")}</span>
              </>
            )}
          </button>

          {/* Target Translation Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#161D30] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <Languages className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold hidden lg:inline">
              {t("lang_label")}
            </span>
            <select
              id="global-target-language-select"
              value={currentLanguage}
              onChange={(e) => handleLanguageSelect(e.target.value)}
              className="bg-transparent text-xs text-indigo-600 dark:text-indigo-300 font-medium focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-white text-slate-800 dark:bg-[#0F172A] dark:text-slate-200">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* History Modal Trigger */}
          <button
            id="nav-history-btn"
            onClick={onOpenHistory}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">{t("history")}</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-600 text-white font-bold text-[10px] rounded-full">
                {historyCount}
              </span>
            )}
          </button>

          {/* User Profile Pill & Logout */}
          {currentUser ? (
            <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t("logged_in_as")}</p>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight">
                  {currentUser.name}
                </p>
              </div>

              <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {currentUser.avatar || currentUser.name.charAt(0)}
              </div>

              <button
                id="nav-logout-btn"
                onClick={onLogout}
                title={t("sign_out")}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};


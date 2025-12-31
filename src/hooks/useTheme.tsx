"use client";

import React, { useState, useEffect } from "react";

const THEME_KEY = "dashboard-theme";

export function useTheme() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 初回マウント時にlocalStorageから読み込み
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") {
      setIsDark(true);
    }
    setMounted(true);
  }, []);

  // テーマ変更時にlocalStorageへ保存
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    }
  }, [isDark, mounted]);

  const toggleTheme = () => setIsDark(!isDark);

  return { isDark, toggleTheme, mounted };
}

// テーマアイコンコンポーネント
export function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// テーマ切り替えボタン
export function ThemeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg transition ${
        isDark
          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
      }`}
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

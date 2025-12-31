"use client";

import { useState, useEffect } from "react";
import { useTheme, ThemeToggle } from "@/hooks/useTheme";

interface Clinic {
  id: string;
  name: string;
  slug: string;
  latestDate: string | null;
  summary: {
    totalDisplayCount: number;
    totalViewCount: number;
    totalRedirectCount: number;
    totalApplicationCount: number;
  };
}

export default function ClinicListPage() {
  const { isDark, toggleTheme, mounted } = useTheme();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClinics() {
      try {
        const res = await fetch("/api/clinics");
        if (res.ok) {
          const data = await res.json();
          setClinics(data.clinics || []);
        }
      } catch (error) {
        console.error("Failed to fetch clinics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchClinics();
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-3 w-16 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
      <header className={`border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className="max-w-6xl mx-auto px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className={`text-xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              Clinic Dashboard
            </h1>
            <p className={`text-xs mt-1 tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              採用メディア管理
            </p>
          </div>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse space-y-4 w-full max-w-md">
              <div className={`h-4 rounded w-3/4 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-4 rounded w-1/2 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-4 rounded w-2/3 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clinics.map((clinic) => (
              <a
                key={clinic.id}
                href={`/clinic/${clinic.slug}/guppy`}
                className={`rounded-2xl p-6 border transition-all hover:scale-[1.02] ${
                  isDark
                    ? "bg-slate-800 border-slate-700 hover:border-slate-600"
                    : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg"
                }`}
              >
                <h2 className={`text-base font-medium mb-4 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  {clinic.name}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      応募数
                    </p>
                    <p className={`text-2xl font-semibold tracking-tight ${
                      clinic.summary.totalApplicationCount > 0 ? "text-emerald-500" : isDark ? "text-slate-100" : "text-slate-800"
                    }`}>
                      {clinic.summary.totalApplicationCount}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      閲覧数
                    </p>
                    <p className={`text-2xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                      {clinic.summary.totalViewCount}
                    </p>
                  </div>
                </div>
                {clinic.latestDate && (
                  <p className={`text-xs mt-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    更新 {clinic.latestDate}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}

        {!loading && clinics.length === 0 && (
          <div className={`rounded-2xl p-12 border text-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
            <p className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              クリニックが登録されていません
            </p>
          </div>
        )}
      </main>

      <footer className={`border-t mt-8 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className={`max-w-6xl mx-auto px-8 py-4 text-center text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Powered by 株式会社KOU
        </div>
      </footer>
    </div>
  );
}

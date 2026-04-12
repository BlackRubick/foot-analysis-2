import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { PatientRegistrationPage } from './pages/PatientRegistrationPage';
import { PatientsListPage } from './pages/PatientsListPage';
import { CapturePage } from './pages/CapturePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ChainsAnalysisPage } from './pages/ChainsAnalysisPage';
import { ResultsPage } from './pages/ResultsPage';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/patients', label: 'Pacientes' },
  { path: '/patients/new', label: 'Registrar paciente' },
  { path: '/capture', label: 'Captura 3 cámaras' },
  { path: '/analysis', label: 'Análisis angular' },
  { path: '/chains', label: 'Cadenas musculares' },
  { path: '/results', label: 'Resultados & Reporte' },
];

export const AppShell: React.FC = () => {
  const location = useLocation();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-clinical-background dark:text-slate-100 flex flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-clinical-primary">Clínica Biomecánica</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Análisis integral de miembros inferiores</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-1.5 py-1 font-medium transition-colors ${
                    active
                      ? 'text-clinical-primary'
                      : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                  {active && (
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-clinical-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? (
                // Icono sol (modo claro)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-amber-400"
                  fill="currentColor"
                >
                  <path d="M12 4.5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1Zm0 17.5a1 1 0 0 1-1-1V19.5a1 1 0 1 1 2 0V21a1 1 0 0 1-1 1Zm9-9a1 1 0 0 1-1 1h-1.5a1 1 0 1 1 0-2H20a1 1 0 0 1 1 1ZM6.5 12a1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h1.5a1 1 0 0 1 1 1Zm11.01-5.51a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 0 1-1.42-1.42l1.06-1.05a1 1 0 0 1 1.42 0ZM8.97 16.03a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 0 1-1.41-1.42l1.05-1.05a1 1 0 0 1 1.42 0Zm9.47 1.47a1 1 0 0 1-1.42 0l-1.06-1.06a1 1 0 0 1 1.42-1.41l1.06 1.05a1 1 0 0 1 0 1.42ZM7.09 5.09a1 1 0 0 1 0 1.42L6.03 7.56A1 1 0 0 1 4.6 6.15L5.66 5.1a1 1 0 0 1 1.43 0ZM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7Z" />
                </svg>
              ) : (
                // Icono luna (modo oscuro)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-sky-300"
                  fill="currentColor"
                >
                  <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="mx-auto block border-t border-slate-200 px-6 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 md:hidden">
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-clinical-primary/10 text-clinical-primary'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                  }`}
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-6 space-y-4">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsListPage />} />
            <Route path="/patients/new" element={<PatientRegistrationPage />} />
            <Route path="/capture" element={<CapturePage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/chains" element={<ChainsAnalysisPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-zinc-950 text-white p-8">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-400"
        >
          <title>Sin conexión</title>
          <path d="M1 6s4-4 11-4 11 4 11 4" />
          <path d="M5 10s2.5-2 7-2 7 2 7 2" />
          <path d="M9 14s1-1 3-1 3 1 3 1" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Sin conexión</h1>
        <p className="text-sm text-zinc-400 max-w-xs">
          No hay conexión a internet. Revisa tu red e intenta de nuevo.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-xl bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}

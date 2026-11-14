import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Menu, Lock, KeyRound, Calendar, Sparkles, ChevronDown, Layers } from 'lucide-react';

export default function Navbar() {
  const { logout } = useAuth();
  const {
    setIsPinModalOpen,
    setIsMobileMenuOpen,
    seasons,
    selectedSeasonId,
    setSelectedSeasonId,
    setCurrentSection
  } = useApp();

  // Fecha de hoy en formato Día / Mes / Año (DD/MM/YYYY)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const today = `${day}/${month}/${year}`;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Mobile hamburger & Season Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Global Season Selector Pill */}
          <div className="flex items-center gap-1.5 p-1 pl-2.5 pr-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="hidden sm:inline text-xs font-bold text-slate-700">Temporada:</span>
            <div className="relative">
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="appearance-none bg-white hover:bg-slate-50 border border-blue-200/60 rounded-xl px-2.5 py-1 text-xs font-bold text-blue-900 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm max-w-[160px] sm:max-w-[240px] truncate"
                title="Cambiar temporada activa para ver sus datos"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_active === 1 ? '★ (Activa)' : '(Cerrada)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setCurrentSection('seasons')}
              className="p-1 hover:bg-blue-200/50 rounded-lg text-blue-600 transition-colors"
              title="Administrar y crear temporadas"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200/60">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{today}</span>
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Change PIN Button */}
          <button
            type="button"
            onClick={() => setIsPinModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200/60"
            title="Cambiar PIN general de acceso"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Cambiar PIN</span>
          </button>

          {/* Lock / Logout Session Button */}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200/80"
            title="Cerrar sesión / Bloquear aplicación"
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            <span>Bloquear</span>
          </button>

        </div>

      </div>
    </header>
  );
}

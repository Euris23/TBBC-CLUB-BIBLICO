import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users2,
  UserCheck,
  CalendarCheck,
  Award,
  Trophy,
  BarChart3,
  History,
  FileSpreadsheet,
  Settings,
  BookOpen,
  Lock,
  Database,
  ChevronRight
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, badge: null },
  { id: 'groups', label: 'Grupos', icon: Users2, badge: null },
  { id: 'participants', label: 'Chicos / Miembros', icon: UserCheck, badge: null },
  { id: 'attendance', label: 'Pasar Lista', icon: CalendarCheck, badge: null },
  { id: 'individual_scores', label: 'Puntos por Chico', icon: Award, badge: null },
  { id: 'group_scores', label: 'Puntos por Grupo', icon: Trophy, badge: null },
  { id: 'rankings', label: 'Tabla de Posiciones', icon: BarChart3, badge: null },
  { id: 'seasons', label: 'Temporadas', icon: History, badge: null },
  { id: 'reports', label: 'Reportes en Excel', icon: FileSpreadsheet, badge: null },
  { id: 'settings', label: 'Ajustes y PIN', icon: Settings, badge: null }
];

export default function Sidebar() {
  const { currentSection, setCurrentSection } = useApp();
  const { logout } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 select-none">
      
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white tracking-wide">
              TBBC CLUB
            </h2>
            <p className="text-xs font-semibold text-blue-400">
              CLUB BÍBLICO
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Módulos del Sistema
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentSection(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && !isActive && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {item.badge}
                </span>
              )}

              {isActive && (
                <ChevronRight className="w-4 h-4 text-blue-200" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Lock */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <p className="font-semibold text-white">SQLite Persistente</p>
            <p className="text-[11px] text-slate-400">Datos guardados en disco</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 rounded-xl border border-rose-500/30 transition-all"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Bloquear Acceso (PIN)</span>
        </button>
      </div>

    </aside>
  );
}

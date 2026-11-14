import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { NAV_ITEMS } from './Sidebar';
import {
  LayoutDashboard,
  CalendarCheck,
  Trophy,
  Users2,
  Menu,
  X,
  BookOpen,
  Lock,
  Database
} from 'lucide-react';

export default function MobileNav() {
  const { currentSection, setCurrentSection, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();
  const { logout } = useAuth();

  const handleSelectSection = (id) => {
    setCurrentSection(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Bottom Quick Navigation Bar for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => handleSelectSection('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            currentSection === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Inicio</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSection('groups')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            currentSection === 'groups' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users2 className="w-5 h-5" />
          <span className="text-[10px]">Grupos</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSection('attendance')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            currentSection === 'attendance' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-5 h-5" />
          <span className="text-[10px]">Pasar Lista</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSection('group_scores')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            currentSection === 'group_scores' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px]">Puntos</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 p-1.5 rounded-xl text-slate-500 hover:text-slate-800"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">Menú</span>
        </button>
      </div>

      {/* Slide-over Drawer for All Modules */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative flex flex-col w-4/5 max-w-sm bg-slate-900 text-slate-200 h-full shadow-2xl z-10">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">TBBC CLUB BÍBLICO</h3>
                  <p className="text-[11px] text-blue-400">Navegación Móvil</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && !isActive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-950/60">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/30"
              >
                <Lock className="w-4 h-4" />
                <span>Bloquear Acceso (PIN)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


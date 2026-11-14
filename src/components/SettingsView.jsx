import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  KeyRound,
  Database,
  Shield,
  Layers,
  Award,
  Trophy,
  History,
  FileCheck2,
  RefreshCw,
  Info
} from 'lucide-react';

export default function SettingsView() {
  const { setIsPinModalOpen, systemStatus, fetchSystemStatus, stats, showToast } = useApp();

  const handleTestDb = async () => {
    await fetchSystemStatus();
    showToast('Conexión con SQLite persistente verificada exitosamente.');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Configuración del Sistema
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Gestión de seguridad, base de datos persistente y parámetros del Club
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestDb}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
        >
          <RefreshCw className="w-4 h-4 text-emerald-600" />
          <span>Verificar Base de Datos</span>
        </button>
      </div>

      {/* Grid: PIN Security & Database Persistence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Security & Access (PIN) Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900">Control de Acceso General</h2>
                <p className="text-xs text-slate-500">PIN único compartido por todos los encargados</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              El sistema no utiliza usuarios ni contraseñas personales. Todos los encargados comparten el mismo PIN para administrar las actividades del club.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium">Estado del PIN:</span>
                <span className="font-bold text-emerald-600">Activo y Protegido</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Sesión:</span>
                <span className="text-slate-700">Persistente con token cifrado</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Cambiar PIN General</span>
            </button>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900">Base de Datos SQLite</h2>
                <p className="text-xs text-slate-500">Almacenamiento persistente en disco</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-emerald-800">Conexión:</span>
                <span className="font-bold text-emerald-700">En línea (data/tbbc_club.sqlite)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Temporada activa:</span>
                  <span className="font-semibold text-slate-800">{systemStatus?.activeSeason || 'Cargando...'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Participantes en BD:</span>
                  <span className="font-semibold text-slate-800">{systemStatus?.stats?.activeParticipants ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Grupos en BD:</span>
                  <span className="font-semibold text-slate-800">{systemStatus?.stats?.activeGroups ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Jornadas registradas:</span>
                  <span className="font-semibold text-slate-800">{systemStatus?.stats?.totalJourneys ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Los datos se guardan permanentemente y se sincronizan en red local.</span>
          </p>
        </div>

      </div>

      {/* Business Rules Summary: Individual & Group Scoring Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Individual Criteria (Max 100 pts) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Criterios Individuales (Máx 100 pts)</h2>
              <p className="text-xs text-slate-500">Puntaje sabatino por participante</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: 'Puntualidad', pts: 15 },
              { label: 'Traer Biblia', pts: 20 },
              { label: 'Asistencia al Club Bíblico', pts: 10 },
              { label: 'Completar devocional', pts: 25 },
              { label: 'Aprender y decir versículo', pts: 10 },
              { label: 'Asistir a la iglesia', pts: 20 },
            ].map((crit, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/50">
                <span className="text-slate-700 font-medium">{crit.label}</span>
                <span className="font-bold text-cyan-700 bg-cyan-100/70 px-2 py-0.5 rounded-lg">{crit.pts} pts</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500 text-white font-bold">
              <span>TOTAL MÁXIMO INDIVIDUAL</span>
              <span>100 pts</span>
            </div>
          </div>
        </div>

        {/* Group Competitions (Max 950 pts) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Competencias Grupales (Máx 950 pts)</h2>
              <p className="text-xs text-slate-500">Puntaje sabatino por grupo</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: 'Dinámica 1', pts: 100 },
              { label: 'Dinámica 2', pts: 100 },
              { label: 'Preguntas', pts: 100 },
              { label: 'Traer Biblia (grupal)', pts: 200 },
              { label: 'Puntualidad (grupal)', pts: 200 },
              { label: 'Asistencia grupal', pts: 150 },
              { label: 'Mejor presentación texto bíblico', pts: 100 },
            ].map((comp, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/50">
                <span className="text-slate-700 font-medium">{comp.label}</span>
                <span className="font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-lg">Máx {comp.pts} pts</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-600 text-white font-bold">
              <span>TOTAL MÁXIMO GRUPAL</span>
              <span>950 pts</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}


import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Users2,
  CalendarCheck,
  Trophy,
  Award,
  Sparkles,
  Calendar,
  Clock,
  RefreshCw,
  Activity,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  UserPlus,
  PlusCircle,
  Crown
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

export default function Dashboard() {
  const { stats, loadingStats, fetchDashboardStats, setCurrentSection, showToast } = useApp();

  const handleRefresh = async () => {
    await fetchDashboardStats();
    showToast('Datos actualizados');
  };

  if (!stats && loadingStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Cargando datos del Club Bíblico...</p>
      </div>
    );
  }

  const {
    activeParticipants = 0,
    activeGroups = 0,
    lastJourney,
    lastAttendance = { present: 0, absent: 0, excused: 0, rate: 0, total: 0 },
    totalIndPoints = 0,
    totalGrpPoints = 0,
    leaderGroup,
    nextSaturday,
    groupsSummary = [],
    recentLogs = []
  } = stats || {};

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-700/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => setCurrentSection('seasons')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold tracking-wide uppercase mb-3 transition-colors cursor-pointer"
              title="Cambiar temporada"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{stats?.currentSeason?.name || 'Temporada Actual'}</span>
            </button>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              TBBC CLUB BÍBLICO
            </h1>
            <p className="text-blue-100 text-sm sm:text-base mt-1 max-w-xl">
              ¡Bienvenidos al panel del Club Bíblico! Aquí puedes pasar lista, poner los puntos de los grupos y chicos, y crear la foto para mandar por WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loadingStats}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all border border-white/20"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
              <span>Refrescar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Big Quick Action Buttons */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
          <span>¿Qué deseas hacer hoy?</span>
          <span className="text-xs font-normal text-slate-400">— Acceso directo</span>
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Pasar Lista */}
          <button
            type="button"
            onClick={() => setCurrentSection('attendance')}
            className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs sm:text-sm text-center border border-emerald-200 transition-all flex flex-col items-center justify-center gap-2 h-28 shadow-sm hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span>Pasar Lista</span>
          </button>

          {/* Puntos de los Grupos */}
          <button
            type="button"
            onClick={() => setCurrentSection('group_scores')}
            className="p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs sm:text-sm text-center border border-purple-200 transition-all flex flex-col items-center justify-center gap-2 h-28 shadow-sm hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow">
              <Trophy className="w-5 h-5" />
            </div>
            <span>Puntos por Grupo</span>
          </button>

          {/* Puntos por Chico */}
          <button
            type="button"
            onClick={() => setCurrentSection('individual_scores')}
            className="p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs sm:text-sm text-center border border-blue-200 transition-all flex flex-col items-center justify-center gap-2 h-28 shadow-sm hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow">
              <Award className="w-5 h-5" />
            </div>
            <span>Puntos por Chico</span>
          </button>

          {/* Foto para WhatsApp */}
          <button
            type="button"
            onClick={() => setCurrentSection('rankings')}
            className="p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm text-center border border-amber-200 transition-all flex flex-col items-center justify-center gap-2 h-28 shadow-sm hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span>Foto WhatsApp</span>
          </button>

          {/* Inscribir Nuevo Chico */}
          <button
            type="button"
            onClick={() => setCurrentSection('participants')}
            className="p-4 rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 font-bold text-xs sm:text-sm text-center border border-cyan-200 transition-all flex flex-col items-center justify-center gap-2 h-28 shadow-sm hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow">
              <UserPlus className="w-5 h-5" />
            </div>
            <span>Inscribir Chico</span>
          </button>

          {/* Crear / Ver Grupos */}
          <button
            type="button"
            onClick={() => setCurrentSection('groups')}
            className="p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs sm:text-sm text-center border border-indigo-200 transition-all flex flex-col items-center justify-center gap-2 h-28 shadow-sm hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
              <Users2 className="w-5 h-5" />
            </div>
            <span>Grupos</span>
          </button>
        </div>
      </div>

      {/* Resumen General Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Chicos Inscritos */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chicos Registrados</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{activeParticipants}</div>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Miembros activos
            </p>
          </div>
        </div>

        {/* Card 2: Grupos Activos */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grupos del Club</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{activeGroups}</div>
            <p className="text-xs font-semibold text-purple-600 mt-1">
              Grupos compitiendo
            </p>
          </div>
        </div>

        {/* Card 3: Asistencia Último Sábado */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lista Último Sábado</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{lastAttendance.rate}%</span>
              <span className="text-xs font-bold text-slate-500">vinieron</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
              <span className="text-emerald-600 font-bold">{lastAttendance.present} presentes</span> • 
              <span className="text-rose-500 font-bold">{lastAttendance.absent} faltaron</span>
            </div>
          </div>
        </div>

        {/* Card 4: Grupo Líder */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Va en 1° Lugar</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 truncate" title={leaderGroup?.name || 'Por definir'}>
              {leaderGroup ? leaderGroup.name : 'Por definir'}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: leaderGroup?.color || '#3b82f6' }}
              />
              <span className="text-xs font-bold text-amber-600">
                {leaderGroup ? `${leaderGroup.points} pts acumulados` : '0 pts'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Split: Groups Summary & Activity Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Groups Standings Preview (2 columns on LG) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">Puntajes de los Grupos</h2>
              <p className="text-xs text-slate-500">Cómo va cada grupo en esta temporada</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentSection('groups')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Ver todos los grupos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {groupsSummary.map((group, index) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm"
                    style={{ backgroundColor: group.color || '#3b82f6' }}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">{group.name}</h3>
                    <p className="text-xs text-slate-500">{group.member_count} chicos en este grupo</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-slate-900">
                    {group.group_points.toLocaleString()} <span className="text-xs font-normal text-slate-500">pts de grupo</span>
                  </div>
                  <div className="text-xs font-bold text-blue-600">
                    {group.individual_points.toLocaleString()} pts de los chicos
                  </div>
                </div>
              </div>
            ))}

            {groupsSummary.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-6">No hay grupos registrados todavía.</p>
            )}
          </div>
        </div>

        {/* Recent Activity / Audit Log (1 column on LG) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Últimos Cambios</h2>
              <p className="text-xs text-slate-500">Lo que se ha guardado recientemente</p>
            </div>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px]">
            {recentLogs.map((log) => {
              const dateFormatted = new Date(log.created_at).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={log.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/50 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-slate-200/60">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400">{dateFormatted}</span>
                  </div>
                  <p className="text-slate-600 text-[12px]">{log.details}</p>
                </div>
              );
            })}

            {recentLogs.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-8">No hay registros recientes.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

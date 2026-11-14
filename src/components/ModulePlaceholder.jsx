import React from 'react';
import { useApp } from '../context/AppContext';
import { NAV_ITEMS } from './Sidebar';
import { Clock, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ModulePlaceholder({ sectionId }) {
  const { setCurrentSection } = useApp();
  const item = NAV_ITEMS.find((n) => n.id === sectionId) || {
    label: 'Módulo en Construcción',
    badge: 'Próxima Fase'
  };

  const Icon = item.icon || Clock;

  const phaseDescriptions = {
    groups: {
      phase: 'FASE 2',
      desc: 'Administración dinámica de grupos, creación, edición, color identificativo, asignación de participantes y activación/desactivación sin borrar historial.'
    },
    participants: {
      phase: 'FASE 2',
      desc: 'Administración de integrantes del club, altas, bajas lógicas, asignación de grupos, historial y consulta de puntos acumulados.'
    },
    attendance: {
      phase: 'FASE 3',
      desc: 'Pase de asistencia sabatino por jornada: Presente, Ausente o Excusado con filtros, botón de marcar todos y estadísticas en tiempo real.'
    },
    individual_scores: {
      phase: 'FASE 4',
      desc: 'Registro de puntos individuales (máx. 100 pts) con casillas de verificación para los 6 criterios bíblicos y cálculo automático.'
    },
    group_scores: {
      phase: 'FASE 5',
      desc: 'Tabla de competencias grupales (máx. 950 pts) con validaciones en tiempo real, suma automática y grupo ganador.'
    },
    rankings: {
      phase: 'FASE 6',
      desc: 'Clasificaciones y tablas de posiciones grupales e individuales acumuladas por semana, mes y temporada.'
    },
    seasons: {
      phase: 'FASE 6',
      desc: 'Gestión de jornadas e inicio/cierre de temporadas conservando el historial permanente de actividades.'
    },
    reports: {
      phase: 'FASE 8',
      desc: 'Generación y exportación de reportes completos en formatos Excel y PDF.'
    }
  };

  const details = phaseDescriptions[sectionId] || {
    phase: item.badge || 'Fase Siguiente',
    desc: 'Este módulo se implementará en la siguiente fase de desarrollo progresivo según el plan del proyecto.'
  };

  return (
    <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm text-center max-w-2xl mx-auto my-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm">
        <Icon className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-3">
        <Clock className="w-3.5 h-3.5" />
        <span>Programado para {details.phase}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
        {item.label}
      </h1>

      <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
        {details.desc}
      </p>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-6 flex items-start gap-3 text-left">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Desarrollo Progresivo:</strong> La Fase 1 (arquitectura, navegación, acceso general por PIN y conexión a base de datos persistente) está activa y verificada. Cada módulo se construirá de manera sólida conservando el estado.
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCurrentSection('dashboard')}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Regresar al Dashboard</span>
      </button>
    </div>
  );
}


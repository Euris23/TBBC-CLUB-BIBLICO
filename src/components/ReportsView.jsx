import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  Download,
  Database,
  Printer,
  Calendar,
  CheckCircle2,
  FileText,
  Users2,
  Award,
  Trophy,
  ShieldCheck,
  HardDriveDownload,
  HelpCircle
} from 'lucide-react';

export default function ReportsView() {
  const { token } = useAuth();
  const { showToast, selectedSeasonId } = useApp();
  const [downloading, setDownloading] = useState(null);

  // Trigger authenticated CSV download
  const downloadReport = async (reportType, fileName) => {
    try {
      setDownloading(reportType);
      const seasonParam = selectedSeasonId || 'all';
      const res = await fetch(`/api/reports/${reportType}/csv?seasonId=${seasonParam}`, {
        headers: { 'x-session-token': token }
      });

      if (!res.ok) {
        throw new Error('Error al generar reporte');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Archivo "${fileName}" descargado con éxito.`);
    } catch (err) {
      console.error(err);
      showToast('Error al descargar el archivo', 'error');
    } finally {
      setDownloading(null);
    }
  };

  // Download SQLite Backup
  const downloadDbBackup = async () => {
    try {
      setDownloading('db');
      const res = await fetch('/api/reports/backup/db', {
        headers: { 'x-session-token': token }
      });

      if (!res.ok) {
        throw new Error('Error al descargar base de datos');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_tbbc_club_${new Date().toISOString().slice(0, 10)}.sqlite`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Copia de respaldo SQLite descargada exitosamente.');
    } catch (err) {
      console.error(err);
      showToast('Error al descargar respaldo de base de datos', 'error');
    } finally {
      setDownloading(null);
    }
  };

  // Print friendly view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span>Descargas y Archivos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Descargar Reportes en Excel
          </h1>
          <p className="text-emerald-100 text-sm mt-1 max-w-xl">
            Descarga las listas de asistencia y los puntos en hojas de Excel para guardarlas en tu computadora o imprimirlas para la cartelera.
          </p>
        </div>

        {/* Quick Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-900 font-bold text-sm shadow-lg hover:bg-emerald-50 transition-all self-start md:self-auto"
        >
          <Printer className="w-4 h-4 text-emerald-600" />
          <span>Imprimir Resumen</span>
        </button>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Asistencia Semanal */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-lg">
              Lista de Asistencia
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Todos los sábados con quién vino, quién faltó y quién avisó, con sus fechas y grupos en Excel.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Compatible con Microsoft Excel (UTF-8 BOM)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => downloadReport('attendance', `asistencia_tbbc_club_${new Date().toISOString().slice(0, 10)}.csv`)}
            disabled={downloading === 'attendance'}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition-all"
          >
            {downloading === 'attendance' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar Excel / CSV</span>
          </button>
        </div>

        {/* Puntos Individuales */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-lg">
              Reporte de Puntos Individuales
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Desglose detallado por sábado de los 6 criterios (puntualidad, biblia, asistencia, devocional, versículo, iglesia) y reconocimientos especiales.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Máximo 100 puntos por sábado</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => downloadReport('individual-scores', `puntos_individuales_tbbc_club_${new Date().toISOString().slice(0, 10)}.csv`)}
            disabled={downloading === 'individual-scores'}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-all"
          >
            {downloading === 'individual-scores' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar Excel / CSV</span>
          </button>
        </div>

        {/* Puntos Grupales */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-4">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-lg">
              Reporte de Puntos Grupales
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Historial de puntuaciones por equipo en las 7 competencias y puntos manuales con su respectiva justificación.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
              <span>Incluye rubros estándar y puntos manuales con justificación</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => downloadReport('group-scores', `puntos_grupales_tbbc_club_${new Date().toISOString().slice(0, 10)}.csv`)}
            disabled={downloading === 'group-scores'}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-all"
          >
            {downloading === 'group-scores' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Database Backup Section */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-cyan-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Copia de Respaldo SQLite Completa</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Descargar Base de Datos Íntegra (.sqlite)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Obtén una copia física de todos los datos del club: participantes, grupos, temporadas, asistencias, puntuaciones, logs de auditoría e imágenes generadas. Guárdala en una memoria USB o Drive para máxima seguridad.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadDbBackup}
          disabled={downloading === 'db'}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-400/20 transition-all self-start md:self-auto shrink-0"
        >
          {downloading === 'db' ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <HardDriveDownload className="w-5 h-5" />
          )}
          <span>Descargar .sqlite</span>
        </button>
      </div>

      {/* Information Alert */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-3xl p-5 flex items-start gap-3.5">
        <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-800 block mb-1">
            Recomendación para coordinadores de TBBC CLUB BÍBLICO:
          </strong>
          Se recomienda descargar una copia de respaldo (.sqlite) o exportar las hojas de cálculo al finalizar cada temporada de actividades o antes de realizar cambios estructurales en los grupos.
        </div>
      </div>
    </div>
  );
}


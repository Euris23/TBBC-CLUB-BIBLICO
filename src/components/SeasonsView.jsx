import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trophy,
  Award,
  Users,
  X,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

export default function SeasonsView() {
  const { token } = useAuth();
  const {
    seasons,
    selectedSeasonId,
    setSelectedSeasonId,
    fetchSeasons,
    fetchDashboardStats,
    showToast
  } = useApp();

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    set_active: true
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open Create
  const handleOpenCreate = () => {
    const currentYear = new Date().getFullYear();
    setFormData({
      name: `Temporada ${currentYear} - Nueva Campaña`,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      set_active: true
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (season) => {
    setSelectedSeason(season);
    setFormData({
      name: season.name,
      start_date: season.start_date,
      end_date: season.end_date || '',
      is_active: season.is_active === 1
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('El nombre de la temporada es obligatorio.');
      return;
    }
    if (!formData.start_date) {
      setFormError('La fecha de inicio es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setIsCreateModalOpen(false);
        await fetchSeasons();
        if (data.season) {
          setSelectedSeasonId(String(data.season.id));
        }
        await fetchDashboardStats();
      } else {
        setFormError(data.message || 'Error al crear la temporada.');
      }
    } catch (err) {
      setFormError('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('El nombre no puede estar vacío.');
      return;
    }
    if (!formData.start_date) {
      setFormError('La fecha de inicio es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/seasons/${selectedSeason.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setIsEditModalOpen(false);
        await fetchSeasons();
        await fetchDashboardStats();
      } else {
        setFormError(data.message || 'Error al actualizar la temporada.');
      }
    } catch (err) {
      setFormError('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate Season
  const handleActivateSeason = async (season) => {
    try {
      const res = await fetch(`/api/seasons/${season.id}/activate`, {
        method: 'PATCH',
        headers: { 'x-session-token': token }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setSelectedSeasonId(String(season.id));
        await fetchSeasons();
        await fetchDashboardStats();
      } else {
        showToast(data.message || 'No se pudo activar la temporada.', 'error');
      }
    } catch (err) {
      showToast('Error de red al activar temporada.', 'error');
    }
  };

  // Delete Season
  const handleDeleteSeason = async (season) => {
    const confirmMsg = `¿Estás seguro de ELIMINAR la temporada "${season.name}"?\n\n- Se eliminarán sus jornadas y puntuaciones asociadas.\n- Esta acción no se puede deshacer.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/seasons/${season.id}`, {
        method: 'DELETE',
        headers: { 'x-session-token': token }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        await fetchSeasons();
        await fetchDashboardStats();
      } else {
        showToast(data.message || 'No se pudo eliminar la temporada.', 'error');
      }
    } catch (err) {
      showToast('Error de red al eliminar temporada.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Temporadas del Club
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Crea nuevas temporadas de actividades. Cada una empieza en 0 puntos sin borrar lo anterior.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Crear Nueva Temporada</span>
        </button>
      </div>

      {/* Info notice: Isolated seasons */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-start gap-3 text-xs text-slate-700">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-900 block font-bold mb-0.5">¡Todo queda guardado!</strong>
          Al crear o activar una nueva temporada, los puntos inician limpios en 0 para la nueva competencia, pero nunca se borra el historial de lo que se hizo antes.
        </div>
      </div>

      {/* Seasons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {seasons.map((season) => {
          const isActive = season.is_active === 1;
          const isSelected = String(season.id) === String(selectedSeasonId);

          return (
            <div
              key={season.id}
              className={`bg-white rounded-3xl p-6 border transition-all duration-200 shadow-sm flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                        {season.name}
                      </h2>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                          En Visualización
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateDMY(season.start_date)} al {season.end_date ? formatDateDMY(season.end_date) : 'En curso'}</span>
                    </p>
                  </div>

                  {isActive ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Activa</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-xs shrink-0">
                      Cerrada
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2.5 my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Jornadas</span>
                    <span className="text-base font-extrabold text-slate-800">
                      {season.journeys_count || 0}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-purple-600">Pts Grupal</span>
                    <span className="text-base font-extrabold text-purple-700">
                      {(season.total_group_points || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-blue-600">Pts Indiv.</span>
                    <span className="text-base font-extrabold text-blue-700">
                      {(season.total_individual_points || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!isSelected && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSeasonId(String(season.id));
                        showToast(`Visualizando datos de: ${season.name}`);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200/60"
                    >
                      Visualizar
                    </button>
                  )}

                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => handleActivateSeason(season)}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200/60"
                      title="Establecer como la temporada en curso del club"
                    >
                      Hacer Activa
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(season)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Editar temporada"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSeason(season)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Eliminar temporada"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL: Crear Temporada */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Crear Nueva Temporada</h3>
                  <p className="text-xs text-blue-100">Nuevo periodo de actividades sabatinas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de la Temporada *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Temporada 2026 - Conquistadores de la Fe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha Fin (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.set_active}
                  onChange={(e) => setFormData({ ...formData, set_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Establecer como Temporada Activa</span>
                  <span className="text-[11px] text-slate-500 block">Las nuevas jornadas y registros se asignarán a esta temporada</span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Temporada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Temporada */}
      {isEditModalOpen && selectedSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Editar Temporada</h3>
                  <p className="text-xs text-blue-100">{selectedSeason.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de la Temporada *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha Fin (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Temporada Activa</span>
                  <span className="text-[11px] text-slate-500 block">Activar este ciclo como vigente</span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

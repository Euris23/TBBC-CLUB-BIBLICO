import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Users2,
  Plus,
  Edit2,
  Power,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
  Check,
  AlertCircle,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

const PRESET_COLORS = [
  { name: 'Azul Real', hex: '#2563eb' },
  { name: 'Rojo Carmesí', hex: '#dc2626' },
  { name: 'Verde Esmeralda', hex: '#16a34a' },
  { name: 'Ámbar / Oro', hex: '#d97706' },
  { name: 'Púrpura Imperial', hex: '#9333ea' },
  { name: 'Cian Vibrante', hex: '#0891b2' },
  { name: 'Naranja Fuego', hex: '#ea580c' },
  { name: 'Rosa Intenso', hex: '#db2777' },
  { name: 'Índigo Profundo', hex: '#4f46e5' },
  { name: 'Teal Marino', hex: '#0d9488' }
];

export default function GroupsView() {
  const { token } = useAuth();
  const { showToast, fetchDashboardStats } = useApp();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    color: '#2563eb',
    logo: '',
    description: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups?includeInactive=${showInactive}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error('Error al cargar grupos:', err);
      showToast('Error al cargar grupos de la base de datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchGroups();
  }, [token, showInactive]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)].hex,
      logo: '',
      description: ''
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      color: group.color,
      logo: group.logo || '',
      description: group.description || ''
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = async (group) => {
    setSelectedGroup(group);
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setGroupDetail(data);
      }
    } catch (err) {
      console.error('Error al cargar detalle del grupo:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Submit Create Group
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('El nombre del grupo es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/groups', {
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
        await fetchGroups();
        await fetchDashboardStats();
      } else {
        setFormError(data.message || 'Error al crear el grupo.');
      }
    } catch (err) {
      setFormError('Error de conexión al guardar el grupo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Group
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('El nombre del grupo es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({
          ...formData,
          is_active: selectedGroup.is_active
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setIsEditModalOpen(false);
        await fetchGroups();
        await fetchDashboardStats();
      } else {
        setFormError(data.message || 'Error al actualizar el grupo.');
      }
    } catch (err) {
      setFormError('Error de conexión al actualizar el grupo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (group) => {
    const actionText = group.is_active === 1 ? 'desactivar' : 'reactivar';
    const confirmMessage = group.is_active === 1
      ? `¿Estás seguro de desactivar el grupo "${group.name}"?\n\nNOTA: Todo su historial de puntuaciones y participantes se conservará permanentemente.`
      : `¿Deseas reactivar el grupo "${group.name}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/groups/${group.id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'x-session-token': token }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        await fetchGroups();
        await fetchDashboardStats();
      } else {
        showToast(data.message || `No se pudo ${actionText} el grupo.`, 'error');
      }
    } catch (err) {
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  // Delete group permanently
  const handleDeleteGroup = async (group) => {
    const confirmMessage = `¿Estás seguro de ELIMINAR PERMANENTEMENTE el grupo "${group.name}"?\n\n- Los participantes asignados quedarán sin grupo (no se borrarán).\n- Esta acción no se puede deshacer.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
        headers: { 'x-session-token': token }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        await fetchGroups();
        await fetchDashboardStats();
      } else {
        showToast(data.message || 'No se pudo eliminar el grupo.', 'error');
      }
    } catch (err) {
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const activeCount = groups.filter((g) => g.is_active === 1).length;
  const inactiveCount = groups.filter((g) => g.is_active === 0).length;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Grupos del Club
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Crea nuevos grupos, cambia sus colores o edita sus nombres
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Crear Nuevo Grupo</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar grupo por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between w-full md:w-auto gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {activeCount} Activos
            </span>
            {inactiveCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold border border-slate-200">
                {inactiveCount} Inactivos
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="text-slate-600">Mostrar inactivos</span>
          </label>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Cargando grupos de la base de datos...</p>
        </div>
      )}

      {/* Groups Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredGroups.map((group) => {
            const isInactive = group.is_active === 0;

            return (
              <div
                key={group.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md flex flex-col justify-between ${
                  isInactive ? 'border-slate-200 opacity-70 bg-slate-50/50' : 'border-slate-200/90'
                }`}
              >
                {/* Colored Top Accent Bar */}
                <div
                  className="h-3 w-full"
                  style={{ backgroundColor: group.color || '#2563eb' }}
                />

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Name, color badge, and status */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-sm shrink-0"
                          style={{ backgroundColor: group.color || '#2563eb' }}
                        >
                          {group.logo ? (
                            <img src={group.logo} alt={group.name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            group.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                            {group.name}
                          </h2>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: group.color }}
                            />
                            <span className="text-[11px] font-mono text-slate-400 uppercase">
                              {group.color}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isInactive ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                          Inactivo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Activo
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 min-h-[32px]">
                      {group.description || 'Sin descripción asignada.'}
                    </p>

                    {/* Statistics Metrics */}
                    <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">Integrantes</span>
                        <span className="text-base font-extrabold text-slate-800">
                          {group.active_members_count}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">Pts Grupal</span>
                        <span className="text-base font-extrabold text-purple-700">
                          {group.group_points.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">Pts Indiv.</span>
                        <span className="text-base font-extrabold text-blue-700">
                          {group.individual_points.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(group)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      title="Ver chicos que están en este grupo"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ver Chicos</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(group)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                        title="Cambiar nombre o color del grupo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200"
                        title="Eliminar este grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Borrar</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredGroups.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm max-w-md mx-auto">
          <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No se encontraron grupos</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {searchTerm ? 'Intenta con otro término de búsqueda.' : 'Crea tu primer grupo para comenzar.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Grupo Ahora</span>
          </button>
        </div>
      )}

      {/* MODAL: Crear Grupo */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Users2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Nuevo Grupo</h3>
                  <p className="text-xs text-purple-100">Registrar un nuevo escuadrón</p>
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
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Soldados de Cristo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Color Identificativo *
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.hex })}
                      className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                        formData.color === c.hex ? 'scale-110 shadow-md ring-2 ring-slate-900' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {formData.color === c.hex && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono"
                    placeholder="#2563eb"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Lema, versículo o descripción del grupo..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

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
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Grupo */}
      {isEditModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Editar Grupo</h3>
                  <p className="text-xs text-blue-100">{selectedGroup.name}</p>
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
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Color Identificativo *
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.hex })}
                      className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                        formData.color === c.hex ? 'scale-110 shadow-md ring-2 ring-slate-900' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {formData.color === c.hex && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

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

      {/* MODAL: Detalle de Grupo & Miembros */}
      {isDetailModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div
              className="p-5 text-white flex items-center justify-between"
              style={{ backgroundColor: selectedGroup.color || '#2563eb' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-extrabold text-white text-lg">
                  {selectedGroup.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">{selectedGroup.name}</h3>
                  <p className="text-xs text-white/80">Detalle de integrantes y puntuaciones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-500 text-xs">Cargando detalles...</div>
              ) : (
                <>
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Total Integrantes</span>
                      <span className="text-xl font-extrabold text-slate-800">
                        {groupDetail?.members?.length || 0}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                      <span className="block text-[10px] font-bold uppercase text-purple-600">Puntos Grupales</span>
                      <span className="text-xl font-extrabold text-purple-700">
                        {selectedGroup.group_points?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-center col-span-2 sm:col-span-1">
                      <span className="block text-[10px] font-bold uppercase text-blue-600">Puntos Integrantes</span>
                      <span className="text-xl font-extrabold text-blue-700">
                        {selectedGroup.individual_points?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>

                  {/* Members List */}
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Participantes Asignados ({groupDetail?.members?.length || 0})</span>
                    </h4>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {groupDetail?.members?.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="font-bold text-slate-800">{m.full_name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">Desde: {formatDateDMY(m.entry_date)}</span>
                        </div>
                      ))}

                      {(!groupDetail?.members || groupDetail.members.length === 0) && (
                        <p className="text-xs text-slate-400 py-3 text-center">No hay integrantes asignados a este grupo aún.</p>
                      )}
                    </div>
                  </div>

                  {/* Scores History by Journey */}
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-purple-600" />
                      <span>Historial de Competencias Sabatinas</span>
                    </h4>

                    <div className="space-y-2">
                      {groupDetail?.scoresHistory?.map((s) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/60 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{formatDateDMY(s.journey_date)}</span>
                            <p className="text-[11px] text-slate-500">{s.journey_title}</p>
                            {s.manual_points_reason && (
                              <p className="text-[10px] text-amber-800 font-bold mt-1 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300/60 inline-block">
                                ★ Justificación ({s.manual_points > 0 ? '+' : ''}{s.manual_points} pts): {s.manual_points_reason}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-purple-700">{s.total} pts</span>
                            <span className="block text-[10px] text-slate-400">máx. 950 pts</span>
                          </div>
                        </div>
                      ))}

                      {(!groupDetail?.scoresHistory || groupDetail.scoresHistory.length === 0) && (
                        <p className="text-xs text-slate-400 py-3 text-center">Sin puntuaciones registradas aún.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


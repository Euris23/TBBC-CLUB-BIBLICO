import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Edit2,
  Power,
  Eye,
  Calendar,
  Award,
  Sparkles,
  Users2,
  X,
  Check,
  AlertCircle,
  FileText,
  Clock,
  BookOpen,
  Church,
  Heart,
  Trash2
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

export default function ParticipantsView() {
  const { token } = useAuth();
  const { showToast, fetchDashboardStats } = useApp();

  const [participants, setParticipants] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [participantDetail, setParticipantDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Forms
  const [formData, setFormData] = useState({
    full_name: '',
    group_id: '',
    entry_date: new Date().toISOString().split('T')[0]
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch groups for dropdowns
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups', {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error('Error al cargar grupos:', err);
    }
  };

  // Fetch participants
  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.set('search', searchTerm);
      if (selectedGroupFilter !== 'all') queryParams.set('groupId', selectedGroupFilter);
      if (selectedStatusFilter !== 'all') queryParams.set('status', selectedStatusFilter);

      const res = await fetch(`/api/participants?${queryParams.toString()}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
      }
    } catch (err) {
      console.error('Error al cargar participantes:', err);
      showToast('Error al cargar participantes de la base de datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchGroups();
      fetchParticipants();
    }
  }, [token, selectedGroupFilter, selectedStatusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) fetchParticipants();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Open Create
  const handleOpenCreate = () => {
    setFormData({
      full_name: '',
      group_id: groups.length > 0 ? String(groups[0].id) : '',
      entry_date: new Date().toISOString().split('T')[0]
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (p) => {
    setSelectedParticipant(p);
    setFormData({
      full_name: p.full_name,
      group_id: p.group_id ? String(p.group_id) : '',
      entry_date: p.entry_date
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open History & Details
  const handleOpenHistory = async (p) => {
    setSelectedParticipant(p);
    setIsHistoryModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/participants/${p.id}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setParticipantDetail(data);
      }
    } catch (err) {
      console.error('Error al cargar historial del participante:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/participants', {
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
        await fetchParticipants();
        await fetchDashboardStats();
      } else {
        setFormError(data.message || 'Error al agregar participante.');
      }
    } catch (err) {
      setFormError('Error de conexión al guardar participante.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError('El nombre completo no puede estar vacío.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/participants/${selectedParticipant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({
          ...formData,
          is_active: selectedParticipant.is_active
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setIsEditModalOpen(false);
        await fetchParticipants();
        await fetchDashboardStats();
      } else {
        setFormError(data.message || 'Error al actualizar participante.');
      }
    } catch (err) {
      setFormError('Error de conexión al actualizar participante.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (p) => {
    const actionText = p.is_active === 1 ? 'desactivar' : 'reactivar';
    const confirmMsg = p.is_active === 1
      ? `¿Estás seguro de desactivar a "${p.full_name}"?\n\nSu historial de asistencia y puntos se conservará permanentemente.`
      : `¿Deseas reactivar a "${p.full_name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/participants/${p.id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'x-session-token': token }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        await fetchParticipants();
        await fetchDashboardStats();
      } else {
        showToast(data.message || `No se pudo ${actionText} al participante.`, 'error');
      }
    } catch (err) {
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  // Delete participant permanently
  const handleDeleteParticipant = async (p) => {
    const confirmMsg = `¿Estás seguro de ELIMINAR PERMANENTEMENTE al participante "${p.full_name}"?\n\n- Se borrarán todos sus registros asociados.\n- Si solo quieres que no aparezca temporalmente, es mejor usar "Desactivar".\n- Esta acción no se puede deshacer.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/participants/${p.id}`, {
        method: 'DELETE',
        headers: { 'x-session-token': token }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        await fetchParticipants();
        await fetchDashboardStats();
      } else {
        showToast(data.message || 'No se pudo eliminar al participante.', 'error');
      }
    } catch (err) {
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Chicos y Miembros del Club
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Inscribe nuevos chicos, asígnales su grupo o edita sus datos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Inscribir Nuevo Chico</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <Filter className="w-4 h-4" />
            <span>Grupo:</span>
          </div>
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value="none">Sin Grupo Asignado</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Solo Activos</option>
            <option value="inactive">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Cargando participantes...</p>
        </div>
      )}

      {/* Participants Table View */}
      {!loading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-5">Participante</th>
                  <th className="py-4 px-4">Grupo Asignado</th>
                  <th className="py-4 px-4 text-center">Asistencia</th>
                  <th className="py-4 px-4 text-center">Pts Acumulados</th>
                  <th className="py-4 px-4 text-center">Fecha Ingreso</th>
                  <th className="py-4 px-4 text-center">Estado</th>
                  <th className="py-4 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {participants.map((p) => {
                  const isInactive = p.is_active === 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isInactive ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Name with initial avatar */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
                            style={{ backgroundColor: p.group_color || '#64748b' }}
                          >
                            {p.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{p.full_name}</span>
                            <span className="text-[11px] text-slate-400">ID #{p.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Group */}
                      <td className="py-3.5 px-4">
                        {p.group_name ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: p.group_color || '#3b82f6' }}
                          >
                            {p.group_name}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                            Sin grupo
                          </span>
                        )}
                      </td>

                      {/* Attendance */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-emerald-700 block">
                          {p.attendance_rate}%
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.present_count} de {p.total_sessions} sábados
                        </span>
                      </td>

                      {/* Accumulated Points */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-blue-700 text-sm sm:text-base block">
                          {p.total_points.toLocaleString()} pts
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Prom: {p.average_points} pts/sáb
                        </span>
                      </td>

                      {/* Entry Date */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                        {formatDateDMY(p.entry_date)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isInactive ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px]">
                            Pausado
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            Activo
                          </span>
                        )}
                      </td>

                      {/* Actions with clear text buttons */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenHistory(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Ver Historial y Puntos"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Ver</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                            title="Editar chico"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteParticipant(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                            title="Eliminar del club"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Borrar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {participants.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">No se encontraron integrantes</p>
              <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o agrega un nuevo participante.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Agregar Participante */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Nuevo Participante</h3>
                  <p className="text-xs text-blue-100">Registrar integrante en el Club Bíblico</p>
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
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Daniel Alejandro Torres"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Grupo Asignado
                </label>
                <select
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                >
                  <option value="">-- Sin Grupo Inicial --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
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
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Registrar Participante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Participante */}
      {isEditModalOpen && selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Editar Participante</h3>
                  <p className="text-xs text-blue-100">{selectedParticipant.full_name}</p>
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
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cambiar Grupo Asignado
                </label>
                <select
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                >
                  <option value="">-- Sin Grupo --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
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

      {/* MODAL: Historial Completo y Puntos */}
      {isHistoryModalOpen && selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-md"
                  style={{ backgroundColor: selectedParticipant.group_color || '#3b82f6' }}
                >
                  {selectedParticipant.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">{selectedParticipant.full_name}</h3>
                  <p className="text-xs text-blue-200">
                    Grupo: {selectedParticipant.group_name || 'Sin grupo'} • Ingreso: {formatDateDMY(selectedParticipant.entry_date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-500 text-xs">Cargando historial detallado...</div>
              ) : (
                <>
                  {/* Cumulative Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 text-center">
                      <span className="block text-[10px] font-bold uppercase text-blue-600">Puntos Totales</span>
                      <span className="text-2xl font-black text-blue-700">
                        {participantDetail?.total_points?.toLocaleString() || 0}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-center">
                      <span className="block text-[10px] font-bold uppercase text-indigo-600">Promedio / Sábado</span>
                      <span className="text-2xl font-black text-indigo-700">
                        {participantDetail?.average_points || 0} pts
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center">
                      <span className="block text-[10px] font-bold uppercase text-emerald-600">Asistencia</span>
                      <span className="text-2xl font-black text-emerald-700">
                        {participantDetail?.attendance_rate || 0}%
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-center">
                      <span className="block text-[10px] font-bold uppercase text-amber-600">Sábados Presente</span>
                      <span className="text-2xl font-black text-amber-700">
                        {participantDetail?.present_count || 0} / {participantDetail?.total_sessions || 0}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Scores History Table */}
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-600" />
                      <span>Desglose por Jornada Sabatina</span>
                    </h4>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase text-[10px]">
                            <th className="py-2.5 px-3">Fecha</th>
                            <th className="py-2.5 px-2 text-center" title="Puntualidad (15 pts)">Punt. (15)</th>
                            <th className="py-2.5 px-2 text-center" title="Traer Biblia (20 pts)">Biblia (20)</th>
                            <th className="py-2.5 px-2 text-center" title="Asistencia Club (10 pts)">Asist. (10)</th>
                            <th className="py-2.5 px-2 text-center" title="Completar Devocional (25 pts)">Devoc. (25)</th>
                            <th className="py-2.5 px-2 text-center" title="Aprender Versículo (10 pts)">Vers. (10)</th>
                            <th className="py-2.5 px-2 text-center" title="Asistir a Iglesia (20 pts)">Iglesia (20)</th>
                            <th className="py-2.5 px-3 text-center font-extrabold text-blue-700">TOTAL (100)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {participantDetail?.scoresHistory?.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {formatDateDMY(row.journey_date)}
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {row.journey_title}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                                {row.punctuality ?? 0}
                              </td>
                              <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                                {row.bring_bible ?? 0}
                              </td>
                              <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                                {row.attendance ?? 0}
                              </td>
                              <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                                {row.devotional ?? 0}
                              </td>
                              <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                                {row.verse ?? 0}
                              </td>
                              <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                                {row.church ?? 0}
                              </td>
                              <td className="py-2.5 px-3 text-center font-extrabold text-blue-700 bg-blue-50/40">
                                {row.total ?? 0} pts
                              </td>
                            </tr>
                          ))}

                          {(!participantDetail?.scoresHistory || participantDetail.scoresHistory.length === 0) && (
                            <tr>
                              <td colSpan="8" className="py-6 text-center text-slate-400">
                                Sin puntuaciones sabatinas registradas para este participante.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
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


import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  CalendarCheck,
  Plus,
  Save,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  Users2,
  Calendar,
  AlertCircle,
  Check,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Edit2,
  Trash2
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

export default function AttendanceView() {
  const { token } = useAuth();
  const { showToast, fetchDashboardStats, selectedSeasonId } = useApp();

  const [journeys, setJourneys] = useState([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local attendance state for the current journey: { [participantId]: 'present' | 'absent' | 'excused' }
  const [localRecords, setLocalRecords] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

  // New Journey Modal
  const [isNewJourneyModalOpen, setIsNewJourneyModalOpen] = useState(false);
  const [newJourneyDate, setNewJourneyDate] = useState(() => {
    // Default to upcoming Saturday
    const d = new Date();
    const diff = (6 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  });
  const [newJourneyTitle, setNewJourneyTitle] = useState('');
  const [newJourneyNotes, setNewJourneyNotes] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmittingJourney, setIsSubmittingJourney] = useState(false);

  // Edit Journey Modal
  const [isEditJourneyModalOpen, setIsEditJourneyModalOpen] = useState(false);
  const [editJourneyDate, setEditJourneyDate] = useState('');
  const [editJourneyTitle, setEditJourneyTitle] = useState('');
  const [editJourneyNotes, setEditJourneyNotes] = useState('');

  // Fetch journeys scoped to selected season
  const fetchJourneys = async () => {
    try {
      const query = selectedSeasonId ? `?seasonId=${selectedSeasonId}` : '';
      const res = await fetch(`/api/journeys${query}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setJourneys(data);
        if (data.length > 0) {
          if (!data.some((j) => String(j.id) === String(selectedJourneyId))) {
            setSelectedJourneyId(String(data[0].id));
          }
        } else {
          setSelectedJourneyId('');
          setAttendanceData(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar jornadas:', err);
    }
  };

  // Fetch attendance sheet for selected journey
  const fetchAttendanceSheet = async (journeyId) => {
    if (!journeyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/${journeyId}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceData(data);

        // Populate local state
        const initialMap = {};
        data.participants.forEach((p) => {
          initialMap[p.participant_id] = p.attendance_status || 'absent';
        });
        setLocalRecords(initialMap);
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Error al cargar asistencia:', err);
      showToast('Error al cargar hoja de asistencia', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchJourneys();
  }, [token, selectedSeasonId]);

  useEffect(() => {
    if (token && selectedJourneyId) {
      fetchAttendanceSheet(selectedJourneyId);
    }
  }, [token, selectedJourneyId]);

  // Handle single status change
  const handleStatusChange = (participantId, status) => {
    setLocalRecords((prev) => ({
      ...prev,
      [participantId]: status
    }));
    setHasChanges(true);
  };

  // Mark all visible/filtered participants as present
  const handleMarkAllPresent = () => {
    const updated = { ...localRecords };
    displayedParticipants.forEach((p) => {
      updated[p.participant_id] = 'present';
    });
    setLocalRecords(updated);
    setHasChanges(true);
    showToast('Todos los participantes visibles marcados como Presentes');
  };

  // Mark all of a specific group as present
  const handleMarkGroupPresent = (groupParticipants) => {
    const updated = { ...localRecords };
    groupParticipants.forEach((p) => {
      updated[p.participant_id] = 'present';
    });
    setLocalRecords(updated);
    setHasChanges(true);
  };

  // Save attendance to backend
  const handleSaveAttendance = async () => {
    if (!selectedJourneyId) return;
    setSaving(true);
    try {
      const recordsArray = Object.entries(localRecords).map(([pid, status]) => ({
        participant_id: parseInt(pid, 10),
        status
      }));

      const res = await fetch(`/api/attendance/${selectedJourneyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({ records: recordsArray })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setHasChanges(false);
        await fetchAttendanceSheet(selectedJourneyId);
        await fetchJourneys();
        await fetchDashboardStats();
      } else {
        showToast(data.message || 'Error al guardar asistencia', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al guardar asistencia', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Create new journey
  const handleCreateJourneySubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!newJourneyDate) {
      setModalError('Debes seleccionar una fecha.');
      return;
    }

    setIsSubmittingJourney(true);
    try {
      const res = await fetch('/api/journeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({
          season_id: selectedSeasonId,
          journey_date: newJourneyDate,
          title: newJourneyTitle,
          notes: newJourneyNotes
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setIsNewJourneyModalOpen(false);
        setNewJourneyTitle('');
        setNewJourneyNotes('');
        await fetchJourneys();
        setSelectedJourneyId(String(data.journey.id));
        await fetchDashboardStats();
      } else {
        setModalError(data.message || 'Error al crear jornada.');
      }
    } catch (err) {
      setModalError('Error de red al crear jornada.');
    } finally {
      setIsSubmittingJourney(false);
    }
  };

  // Open Edit Journey Modal
  const handleOpenEditJourney = () => {
    if (!selectedJourney) return;
    setEditJourneyDate(selectedJourney.journey_date);
    setEditJourneyTitle(selectedJourney.title || '');
    setEditJourneyNotes(selectedJourney.notes || '');
    setModalError('');
    setIsEditJourneyModalOpen(true);
  };

  // Submit Edit Journey
  const handleEditJourneySubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!editJourneyDate) {
      setModalError('Debes seleccionar una fecha.');
      return;
    }

    setIsSubmittingJourney(true);
    try {
      const res = await fetch(`/api/journeys/${selectedJourneyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({
          journey_date: editJourneyDate,
          title: editJourneyTitle,
          notes: editJourneyNotes
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setIsEditJourneyModalOpen(false);
        await fetchJourneys();
        await fetchAttendanceSheet(selectedJourneyId);
        await fetchDashboardStats();
      } else {
        setModalError(data.message || 'Error al actualizar jornada.');
      }
    } catch (err) {
      setModalError('Error de conexión con el servidor.');
    } finally {
      setIsSubmittingJourney(false);
    }
  };

  // Delete Journey Permanently
  const handleDeleteJourney = async () => {
    if (!selectedJourney) return;
    const confirmMsg = `¿Estás seguro de ELIMINAR el sábado del ${formatDateDMY(selectedJourney.journey_date)}?\n\n- Se eliminarán permanentemente todos sus registros de asistencia y puntuaciones asociadas.\n- Esta acción no se puede deshacer.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/journeys/${selectedJourneyId}`, {
        method: 'DELETE',
        headers: { 'x-session-token': token }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        const remaining = journeys.filter((j) => String(j.id) !== String(selectedJourneyId));
        setJourneys(remaining);
        if (remaining.length > 0) {
          setSelectedJourneyId(String(remaining[0].id));
        } else {
          setSelectedJourneyId('');
          setAttendanceData(null);
        }
        await fetchDashboardStats();
      } else {
        showToast(data.message || 'Error al eliminar jornada', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al eliminar jornada', 'error');
    }
  };

  // Compute live totals from localRecords
  const participantsList = attendanceData?.participants || [];

  const liveTotals = React.useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;

    participantsList.forEach((p) => {
      const status = localRecords[p.participant_id] || 'absent';
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'excused') excused++;
    });

    const total = present + absent + excused;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { present, absent, excused, total, rate };
  }, [participantsList, localRecords]);

  // Filter participants
  const displayedParticipants = participantsList.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup =
      selectedGroupFilter === 'all' ||
      (selectedGroupFilter === 'none' && !p.group_id) ||
      String(p.group_id) === String(selectedGroupFilter);
    return matchesSearch && matchesGroup;
  });

  // Group participants by group for organized display
  const groupedParticipants = React.useMemo(() => {
    const map = {};
    displayedParticipants.forEach((p) => {
      const key = p.group_id || 'unassigned';
      if (!map[key]) {
        map[key] = {
          groupId: p.group_id,
          groupName: p.group_name || 'Sin Grupo Asignado',
          groupColor: p.group_color || '#64748b',
          members: []
        };
      }
      map[key].members.push(p);
    });
    return Object.values(map);
  }, [displayedParticipants]);

  // Unique groups for filter dropdown
  const uniqueGroups = React.useMemo(() => {
    const map = new Map();
    participantsList.forEach((p) => {
      if (p.group_id && !map.has(p.group_id)) {
        map.set(p.group_id, { id: p.group_id, name: p.group_name, color: p.group_color });
      }
    });
    return Array.from(map.values());
  }, [participantsList]);

  const selectedJourney = journeys.find((j) => String(j.id) === String(selectedJourneyId));

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      
      {/* Header Bar with Journey Selector & Actions */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Pasar Lista del Sábado
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Selecciona el sábado y marca quién vino, quién faltó o quién avisó
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Journey Selector Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedJourneyId}
              onChange={(e) => setSelectedJourneyId(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {journeys.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatDateDMY(j.journey_date)} — {j.title || 'Sábado'} ({j.attendance_rate}%)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Edit Journey Button */}
          {selectedJourney && (
            <button
              type="button"
              onClick={handleOpenEditJourney}
              className="inline-flex items-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors text-xs font-bold"
              title="Editar fecha o título de este sábado"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Editar</span>
            </button>
          )}

          {/* Delete Journey Button */}
          {selectedJourney && (
            <button
              type="button"
              onClick={handleDeleteJourney}
              className="inline-flex items-center gap-1 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-colors text-xs font-bold"
              title="Eliminar este sábado"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Borrar</span>
            </button>
          )}

          {/* New Journey Button */}
          <button
            type="button"
            onClick={() => setIsNewJourneyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Nuevo Sábado</span>
          </button>
        </div>
      </div>

      {/* Real-time Attendance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Presentes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Vinieron</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{liveTotals.present}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Ausentes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Faltaron</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{liveTotals.absent}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Excusados */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Con Excusa</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{liveTotals.excused}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
        </div>

        {/* % Asistencia */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">% que Vino</span>
            <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">{liveTotals.rate}%</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            {liveTotals.present}/{liveTotals.total}
          </div>
        </div>
      </div>

      {/* Group Attendance Performance Bar */}
      {attendanceData?.summary?.groupStats && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users2 className="w-4 h-4 text-purple-600" />
              <span>Estadísticas de Asistencia por Grupo</span>
            </h2>
            <span className="text-[11px] text-slate-400">Sábado: {formatDateDMY(selectedJourney?.journey_date)}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {attendanceData.summary.groupStats.map((gs) => (
              <div
                key={gs.groupId || 'none'}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between"
              >
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: gs.groupColor }} />
                    <span className="font-bold text-xs text-slate-800 truncate">{gs.groupName}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {gs.present} de {gs.total} presentes
                  </span>
                </div>
                <span className="text-sm font-extrabold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-lg">
                  {gs.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action and Filter Controls */}
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
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Grupos</option>
            {uniqueGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value="none">Sin Grupo</option>
          </select>

          {/* Quick Button: Mark All as Present */}
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors shadow-sm"
            title="Marcar que todos los que ves aquí vinieron hoy"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>¡Todos Vinieron Hoy!</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 ${
              hasChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {saving ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{hasChanges ? 'Guardar Lista *' : 'Lista Guardada'}</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Cargando lista de participantes y asistencias...</p>
        </div>
      )}

      {/* Attendance Sheet: Grouped List */}
      {!loading && (
        <div className="space-y-6">
          {groupedParticipants.map((group) => (
            <div
              key={group.groupId || 'none'}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: group.groupColor }}
                  />
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {group.groupName}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    ({group.members.length} integrantes)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleMarkGroupPresent(group.members)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-xl transition-colors border border-emerald-200/60"
                  title="Marcar todos los integrantes de este grupo como presentes"
                >
                  ✓ Marcar grupo presente
                </button>
              </div>

              {/* Members List */}
              <div className="divide-y divide-slate-100">
                {group.members.map((member) => {
                  const currentStatus = localRecords[member.participant_id] || 'absent';

                  return (
                    <div
                      key={member.participant_id}
                      className="p-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Member Info */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                          style={{ backgroundColor: group.groupColor }}
                        >
                          {member.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">
                            {member.full_name}
                          </span>
                          {!member.participant_is_active && (
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              (Participante Inactivo)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3 Status Buttons (Presente, Ausente, Excusado) */}
                      <div className="inline-flex rounded-xl p-1 bg-slate-100/90 border border-slate-200/80 self-end sm:self-auto">
                        {/* Presente */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(member.participant_id, 'present')}
                          className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            currentStatus === 'present'
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Vino</span>
                        </button>

                        {/* Ausente */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(member.participant_id, 'absent')}
                          className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            currentStatus === 'absent'
                              ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                              : 'text-slate-600 hover:text-rose-700 hover:bg-white/60'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Faltó</span>
                        </button>

                        {/* Excusado */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(member.participant_id, 'excused')}
                          className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            currentStatus === 'excused'
                              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                              : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Excusa</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {groupedParticipants.length === 0 && (
            <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
              <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">No hay participantes que coincidan con la búsqueda</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Save Action Indicator when changes are unsaved */}
      {hasChanges && (
        <div className="fixed bottom-20 lg:bottom-8 right-6 z-40 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">Tienes cambios en asistencia sin guardar</span>
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving}
            className="px-3.5 py-1.5 bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-xs rounded-xl shadow-sm transition-transform active:scale-95"
          >
            {saving ? 'Guardando...' : 'Guardar Ahora'}
          </button>
        </div>
      )}

      {/* MODAL: Nueva Jornada */}
      {isNewJourneyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Crear Nueva Jornada</h3>
                  <p className="text-xs text-emerald-100">Registrar sábado de actividades del Club</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewJourneyModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJourneySubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fecha del Sábado *
                </label>
                <input
                  type="date"
                  required
                  value={newJourneyDate}
                  onChange={(e) => setNewJourneyDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Título de la Jornada
                </label>
                <input
                  type="text"
                  placeholder="Ej: Jornada 2 - La Fe de Abraham"
                  value={newJourneyTitle}
                  onChange={(e) => setNewJourneyTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notas u Observaciones (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Temas tratados, dinámica especial, etc."
                  value={newJourneyNotes}
                  onChange={(e) => setNewJourneyNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewJourneyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingJourney}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmittingJourney ? 'Creando...' : 'Crear Jornada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Jornada */}
      {isEditJourneyModalOpen && selectedJourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Editar Jornada</h3>
                  <p className="text-xs text-blue-100">{formatDateDMY(selectedJourney.journey_date)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditJourneyModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditJourneySubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fecha del Sábado *
                </label>
                <input
                  type="date"
                  required
                  value={editJourneyDate}
                  onChange={(e) => setEditJourneyDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Título de la Jornada
                </label>
                <input
                  type="text"
                  value={editJourneyTitle}
                  onChange={(e) => setEditJourneyTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notas u Observaciones
                </label>
                <textarea
                  rows="2"
                  value={editJourneyNotes}
                  onChange={(e) => setEditJourneyNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditJourneyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingJourney}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmittingJourney ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


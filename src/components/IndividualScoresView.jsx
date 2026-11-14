import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Award,
  Calendar,
  Save,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  Users2,
  ChevronDown,
  RotateCcw,
  Star,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  BookOpen,
  Church,
  BookMarked
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

export const CRITERIA = [
  { id: 'punctuality', label: 'Llegó Temprano', pts: 15, icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'bring_bible', label: 'Trajo la Biblia', pts: 20, icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'attendance', label: 'Vino al Club', pts: 10, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', note: 'Vinculado a lista' },
  { id: 'devotional', label: 'Hizo Devocional', pts: 25, icon: BookMarked, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'verse', label: 'Dijo Versículo', pts: 10, icon: Sparkles, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'church', label: 'Fue a la Iglesia', pts: 20, icon: Church, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' }
];

export default function IndividualScoresView() {
  const { token } = useAuth();
  const { showToast, fetchDashboardStats, selectedSeasonId } = useApp();

  const [journeys, setJourneys] = useState([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [scoresData, setScoresData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local scores state: { [participantId]: { punctuality, bring_bible, attendance, devotional, verse, church, special_recognition } }
  const [localScores, setLocalScores] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

  // Fetch journeys for selected season
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
          setScoresData(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar jornadas:', err);
    }
  };

  // Fetch scores sheet for selected journey
  const fetchScoresSheet = async (journeyId) => {
    if (!journeyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/individual-scores/${journeyId}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setScoresData(data);

        // Populate local state
        const initialMap = {};
        data.participants.forEach((p) => {
          initialMap[p.participant_id] = {
            punctuality: p.punctuality || 0,
            bring_bible: p.bring_bible || 0,
            attendance: p.attendance || 0,
            devotional: p.devotional || 0,
            verse: p.verse || 0,
            church: p.church || 0,
            special_recognition: p.special_recognition === 1
          };
        });
        setLocalScores(initialMap);
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Error al cargar puntuaciones individuales:', err);
      showToast('Error al cargar puntuaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchJourneys();
  }, [token, selectedSeasonId]);

  useEffect(() => {
    if (token && selectedJourneyId) {
      fetchScoresSheet(selectedJourneyId);
    }
  }, [token, selectedJourneyId]);

  // Toggle single criterion for a participant
  const handleToggleCriterion = (participantId, criterionId, pointsMax) => {
    setLocalScores((prev) => {
      const current = prev[participantId] || {
        punctuality: 0,
        bring_bible: 0,
        attendance: 0,
        devotional: 0,
        verse: 0,
        church: 0,
        special_recognition: false
      };

      const currentValue = current[criterionId] || 0;
      const newValue = currentValue > 0 ? 0 : pointsMax;

      return {
        ...prev,
        [participantId]: {
          ...current,
          [criterionId]: newValue
        }
      };
    });
    setHasChanges(true);
  };

  // Toggle special recognition
  const handleToggleRecognition = (participantId) => {
    setLocalScores((prev) => {
      const current = prev[participantId] || {};
      return {
        ...prev,
        [participantId]: {
          ...current,
          special_recognition: !current.special_recognition
        }
      };
    });
    setHasChanges(true);
  };

  // Mark all 100 points for a participant
  const handleSetMaxPoints = (participantId) => {
    setLocalScores((prev) => ({
      ...prev,
      [participantId]: {
        punctuality: 15,
        bring_bible: 20,
        attendance: 10,
        devotional: 25,
        verse: 10,
        church: 20,
        special_recognition: prev[participantId]?.special_recognition || false
      }
    }));
    setHasChanges(true);
  };

  // Reset points of a participant
  const handleResetPoints = (participantId) => {
    setLocalScores((prev) => ({
      ...prev,
      [participantId]: {
        punctuality: 0,
        bring_bible: 0,
        attendance: 0,
        devotional: 0,
        verse: 0,
        church: 0,
        special_recognition: false
      }
    }));
    setHasChanges(true);
  };

  // Mark all members of a group with 100 points
  const handleSetGroupMax = (groupMembers) => {
    setLocalScores((prev) => {
      const updated = { ...prev };
      groupMembers.forEach((m) => {
        updated[m.participant_id] = {
          punctuality: 15,
          bring_bible: 20,
          attendance: 10,
          devotional: 25,
          verse: 10,
          church: 20,
          special_recognition: prev[m.participant_id]?.special_recognition || false
        };
      });
      return updated;
    });
    setHasChanges(true);
    showToast('Todos los participantes del grupo asignados con 100 pts');
  };

  // Save all scores to backend
  const handleSaveScores = async () => {
    if (!selectedJourneyId) return;
    setSaving(true);
    try {
      const scoresArray = Object.entries(localScores).map(([pid, s]) => ({
        participant_id: parseInt(pid, 10),
        punctuality: s.punctuality || 0,
        bring_bible: s.bring_bible || 0,
        attendance: s.attendance || 0,
        devotional: s.devotional || 0,
        verse: s.verse || 0,
        church: s.church || 0,
        special_recognition: s.special_recognition ? 1 : 0
      }));

      const res = await fetch(`/api/individual-scores/${selectedJourneyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({ scores: scoresArray })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setHasChanges(false);
        await fetchScoresSheet(selectedJourneyId);
        await fetchDashboardStats();
      } else {
        showToast(data.message || 'Error al guardar puntuaciones', 'error');
      }
    } catch (err) {
      showToast('Error de red al guardar puntuaciones', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper to compute participant total points from localScores
  const computeParticipantTotal = (pId) => {
    const s = localScores[pId] || {};
    const sum = (s.punctuality || 0) + (s.bring_bible || 0) + (s.attendance || 0) +
      (s.devotional || 0) + (s.verse || 0) + (s.church || 0);
    return Math.min(100, Math.max(0, sum));
  };

  const participantsList = scoresData?.participants || [];

  // Live journey summary metrics
  const liveJourneySummary = useMemo(() => {
    let totalDistributed = 0;
    let count100 = 0;
    let countBible = 0;
    let countDevotional = 0;

    participantsList.forEach((p) => {
      const t = computeParticipantTotal(p.participant_id);
      totalDistributed += t;
      if (t >= 100) count100++;
      if (localScores[p.participant_id]?.bring_bible >= 20) countBible++;
      if (localScores[p.participant_id]?.devotional >= 25) countDevotional++;
    });

    const count = participantsList.length;
    const avg = count > 0 ? Math.round((totalDistributed / count) * 10) / 10 : 0;
    const bibleRate = count > 0 ? Math.round((countBible / count) * 100) : 0;

    return { totalDistributed, count100, avg, count, bibleRate };
  }, [participantsList, localScores]);

  // Filtered participants
  const displayedParticipants = useMemo(() => {
    return participantsList.filter((p) => {
      const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup =
        selectedGroupFilter === 'all' ||
        (selectedGroupFilter === 'none' && !p.group_id) ||
        String(p.group_id) === String(selectedGroupFilter);
      return matchesSearch && matchesGroup;
    });
  }, [participantsList, searchTerm, selectedGroupFilter]);

  // Grouped participants for display
  const groupedParticipants = useMemo(() => {
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

  // Unique groups for filter
  const uniqueGroups = useMemo(() => {
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
      
      {/* Header Bar with Journey Selector & Save Action */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Puntos por Chico (Hasta 100 pts)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Marca lo que cumplió cada chico este sábado con los 6 requisitos bíblicos
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Journey Selector */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedJourneyId}
              onChange={(e) => setSelectedJourneyId(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {journeys.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatDateDMY(j.journey_date)} — {j.title || 'Sábado'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveScores}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 ring-2 ring-blue-400'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {saving ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{hasChanges ? 'Guardar Cambios *' : 'Guardar Puntos'}</span>
          </button>
        </div>
      </div>

      {/* Criteria Breakdown Reference Strip */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Distribución Sabatina Oficial (100 Puntos Máximo)
          </span>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60">
            Total Criterios: 100 pts
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {CRITERIA.map((crit) => {
            const Icon = crit.icon;
            return (
              <div
                key={crit.id}
                className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-2"
              >
                <div className="p-1.5 rounded-xl bg-white text-slate-700 shadow-xs shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-slate-800 block truncate">{crit.label}</span>
                  <span className="text-[11px] font-extrabold text-blue-700">{crit.pts} pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Promedio */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Promedio Sábado</span>
            <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
              {liveJourneySummary.avg} <span className="text-sm font-medium text-slate-500">/ 100</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* 100 Puntos Logrados */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Puntaje Perfecto</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
              {liveJourneySummary.count100} <span className="text-xs font-normal text-slate-500">con 100 pts</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
        </div>

        {/* Trajeron Biblia */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Trajeron Biblia</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
              {liveJourneySummary.bibleRate}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Total Puntos Repartidos */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Puntos Totales</span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1">
              {liveJourneySummary.totalDistributed.toLocaleString()} <span className="text-xs font-normal text-slate-500">pts</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar participante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 shrink-0 font-medium">Filtrar:</span>
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
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Cargando puntuaciones de la jornada...</p>
        </div>
      )}

      {/* Scoring Sheet by Group */}
      {!loading && (
        <div className="space-y-6">
          {groupedParticipants.map((group) => (
            <div
              key={group.groupId || 'none'}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
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
                  onClick={() => handleSetGroupMax(group.members)}
                  className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors border border-amber-200/80 flex items-center gap-1.5"
                  title="Asignar 100 puntos a todos los miembros de este grupo"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  <span>Asignar 100 pts a todo el grupo</span>
                </button>
              </div>

              {/* Participants Rows */}
              <div className="divide-y divide-slate-100">
                {group.members.map((member) => {
                  const s = localScores[member.participant_id] || {};
                  const total = computeParticipantTotal(member.participant_id);
                  const is100 = total >= 100;
                  const hasRecognition = !!s.special_recognition;

                  return (
                    <div
                      key={member.participant_id}
                      className="p-4 sm:px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Left: Participant Info & Recognition Badge */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
                          style={{ backgroundColor: group.groupColor }}
                        >
                          {member.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm block">
                              {member.full_name}
                            </span>
                            {hasRecognition && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]"
                                title="Reconocimiento por participación destacada (independiente, sin puntos extras)"
                              >
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>Destacado</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Asistencia: {s.attendance > 0 ? '✓ Presente' : '✗ Ausente'}
                          </span>
                        </div>
                      </div>

                      {/* Middle: 6 Interactive Criteria Checkboxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 flex-1 max-w-2xl">
                        {CRITERIA.map((crit) => {
                          const isChecked = (s[crit.id] || 0) > 0;
                          return (
                            <button
                              key={crit.id}
                              type="button"
                              onClick={() => handleToggleCriterion(member.participant_id, crit.id, crit.pts)}
                              className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between select-none ${
                                isChecked
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/25 ring-2 ring-blue-400/50'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className={`text-[10px] font-bold uppercase truncate ${isChecked ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {crit.label}
                                </span>
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                    isChecked
                                      ? 'bg-white text-blue-600 border-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                              <span className={`text-xs font-black ${isChecked ? 'text-white' : 'text-blue-600'}`}>
                                +{crit.pts} pts
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right: Total Meter and Actions */}
                      <div className="flex items-center justify-between xl:justify-end gap-3 self-end xl:self-center shrink-0">
                        {/* Score Indicator */}
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span
                              className={`text-lg sm:text-xl font-black ${
                                is100 ? 'text-amber-600' : 'text-slate-900'
                              }`}
                            >
                              {total}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">/ 100</span>
                          </div>

                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                is100
                                  ? 'bg-amber-500'
                                  : total >= 70
                                  ? 'bg-emerald-500'
                                  : total >= 40
                                  ? 'bg-blue-500'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${total}%` }}
                            />
                          </div>
                        </div>

                        {/* Recognition Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleRecognition(member.participant_id)}
                          className={`p-2 rounded-xl transition-all ${
                            hasRecognition
                              ? 'bg-amber-100 text-amber-700 shadow-sm'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={hasRecognition ? 'Quitar reconocimiento' : 'Otorgar reconocimiento por participación destacada (sin puntos adicionales)'}
                        >
                          <Star className={`w-4 h-4 ${hasRecognition ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>

                        {/* Quick 100 pts */}
                        <button
                          type="button"
                          onClick={() => handleSetMaxPoints(member.participant_id)}
                          className="px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200/60"
                          title="Marcar todos los criterios (100 pts)"
                        >
                          100 pts
                        </button>

                        {/* Reset Points */}
                        <button
                          type="button"
                          onClick={() => handleResetPoints(member.participant_id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Reiniciar puntos a 0"
                        >
                          <RotateCcw className="w-4 h-4" />
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
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">No se encontraron integrantes</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Save Action Bar when unsaved */}
      {hasChanges && (
        <div className="fixed bottom-20 lg:bottom-8 right-6 z-40 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">Tienes puntuaciones sin guardar</span>
          <button
            type="button"
            onClick={handleSaveScores}
            disabled={saving}
            className="px-3.5 py-1.5 bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-xs rounded-xl shadow-sm transition-transform active:scale-95"
          >
            {saving ? 'Guardando...' : 'Guardar Ahora'}
          </button>
        </div>
      )}

    </div>
  );
}


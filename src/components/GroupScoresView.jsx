import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Trophy,
  Calendar,
  Save,
  RotateCcw,
  Sparkles,
  Users2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Award,
  Crown,
  BookOpen,
  Clock,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

export const GROUP_COMPETITIONS = [
  { id: 'game1', label: 'Dinámica 1', maxPts: 100, shortLabel: 'Din. 1' },
  { id: 'game2', label: 'Dinámica 2', maxPts: 100, shortLabel: 'Din. 2' },
  { id: 'questions', label: 'Preguntas', maxPts: 100, shortLabel: 'Preg.' },
  { id: 'bring_bible', label: 'Traer Biblia', maxPts: 200, shortLabel: 'Biblia' },
  { id: 'punctuality', label: 'Puntualidad', maxPts: 200, shortLabel: 'Puntual.' },
  { id: 'group_attendance', label: 'Asistencia', maxPts: 150, shortLabel: 'Asist.' },
  { id: 'bible_presentation', label: 'Texto Bíblico', maxPts: 100, shortLabel: 'Txt. Bíblico' }
];

export const MAX_GROUP_TOTAL = 950;

export default function GroupScoresView() {
  const { token } = useAuth();
  const { showToast, fetchDashboardStats, selectedSeasonId, setCurrentSection } = useApp();

  const [journeys, setJourneys] = useState([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [groupScoresData, setGroupScoresData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local editable scores: { [groupId]: { game1, game2, questions, bring_bible, punctuality, group_attendance, bible_presentation, manual_points, manual_points_reason } }
  const [localScores, setLocalScores] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Quick Manual Points Modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualModalData, setManualModalData] = useState({
    groupId: '',
    journeyId: '',
    points: 50,
    reason: ''
  });
  const [submittingManual, setSubmittingManual] = useState(false);

  // Load Journeys
  useEffect(() => {
    fetchJourneys();
  }, [selectedSeasonId]);

  const fetchJourneys = async () => {
    try {
      setLoading(true);
      const url = selectedSeasonId && selectedSeasonId !== 'all'
        ? `/api/journeys?seasonId=${selectedSeasonId}`
        : '/api/journeys';

      const res = await fetch(url, {
        headers: { 'x-session-token': token }
      });
      const data = await res.json();
      setJourneys(data);

      if (data.length > 0) {
        const exists = data.find((j) => j.id.toString() === selectedJourneyId?.toString());
        if (!exists) {
          setSelectedJourneyId(data[0].id.toString());
        }
      } else {
        setSelectedJourneyId('');
        setGroupScoresData(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar jornadas', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Group Scores when Journey changes
  useEffect(() => {
    if (selectedJourneyId) {
      fetchJourneyGroupScores(selectedJourneyId);
    }
  }, [selectedJourneyId]);

  const fetchJourneyGroupScores = async (journeyId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/group-scores/${journeyId}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setGroupScoresData(data);

        // Initialize local state
        const initial = {};
        (data.groups || []).forEach((g) => {
          initial[g.group_id] = {
            game1: g.game1,
            game2: g.game2,
            questions: g.questions,
            bring_bible: g.bring_bible,
            punctuality: g.punctuality,
            group_attendance: g.group_attendance,
            bible_presentation: g.bible_presentation,
            manual_points: g.manual_points || 0,
            manual_points_reason: g.manual_points_reason || ''
          };
        });
        setLocalScores(initial);
        setHasChanges(false);
      } else {
        setGroupScoresData(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar puntos grupales', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Score Input Change
  const handleScoreChange = (groupId, fieldId, value, maxVal) => {
    let num = parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxVal) num = maxVal;

    setLocalScores((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [fieldId]: num
      }
    }));
    setHasChanges(true);
  };

  // Handle Text/Reason Change
  const handleTextChange = (groupId, fieldId, value) => {
    setLocalScores((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [fieldId]: value
      }
    }));
    setHasChanges(true);
  };

  // Quick set shortcut (e.g. max or half)
  const handleQuickSet = (groupId, fieldId, value) => {
    setLocalScores((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [fieldId]: value
      }
    }));
    setHasChanges(true);
  };

  // Auto-apply attendance points based on actual registered attendance in this journey
  const handleAutoApplyAttendance = (groupId, suggestedPts) => {
    setLocalScores((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        group_attendance: suggestedPts
      }
    }));
    setHasChanges(true);
    showToast(`Asistencia grupal fijada a ${suggestedPts} pts según lista`);
  };

  // Reset group scores in local state
  const handleResetGroupLocal = (groupId) => {
    setLocalScores((prev) => ({
      ...prev,
      [groupId]: {
        game1: 0,
        game2: 0,
        questions: 0,
        bring_bible: 0,
        punctuality: 0,
        group_attendance: 0,
        bible_presentation: 0,
        manual_points: 0,
        manual_points_reason: ''
      }
    }));
    setHasChanges(true);
  };

  // Submit Quick Manual Points with Justification Modal
  const handleAssignManualPoints = async (e) => {
    e.preventDefault();
    if (!manualModalData.groupId || !manualModalData.journeyId) {
      showToast('Selecciona el equipo y el sábado', 'error');
      return;
    }
    if (!manualModalData.reason.trim()) {
      showToast('Debes escribir la justificación de los puntos', 'error');
      return;
    }

    try {
      setSubmittingManual(true);
      const res = await fetch('/api/group-scores/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify(manualModalData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setIsManualModalOpen(false);
        setManualModalData({
          groupId: '',
          journeyId: selectedJourneyId || '',
          points: 50,
          reason: ''
        });
        await fetchJourneyGroupScores(selectedJourneyId);
        await fetchDashboardStats();
      } else {
        showToast(data.message || 'Error al asignar puntos manuales', 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    } finally {
      setSubmittingManual(false);
    }
  };

  // Save all scores to database
  const handleSaveScores = async () => {
    if (!selectedJourneyId) return;

    try {
      setSaving(true);
      const payload = Object.entries(localScores).map(([groupId, scores]) => ({
        group_id: parseInt(groupId, 10),
        ...scores
      }));

      const res = await fetch(`/api/group-scores/${selectedJourneyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({ scores: payload })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Puntos grupales guardados correctamente');
        setHasChanges(false);
        fetchJourneyGroupScores(selectedJourneyId);
        fetchDashboardStats();
      } else {
        showToast(data.message || 'Error al guardar', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Compute live totals and live standings
  const calculatedGroups = useMemo(() => {
    if (!groupScoresData || !groupScoresData.groups) return [];

    const computed = groupScoresData.groups.map((g) => {
      const current = localScores[g.group_id] || {};
      const g1 = current.game1 ?? g.game1;
      const g2 = current.game2 ?? g.game2;
      const q = current.questions ?? g.questions;
      const bb = current.bring_bible ?? g.bring_bible;
      const p = current.punctuality ?? g.punctuality;
      const ga = current.group_attendance ?? g.group_attendance;
      const bp = current.bible_presentation ?? g.bible_presentation;
      const manualPts = parseInt(current.manual_points ?? g.manual_points, 10) || 0;
      const manualReason = current.manual_points_reason ?? g.manual_points_reason ?? '';

      const liveTotal = g1 + g2 + q + bb + p + ga + bp + manualPts;

      return {
        ...g,
        liveScores: {
          game1: g1,
          game2: g2,
          questions: q,
          bring_bible: bb,
          punctuality: p,
          group_attendance: ga,
          bible_presentation: bp,
          manual_points: manualPts,
          manual_points_reason: manualReason
        },
        manual_points: manualPts,
        manual_points_reason: manualReason,
        liveTotal
      };
    });

    // Sort by liveTotal descending
    computed.sort((a, b) => b.liveTotal - a.liveTotal);

    let rank = 1;
    return computed.map((grp, idx) => {
      if (idx > 0 && grp.liveTotal < computed[idx - 1].liveTotal) {
        rank = idx + 1;
      }
      return {
        ...grp,
        liveRank: rank,
        diffWithFirst: idx === 0 ? 0 : computed[0].liveTotal - grp.liveTotal
      };
    });
  }, [groupScoresData, localScores]);

  // Total points distributed live
  const totalDistributedLive = useMemo(() => {
    return calculatedGroups.reduce((acc, g) => acc + g.liveTotal, 0);
  }, [calculatedGroups]);

  const leaderLive = calculatedGroups.length > 0 && calculatedGroups[0].liveTotal > 0 ? calculatedGroups[0] : null;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Puntos de los Equipos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Puntos por Grupo
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            Califica las dinámicas, preguntas bíblicas y puntualidad. También puedes colocar puntos manuales con justificación.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setManualModalData({
                groupId: calculatedGroups[0]?.group_id?.toString() || '',
                journeyId: selectedJourneyId || (journeys[0]?.id?.toString() || ''),
                points: 50,
                reason: ''
              });
              setIsManualModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            title="Colocar puntos manuales a un equipo y justificar el por qué"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>➕ Puntos Manuales</span>
          </button>

          <button
            type="button"
            onClick={handleSaveScores}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${
              hasChanges
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/30 scale-105 animate-pulse'
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
            }`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{hasChanges ? 'Guardar Puntos *' : 'Puntos Guardados'}</span>
          </button>
        </div>
      </div>

      {/* Journey Selector Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 sm:flex-initial">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Sábado de Actividades
            </label>
            <select
              value={selectedJourneyId}
              onChange={(e) => setSelectedJourneyId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {journeys.length === 0 ? (
                <option value="">No hay sábados registrados</option>
              ) : (
                journeys.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatDateDMY(j.journey_date)} — {j.title || 'Sábado'}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Quick Rule reminder */}
        <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Base por competencias: <strong className="text-slate-800">{MAX_GROUP_TOTAL} pts</strong></span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-amber-700 font-bold">Puntos manuales con justificación</span>
        </div>
      </div>

      {/* Live Journey Metrics Cards */}
      {calculatedGroups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Leader Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Equipo Líder del Sábado
              </span>
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-base shadow"
                style={{ backgroundColor: leaderLive ? leaderLive.group_color : '#94a3b8' }}
              >
                1°
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-lg leading-tight">
                  {leaderLive ? leaderLive.group_name : 'Sin puntaje aún'}
                </p>
                <p className="text-xs font-semibold text-amber-600">
                  {leaderLive ? `${leaderLive.liveTotal} pts` : '0 pts'}
                </p>
              </div>
            </div>
          </div>

          {/* Total Points Distributed */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Puntos Distribuidos
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">
                {totalDistributedLive}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                puntos en total
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Promedio: <strong>{calculatedGroups.length > 0 ? Math.round(totalDistributedLive / calculatedGroups.length) : 0} pts</strong>
            </div>
          </div>

          {/* Groups Competing */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Equipos en Competencia
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">
                {calculatedGroups.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                equipos
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {calculatedGroups.reduce((acc, g) => acc + g.totalMembers, 0)} chicos en total
            </div>
          </div>

          {/* WhatsApp Shortcut */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                Foto para WhatsApp
              </span>
              <ImageIcon className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Genera la foto oficial con resultados para enviar al grupo.
            </p>
            <button
              type="button"
              onClick={() => setCurrentSection('rankings')}
              className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <span>Ver Ranking e Imágenes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Score Sheet Matrix */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Cargando puntuaciones de grupos...</p>
        </div>
      ) : calculatedGroups.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center">
          <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No hay grupos disponibles</h3>
          <p className="text-sm text-slate-500 mt-1">
            Debes tener grupos registrados y al menos una jornada creada para calificar.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Desktop Table View */}
          <div className="hidden xl:block bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-4 w-14 text-center">Lugar</th>
                    <th className="py-4 px-4 min-w-[200px]">Equipo</th>
                    <th className="py-4 px-3 text-center min-w-[100px]">
                      <div>Dinámica 1</div>
                      <span className="text-[9px] text-slate-400 font-normal">Máx 100</span>
                    </th>
                    <th className="py-4 px-3 text-center min-w-[100px]">
                      <div>Dinámica 2</div>
                      <span className="text-[9px] text-slate-400 font-normal">Máx 100</span>
                    </th>
                    <th className="py-4 px-3 text-center min-w-[100px]">
                      <div>Preguntas</div>
                      <span className="text-[9px] text-slate-400 font-normal">Máx 100</span>
                    </th>
                    <th className="py-4 px-3 text-center min-w-[100px]">
                      <div>Traer Biblia</div>
                      <span className="text-[9px] text-slate-400 font-normal">Máx 200</span>
                    </th>
                    <th className="py-4 px-3 text-center min-w-[100px]">
                      <div>Puntualidad</div>
                      <span className="text-[9px] text-slate-400 font-normal">Máx 200</span>
                    </th>
                    <th className="py-4 px-3 text-center min-w-[120px]">
                      <div>Asistencia</div>
                      <span className="text-[9px] text-slate-400 font-normal">Máx 150</span>
                    </th>
                    <th className="py-4 px-3 text-center min-w-[100px]">
                      <div>Texto Bíblico</div>
                      <span className="text-[9px] text-slate-400 font-normal">Máx 100</span>
                    </th>
                    <th className="py-4 px-3 text-center min-w-[170px]">
                      <div className="flex items-center justify-center gap-1 text-amber-600 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Puntos Manuales</span>
                      </div>
                      <span className="text-[9px] text-amber-700 font-semibold">Con justificación</span>
                    </th>
                    <th className="py-4 px-4 text-center min-w-[140px]">
                      <div>Total Grupal</div>
                      <span className="text-[9px] text-slate-400 font-normal">Base + Manuales</span>
                    </th>
                    <th className="py-4 px-3 text-center w-16">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedGroups.map((g) => {
                    const current = localScores[g.group_id] || {};
                    const isWinner = g.liveRank === 1 && g.liveTotal > 0;

                    return (
                      <tr
                        key={g.group_id}
                        className={`transition-colors ${
                          isWinner ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Position Badge */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs shadow-sm ${
                              g.liveRank === 1
                                ? 'bg-amber-400 text-slate-900 ring-2 ring-amber-300'
                                : g.liveRank === 2
                                ? 'bg-slate-200 text-slate-700'
                                : g.liveRank === 3
                                ? 'bg-amber-700/20 text-amber-900'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {g.liveRank}°
                          </span>
                        </td>

                        {/* Group info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-10 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: g.group_color }}
                            />
                            <div>
                              <div className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                                <span>{g.group_name}</span>
                                {isWinner && <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                <span>{g.totalMembers} miembros</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-medium">
                                  {g.presentCount} presentes ({g.attendanceRate}%)
                                </span>
                              </div>
                              {((current.manual_points && current.manual_points !== 0) || current.manual_points_reason) && (
                                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200" title={current.manual_points_reason}>
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  <span className="truncate max-w-[200px]">Motivo: {current.manual_points_reason || 'Puntos manuales'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Dinámica 1 (max 100) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={current.game1 ?? 0}
                              onChange={(e) => handleScoreChange(g.group_id, 'game1', e.target.value, 100)}
                              className="w-16 px-2 py-1 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'game1', 100)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded font-semibold"
                              >
                                100
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'game1', 50)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold"
                              >
                                50
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Dinámica 2 (max 100) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={current.game2 ?? 0}
                              onChange={(e) => handleScoreChange(g.group_id, 'game2', e.target.value, 100)}
                              className="w-16 px-2 py-1 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'game2', 100)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded font-semibold"
                              >
                                100
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'game2', 50)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold"
                              >
                                50
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Preguntas (max 100) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={current.questions ?? 0}
                              onChange={(e) => handleScoreChange(g.group_id, 'questions', e.target.value, 100)}
                              className="w-16 px-2 py-1 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'questions', 100)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded font-semibold"
                              >
                                100
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'questions', 50)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold"
                              >
                                50
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Traer Biblia (max 200) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={current.bring_bible ?? 0}
                              onChange={(e) => handleScoreChange(g.group_id, 'bring_bible', e.target.value, 200)}
                              className="w-16 px-2 py-1 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'bring_bible', 200)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded font-semibold"
                              >
                                200
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'bring_bible', 100)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold"
                              >
                                100
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Puntualidad (max 200) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={current.punctuality ?? 0}
                              onChange={(e) => handleScoreChange(g.group_id, 'punctuality', e.target.value, 200)}
                              className="w-16 px-2 py-1 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'punctuality', 200)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded font-semibold"
                              >
                                200
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'punctuality', 100)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold"
                              >
                                100
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Asistencia Grupal (max 150) + Auto-calcular */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="150"
                              value={current.group_attendance ?? 0}
                              onChange={(e) => handleScoreChange(g.group_id, 'group_attendance', e.target.value, 150)}
                              className="w-16 px-2 py-1 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleAutoApplyAttendance(g.group_id, g.suggestedAttendancePts)}
                              title={`Auto-calcular basado en ${g.attendanceRate}% de asistencia`}
                              className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold"
                            >
                              <Zap className="w-2.5 h-2.5" />
                              <span>Auto ({g.suggestedAttendancePts})</span>
                            </button>
                          </div>
                        </td>

                        {/* Presentación Texto Bíblico (max 100) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={current.bible_presentation ?? 0}
                              onChange={(e) => handleScoreChange(g.group_id, 'bible_presentation', e.target.value, 100)}
                              className="w-16 px-2 py-1 text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'bible_presentation', 100)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded font-semibold"
                              >
                                100
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'bible_presentation', 50)}
                                className="text-[9px] px-1 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold"
                              >
                                50
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Puntos Manuales + Justificación */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={current.manual_points ?? 0}
                                onChange={(e) => handleScoreChange(g.group_id, 'manual_points', e.target.value, 1000)}
                                className="w-16 px-2 py-1 text-center font-bold text-sm bg-amber-50/70 border border-amber-300 text-amber-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuickSet(g.group_id, 'manual_points', (current.manual_points || 0) + 50)}
                                className="text-[10px] px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold"
                                title="Sumar +50 pts manuales"
                              >
                                +50
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="¿Por qué se dan?"
                              value={current.manual_points_reason || ''}
                              onChange={(e) => handleTextChange(g.group_id, 'manual_points_reason', e.target.value)}
                              className="w-full min-w-[150px] text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                              title="Justificación de los puntos manuales"
                            />
                          </div>
                        </td>

                        {/* Total Grupal */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-base font-black text-slate-900">
                              {g.liveTotal} <span className="text-xs font-normal text-slate-400">pts</span>
                            </span>
                            {/* Progress bar */}
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200">
                              <div
                                className="h-full transition-all duration-300 rounded-full"
                                style={{
                                  width: `${Math.min(100, (g.liveTotal / MAX_GROUP_TOTAL) * 100)}%`,
                                  backgroundColor: g.group_color
                                }}
                              />
                            </div>
                            {g.diffWithFirst > 0 && (
                              <span className="text-[10px] text-rose-500 font-bold mt-1">
                                -{g.diffWithFirst} del líder
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleResetGroupLocal(g.group_id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Restablecer a cero"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="xl:hidden space-y-4">
            {calculatedGroups.map((g) => {
              const current = localScores[g.group_id] || {};
              const isWinner = g.liveRank === 1 && g.liveTotal > 0;

              return (
                <div
                  key={g.group_id}
                  className={`bg-white rounded-3xl p-5 border shadow-sm space-y-4 transition-all ${
                    isWinner ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200/80'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs ${
                          g.liveRank === 1
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {g.liveRank}°
                      </span>
                      <div>
                        <div className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                          <span>{g.group_name}</span>
                          {isWinner && <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />}
                        </div>
                        <div className="text-xs text-slate-400">
                          {g.presentCount} presentes de {g.totalMembers} miembros ({g.attendanceRate}%)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-slate-900">
                        {g.liveTotal}
                      </div>
                      <span className="text-[10px] text-slate-400">pts</span>
                    </div>
                  </div>

                  {/* Competitions Inputs Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Dinámica 1 */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-600">Dinámica 1</span>
                        <span className="text-[10px] text-slate-400">máx 100</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={current.game1 ?? 0}
                        onChange={(e) => handleScoreChange(g.group_id, 'game1', e.target.value, 100)}
                        className="w-full text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-1"
                      />
                    </div>

                    {/* Dinámica 2 */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-600">Dinámica 2</span>
                        <span className="text-[10px] text-slate-400">máx 100</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={current.game2 ?? 0}
                        onChange={(e) => handleScoreChange(g.group_id, 'game2', e.target.value, 100)}
                        className="w-full text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-1"
                      />
                    </div>

                    {/* Preguntas */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-600">Preguntas</span>
                        <span className="text-[10px] text-slate-400">máx 100</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={current.questions ?? 0}
                        onChange={(e) => handleScoreChange(g.group_id, 'questions', e.target.value, 100)}
                        className="w-full text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-1"
                      />
                    </div>

                    {/* Traer Biblia */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-600">Traer Biblia</span>
                        <span className="text-[10px] text-slate-400">máx 200</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={current.bring_bible ?? 0}
                        onChange={(e) => handleScoreChange(g.group_id, 'bring_bible', e.target.value, 200)}
                        className="w-full text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-1"
                      />
                    </div>

                    {/* Puntualidad */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-600">Puntualidad</span>
                        <span className="text-[10px] text-slate-400">máx 200</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={current.punctuality ?? 0}
                        onChange={(e) => handleScoreChange(g.group_id, 'punctuality', e.target.value, 200)}
                        className="w-full text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-1"
                      />
                    </div>

                    {/* Texto Bíblico */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-600">Texto Bíblico</span>
                        <span className="text-[10px] text-slate-400">máx 100</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={current.bible_presentation ?? 0}
                        onChange={(e) => handleScoreChange(g.group_id, 'bible_presentation', e.target.value, 100)}
                        className="w-full text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-1"
                      />
                    </div>
                  </div>

                  {/* Asistencia con Auto-calcular full width */}
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200/80">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-emerald-900 text-xs">Asistencia Grupal (máx 150)</span>
                      <button
                        type="button"
                        onClick={() => handleAutoApplyAttendance(g.group_id, g.suggestedAttendancePts)}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Fijar {g.suggestedAttendancePts} pts</span>
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={current.group_attendance ?? 0}
                      onChange={(e) => handleScoreChange(g.group_id, 'group_attendance', e.target.value, 150)}
                      className="w-full text-center font-bold text-sm bg-white border border-emerald-300 rounded-lg py-1"
                    />
                  </div>

                  {/* Puntos Manuales + Justificación (Mobile) */}
                  <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/90 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-950 text-xs flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Puntos Manuales / Extras</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickSet(g.group_id, 'manual_points', (current.manual_points || 0) + 50)}
                          className="text-[10px] px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold"
                        >
                          +50
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickSet(g.group_id, 'manual_points', (current.manual_points || 0) + 100)}
                          className="text-[10px] px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold"
                        >
                          +100
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      placeholder="0"
                      value={current.manual_points ?? 0}
                      onChange={(e) => handleScoreChange(g.group_id, 'manual_points', e.target.value, 1000)}
                      className="w-full text-center font-bold text-sm bg-white border border-amber-300 rounded-lg py-1 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Justificación: ¿Por qué se dan estos puntos?"
                      value={current.manual_points_reason || ''}
                      onChange={(e) => handleTextChange(g.group_id, 'manual_points_reason', e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleResetGroupLocal(g.group_id)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpiar a 0</span>
                    </button>
                    {g.diffWithFirst > 0 && (
                      <span className="text-xs font-bold text-rose-500">
                        -{g.diffWithFirst} pts del líder
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Save Reminder for Mobile */}
      {hasChanges && (
        <div className="fixed bottom-20 left-4 right-4 sm:hidden z-40 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700">
          <div className="text-xs">
            <span className="font-bold text-amber-400">Hay cambios pendientes</span>
            <p className="text-[10px] text-slate-300">Guarda para actualizar ranking</p>
          </div>
          <button
            type="button"
            onClick={handleSaveScores}
            disabled={saving}
            className="px-4 py-2 bg-amber-400 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5"
          >
            {saving ? 'Guardando...' : 'Guardar Ahora'}
          </button>
        </div>
      )}

      {/* Modal: Asignar Puntos Manuales con Justificación */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Asignar Puntos Manuales</h3>
                  <p className="text-xs text-amber-100">Coloca puntos a un equipo y justifica el por qué</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignManualPoints} className="p-6 space-y-4">
              {/* Select Equipo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Equipo a calificar
                </label>
                <select
                  value={manualModalData.groupId}
                  onChange={(e) => setManualModalData({ ...manualModalData, groupId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">Selecciona un equipo...</option>
                  {calculatedGroups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Sábado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sábado de Actividades
                </label>
                <select
                  value={manualModalData.journeyId}
                  onChange={(e) => setManualModalData({ ...manualModalData, journeyId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  {journeys.map((j) => (
                    <option key={j.id} value={j.id}>
                      {formatDateDMY(j.journey_date)} — {j.title || 'Sábado'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Puntos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cantidad de Puntos
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={manualModalData.points}
                    onChange={(e) => setManualModalData({ ...manualModalData, points: parseInt(e.target.value, 10) || 0 })}
                    required
                    className="w-32 px-3 py-2 text-center text-lg font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/50 text-amber-900"
                  />
                  <div className="flex items-center gap-1.5">
                    {[25, 50, 100, 150].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setManualModalData({ ...manualModalData, points: val })}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Justificación obligatoria */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Justificación / ¿Por qué se dan los puntos? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={manualModalData.reason}
                  onChange={(e) => setManualModalData({ ...manualModalData, reason: e.target.value })}
                  placeholder="Ejemplo: Ganaron el reto bíblico sorpresa, apoyaron en el orden del templo, premio especial de alabanza..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Esta justificación quedará registrada en el historial del equipo y en la auditoría para que todos sepan el motivo.
                </span>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {submittingManual ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Guardar Puntos con Justificación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

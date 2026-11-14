import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Trophy,
  Award,
  Medal,
  Calendar,
  Filter,
  Users2,
  Crown,
  Download,
  Share2,
  Copy,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  CheckCircle2,
  Flame,
  Star,
  ChevronRight,
  BookOpen,
  ArrowUpRight,
  Save
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

export default function RankingsView() {
  const { token } = useAuth();
  const { showToast, selectedSeasonId } = useApp();

  // Tabs: 'groups' | 'individuals' | 'generator'
  const [activeTab, setActiveTab] = useState('groups');

  // Filters
  const [scope, setScope] = useState('season'); // 'season' | 'journey'
  const [journeys, setJourneys] = useState([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [groupsList, setGroupsList] = useState([]);

  // Data states
  const [groupRankings, setGroupRankings] = useState(null);
  const [individualRankings, setIndividualRankings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Canvas for Image Generator
  const canvasRef = useRef(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedDataUrl, setGeneratedDataUrl] = useState(null);

  // Fetch Journeys and Groups for filters
  useEffect(() => {
    fetchInitialFilters();
  }, [selectedSeasonId]);

  const fetchInitialFilters = async () => {
    try {
      const url = selectedSeasonId && selectedSeasonId !== 'all'
        ? `/api/journeys?seasonId=${selectedSeasonId}`
        : '/api/journeys';

      const [jRes, gRes] = await Promise.all([
        fetch(url, { headers: { 'x-session-token': token } }),
        fetch('/api/groups', { headers: { 'x-session-token': token } })
      ]);

      const jData = await jRes.json();
      const gData = await gRes.json();

      setJourneys(jData);
      setGroupsList(gData);

      if (jData.length > 0 && !selectedJourneyId) {
        setSelectedJourneyId(jData[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Rankings according to current filters & tab
  useEffect(() => {
    fetchRankings();
  }, [activeTab, scope, selectedJourneyId, selectedSeasonId, selectedGroupFilter]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const journeyParam = scope === 'journey' && selectedJourneyId ? selectedJourneyId : 'all';
      const seasonParam = selectedSeasonId || 'all';

      if (activeTab === 'groups' || activeTab === 'generator') {
        const res = await fetch(`/api/rankings/groups?seasonId=${seasonParam}&journeyId=${journeyParam}`, {
          headers: { 'x-session-token': token }
        });
        const data = await res.json();
        setGroupRankings(data);
      }

      if (activeTab === 'individuals') {
        const res = await fetch(
          `/api/rankings/individuals?seasonId=${seasonParam}&journeyId=${journeyParam}&groupId=${selectedGroupFilter}`,
          { headers: { 'x-session-token': token } }
        );
        const data = await res.json();
        setIndividualRankings(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar rankings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // =================== PHASE 7: 1080x1350 PNG CANVAS GENERATOR ===================
  const renderCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1350;

    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Deep modern indigo/violet)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0f172a'); // slate-900
    bgGradient.addColorStop(0.35, '#1e1b4b'); // indigo-950
    bgGradient.addColorStop(0.7, '#172554'); // blue-950
    bgGradient.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative Glow Effects
    const glow1 = ctx.createRadialGradient(width * 0.2, height * 0.15, 20, width * 0.2, height * 0.15, 400);
    glow1.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    glow1.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width * 0.8, height * 0.35, 20, width * 0.8, height * 0.35, 450);
    glow2.addColorStop(0, 'rgba(234, 179, 8, 0.2)');
    glow2.addColorStop(1, 'rgba(234, 179, 8, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Header Pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 200, 50, 400, 42, 21);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ DESAFÍO REAL • TABLA OFICIAL ★', width / 2, 77);

    // Main Title: TBBC CLUB BÍBLICO
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TBBC CLUB BÍBLICO', width / 2, 140);

    // Subtitle: Season and Journey
    const currentJourneyObj = journeys.find(j => j.id.toString() === selectedJourneyId?.toString());
    const journeyTitleText = currentJourneyObj
      ? `${formatDateDMY(currentJourneyObj.journey_date)} • ${currentJourneyObj.title || 'Sábado de Actividades'}`
      : 'Clasificación General';

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText(journeyTitleText, width / 2, 180);

    // Winner Box (1st Place Spotlight)
    const groups = groupRankings?.groups || [];
    const winner = groups.length > 0 && groups[0].total_points > 0 ? groups[0] : null;

    if (winner) {
      // Golden spotlight box
      const winGrad = ctx.createLinearGradient(width / 2 - 460, 220, width / 2 + 460, 360);
      winGrad.addColorStop(0, '#ca8a04');
      winGrad.addColorStop(0.5, '#eab308');
      winGrad.addColorStop(1, '#facc15');

      ctx.save();
      ctx.shadowColor = 'rgba(234, 179, 8, 0.5)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = winGrad;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 460, 220, 920, 140, 28);
      ctx.fill();
      ctx.restore();

      // Trophy icon text
      ctx.fillStyle = '#78350f';
      ctx.font = '900 20px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🏆 CAMPEÓN DEL SÁBADO', width / 2 - 420, 260);

      // Group Name
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 48px Inter, system-ui, sans-serif';
      ctx.fillText(winner.group_name.toUpperCase(), width / 2 - 420, 320);

      // Score
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 58px Inter, system-ui, sans-serif';
      ctx.fillText(`${winner.total_points}`, width / 2 + 420, 310);

      ctx.font = 'bold 20px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#78350f';
      ctx.fillText('PUNTOS', width / 2 + 420, 335);
    }

    // Standings Table Header
    const tableTop = winner ? 390 : 230;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(80, tableTop, 920, 48, 14);
    ctx.fill();

    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('PUESTO / GRUPO', 110, tableTop + 30);

    ctx.textAlign = 'center';
    ctx.fillText('DINÁMICAS', 480, tableTop + 30);
    ctx.fillText('PREGUNTAS', 610, tableTop + 30);
    ctx.fillText('BIBLIA/PUNT.', 750, tableTop + 30);

    ctx.textAlign = 'right';
    ctx.fillText('TOTAL PTS', 970, tableTop + 30);

    // Groups Table Rows
    let rowY = tableTop + 65;
    const maxRows = Math.min(6, groups.length);

    for (let i = 0; i < maxRows; i++) {
      const g = groups[i];
      const isFirst = i === 0;

      // Row background
      ctx.fillStyle = isFirst ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.roundRect(80, rowY, 920, 105, 18);
      ctx.fill();

      // Border highlight for 1st
      if (isFirst) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Group color indicator bar
      ctx.fillStyle = g.group_color || '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(95, rowY + 15, 10, 75, 5);
      ctx.fill();

      // Rank circle
      ctx.fillStyle = isFirst ? '#facc15' : i === 1 ? '#cbd5e1' : i === 2 ? '#d97706' : '#334155';
      ctx.beginPath();
      ctx.arc(140, rowY + 52, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isFirst || i > 2 ? '#0f172a' : '#0f172a';
      if (i > 2) ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}°`, 140, rowY + 59);

      // Group Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 28px Inter, system-ui, sans-serif';
      ctx.fillText(g.group_name, 180, rowY + 48);

      // Members count subtext
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 16px Inter, system-ui, sans-serif';
      ctx.fillText(`${g.member_count || 0} integrantes registrados`, 180, rowY + 75);

      // Sub-scores
      const dinPoints = (g.game1 || 0) + (g.game2 || 0);
      const bibPuntPoints = (g.bring_bible || 0) + (g.punctuality || 0);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 22px Inter, system-ui, sans-serif';
      ctx.fillText(`${dinPoints}`, 480, rowY + 60);
      ctx.fillText(`${g.questions || 0}`, 610, rowY + 60);
      ctx.fillText(`${bibPuntPoints}`, 750, rowY + 60);

      // Total Points
      ctx.textAlign = 'right';
      ctx.fillStyle = isFirst ? '#facc15' : '#ffffff';
      ctx.font = '900 38px Inter, system-ui, sans-serif';
      ctx.fillText(`${g.total_points}`, 970, rowY + 62);

      rowY += 120;
    }

    // Bible Verse Footer Banner
    const footerY = 1180;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.beginPath();
    ctx.roundRect(80, footerY, 920, 110, 22);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'italic 500 17px Inter, system-ui, sans-serif';
    ctx.fillText('“Ninguno tenga en poco tu juventud, sino sé ejemplo de los creyentes en palabra,', width / 2, footerY + 42);
    ctx.fillText('conducta, amor, espíritu, fe y pureza.” — 1 Timoteo 4:12', width / 2, footerY + 68);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    ctx.fillText('TBBC • MINISTERIO DE JÓVENES Y ADOLESCENTES', width / 2, footerY + 95);

    // Save as Data URL
    const dataUrl = canvas.toDataURL('image/png');
    setGeneratedDataUrl(dataUrl);
  };

  useEffect(() => {
    if (activeTab === 'generator' && groupRankings) {
      renderCanvasImage();
    }
  }, [activeTab, groupRankings, selectedJourneyId]);

  // Download image action
  const handleDownloadImage = () => {
    if (!generatedDataUrl) return;
    const link = document.createElement('a');
    link.download = `TBBC_CLUB_RESULTADOS_${selectedJourneyId || 'TEMPORADA'}.png`;
    link.href = generatedDataUrl;
    link.click();
    showToast('¡Imagen PNG 1080x1350 descargada exitosamente!');
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Imagen copiada al portapapeles. ¡Pégala directo en WhatsApp Web!');
      });
    } catch (err) {
      console.error(err);
      showToast('Tu navegador no soporta copiado directo. Descarga la imagen.', 'error');
    }
  };

  // Web Share API
  const handleShareWhatsApp = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        const file = new File([blob], 'tbbc_club_resultados.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Resultados TBBC Club Bíblico',
            text: 'Resultados oficiales del Club Bíblico TBBC.'
          });
        } else {
          handleDownloadImage();
        }
      });
    } catch (err) {
      console.error(err);
      handleDownloadImage();
    }
  };

  // Save to SQLite generated images history
  const handleSaveToHistory = async () => {
    if (!selectedJourneyId || !generatedDataUrl) return;
    try {
      setGeneratingImage(true);
      const res = await fetch(`/api/rankings/image/${selectedJourneyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token
        },
        body: JSON.stringify({
          fileName: `resultado_jornada_${selectedJourneyId}.png`,
          imageData: generatedDataUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Imagen registrada en el historial de imágenes del club.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al guardar en historial', 'error');
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-200" />
            <span>Resultados Oficiales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Tabla de Posiciones y Foto WhatsApp
          </h1>
          <p className="text-amber-100 text-sm mt-1 max-w-xl">
            Mira qué grupo va ganando la temporada y descarga la foto oficial en alta resolución para mandar por los grupos de WhatsApp.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-black/20 p-1.5 rounded-2xl backdrop-blur-md self-start md:self-auto border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'groups'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Grupos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('individuals')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'individuals'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Chicos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'generator'
                ? 'bg-amber-400 text-slate-900 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Foto WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Scope Selector: Season vs Journey */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setScope('season')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                scope === 'season'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Toda la Temporada
            </button>
            <button
              type="button"
              onClick={() => setScope('journey')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                scope === 'journey'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Por Jornada Específica
            </button>
          </div>

          {/* Journey Dropdown (if scope === 'journey' or in generator) */}
          {(scope === 'journey' || activeTab === 'generator') && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={selectedJourneyId}
                onChange={(e) => setSelectedJourneyId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {journeys.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatDateDMY(j.journey_date)} — {j.title || 'Sábado'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group Dropdown (for individual rankings) */}
          {activeTab === 'individuals' && (
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-slate-400" />
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los Grupos</option>
                {groupsList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Info Badge */}
        <div className="text-xs text-slate-500 font-medium">
          Temporada: <strong className="text-slate-800">{groupRankings?.season?.name || 'Activa'}</strong>
        </div>
      </div>

      {/* ===================== TAB 1: GROUP RANKINGS ===================== */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Top Podium Cards (2 groups showdown) */}
          {groupRankings?.groups && groupRankings.groups.length === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* 1st Place (Crown) */}
              <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-6 border-2 border-amber-300 shadow-lg shadow-amber-500/10 flex flex-col items-center text-center relative">
                <div className="absolute -top-3 px-3 py-1 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px] tracking-wider uppercase shadow flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 fill-slate-900" />
                  <span>1° Lugar Campeón</span>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl mb-3 shadow-md mt-2">
                  1°
                </div>
                <div
                  className="w-16 h-2 rounded-full mb-2"
                  style={{ backgroundColor: groupRankings.groups[0]?.group_color }}
                />
                <h3 className="font-extrabold text-slate-900 text-xl">
                  {groupRankings.groups[0]?.group_name}
                </h3>
                <span className="text-xs text-amber-700 font-semibold mb-3">
                  {groupRankings.groups[0]?.victories !== undefined ? `${groupRankings.groups[0]?.victories} victorias en temporada` : 'Líder del Sábado'}
                </span>
                <div className="text-4xl font-black text-amber-600">
                  {groupRankings.groups[0]?.total_points} <span className="text-sm font-normal text-slate-400">pts</span>
                </div>
                <div className="mt-3 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Líder de la competencia
                </div>
              </div>

              {/* 2nd Place */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-2xl mb-3 shadow-inner mt-2">
                  2°
                </div>
                <div
                  className="w-14 h-2 rounded-full mb-2"
                  style={{ backgroundColor: groupRankings.groups[1]?.group_color }}
                />
                <h3 className="font-extrabold text-slate-800 text-xl">
                  {groupRankings.groups[1]?.group_name}
                </h3>
                <span className="text-xs text-slate-400 font-semibold mb-3">
                  {groupRankings.groups[1]?.member_count} miembros
                </span>
                <div className="text-4xl font-black text-slate-900">
                  {groupRankings.groups[1]?.total_points} <span className="text-xs font-normal text-slate-400">pts</span>
                </div>
                <span className="text-xs font-bold text-rose-500 mt-2">
                  -{groupRankings.groups[1]?.diffWithLeader} del líder
                </span>
              </div>
            </div>
          )}

          {/* Top 3 Podium Cards (3+ groups) */}
          {groupRankings?.groups && groupRankings.groups.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* 2nd Place */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center text-center order-2 md:order-1 relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-lg mb-3 shadow-inner">
                  2°
                </div>
                <div
                  className="w-14 h-2 rounded-full mb-2"
                  style={{ backgroundColor: groupRankings.groups[1]?.group_color }}
                />
                <h3 className="font-extrabold text-slate-800 text-lg">
                  {groupRankings.groups[1]?.group_name}
                </h3>
                <span className="text-xs text-slate-400 font-semibold mb-3">
                  {groupRankings.groups[1]?.member_count} miembros
                </span>
                <div className="text-3xl font-black text-slate-900">
                  {groupRankings.groups[1]?.total_points} <span className="text-xs font-normal text-slate-400">pts</span>
                </div>
                <span className="text-xs font-bold text-rose-500 mt-1">
                  -{groupRankings.groups[1]?.diffWithLeader} del líder
                </span>
              </div>

              {/* 1st Place (Crown) */}
              <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-6 border-2 border-amber-300 shadow-lg shadow-amber-500/10 flex flex-col items-center text-center order-1 md:order-2 relative -translate-y-2">
                <div className="absolute -top-3 px-3 py-1 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px] tracking-wider uppercase shadow flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 fill-slate-900" />
                  <span>1° Lugar Campeón</span>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl mb-3 shadow-md mt-2">
                  1°
                </div>
                <div
                  className="w-16 h-2 rounded-full mb-2"
                  style={{ backgroundColor: groupRankings.groups[0]?.group_color }}
                />
                <h3 className="font-extrabold text-slate-900 text-xl">
                  {groupRankings.groups[0]?.group_name}
                </h3>
                <span className="text-xs text-amber-700 font-semibold mb-3">
                  {groupRankings.groups[0]?.victories !== undefined ? `${groupRankings.groups[0]?.victories} victorias en temporada` : 'Líder de la jornada'}
                </span>
                <div className="text-4xl font-black text-amber-600">
                  {groupRankings.groups[0]?.total_points} <span className="text-sm font-normal text-slate-400">pts</span>
                </div>
                <div className="mt-3 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Líder indiscutible
                </div>
              </div>

              {/* 3rd Place */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center text-center order-3 relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center font-black text-lg mb-3 shadow-inner">
                  3°
                </div>
                <div
                  className="w-14 h-2 rounded-full mb-2"
                  style={{ backgroundColor: groupRankings.groups[2]?.group_color }}
                />
                <h3 className="font-extrabold text-slate-800 text-lg">
                  {groupRankings.groups[2]?.group_name}
                </h3>
                <span className="text-xs text-slate-400 font-semibold mb-3">
                  {groupRankings.groups[2]?.member_count} miembros
                </span>
                <div className="text-3xl font-black text-slate-900">
                  {groupRankings.groups[2]?.total_points} <span className="text-xs font-normal text-slate-400">pts</span>
                </div>
                <span className="text-xs font-bold text-rose-500 mt-1">
                  -{groupRankings.groups[2]?.diffWithLeader} del líder
                </span>
              </div>
            </div>
          )}

          {/* Full Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {scope === 'season' ? 'Tabla General Acumulada de Grupos' : 'Puntajes de la Jornada Seleccionada'}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                {groupRankings?.groups?.length || 0} grupos clasificados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-14">Lugar</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Grupo</th>
                    <th className="py-3.5 px-4 text-center">Miembros</th>
                    {scope === 'season' && (
                      <th className="py-3.5 px-4 text-center">Victorias (1°)</th>
                    )}
                    {scope === 'season' && (
                      <th className="py-3.5 px-4 text-center">Promedio Sábado</th>
                    )}
                    <th className="py-3.5 px-4 text-right">Puntos Totales</th>
                    <th className="py-3.5 px-4 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupRankings?.groups?.map((g) => (
                    <tr key={g.group_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs ${
                            g.rank === 1
                              ? 'bg-amber-400 text-slate-900 font-extrabold'
                              : g.rank === 2
                              ? 'bg-slate-200 text-slate-700'
                              : g.rank === 3
                              ? 'bg-amber-700/20 text-amber-900'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {g.rank}°
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3.5 h-8 rounded-full shrink-0"
                            style={{ backgroundColor: g.group_color }}
                          />
                          <div>
                            <span className="font-extrabold text-slate-800 text-sm">
                              {g.group_name}
                            </span>
                            {scope === 'journey' && g.manual_points_reason && (
                              <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5" title={g.manual_points_reason}>
                                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate max-w-[200px]">Motivo: {g.manual_points_reason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center text-slate-600 font-semibold">
                        {g.member_count}
                      </td>

                      {scope === 'season' && (
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            <span>{g.victories}</span>
                          </span>
                        </td>
                      )}

                      {scope === 'season' && (
                        <td className="py-4 px-4 text-center font-bold text-slate-700">
                          {g.average_points} pts
                        </td>
                      )}

                      <td className="py-4 px-4 text-right">
                        <span className="text-base font-black text-slate-900">
                          {g.total_points}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right text-xs font-bold">
                        {g.diffWithLeader === 0 ? (
                          <span className="text-emerald-600">Líder</span>
                        ) : (
                          <span className="text-rose-500">-{g.diffWithLeader}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: INDIVIDUAL RANKINGS ===================== */}
      {activeTab === 'individuals' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {scope === 'season' ? 'Ranking Acumulado de Participantes' : 'Puntajes Individuales de la Jornada'}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                {individualRankings?.participants?.length || 0} participantes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-14">Lugar</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Participante</th>
                    <th className="py-3.5 px-4">Grupo</th>
                    {scope === 'season' ? (
                      <>
                        <th className="py-3.5 px-4 text-center">Sábados Asistidos</th>
                        <th className="py-3.5 px-4 text-center">Estrellas Especiales</th>
                        <th className="py-3.5 px-4 text-center">Promedio Sábado</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3.5 px-4 text-center">Asistencia</th>
                        <th className="py-3.5 px-4 text-center">Reconocimiento</th>
                      </>
                    )}
                    <th className="py-3.5 px-4 text-right">Puntos</th>
                    <th className="py-3.5 px-4 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {individualRankings?.participants?.map((p) => (
                    <tr key={p.participant_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs ${
                            p.rank === 1
                              ? 'bg-amber-400 text-slate-900 font-extrabold'
                              : p.rank === 2
                              ? 'bg-slate-200 text-slate-700'
                              : p.rank === 3
                              ? 'bg-amber-700/20 text-amber-900'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.rank}°
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-800">
                        {p.full_name}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-white shadow-sm"
                          style={{ backgroundColor: p.group_color || '#64748b' }}
                        >
                          {p.group_name || 'Sin grupo'}
                        </span>
                      </td>

                      {scope === 'season' ? (
                        <>
                          <td className="py-4 px-4 text-center font-semibold text-slate-700">
                            {p.journeys_attended} sábados
                          </td>
                          <td className="py-4 px-4 text-center">
                            {p.total_recognitions > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                <span>{p.total_recognitions}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-slate-700">
                            {p.average_points} pts
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                p.attendance_status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {p.attendance_status === 'present' ? 'Presente' : 'Ausente'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {p.special_recognition ? (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-400 mx-auto" />
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                        </>
                      )}

                      <td className="py-4 px-4 text-right">
                        <span className="text-base font-black text-slate-900">
                          {p.total_points}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right text-xs font-bold">
                        {p.diffWithLeader === 0 ? (
                          <span className="text-emerald-600">Líder</span>
                        ) : (
                          <span className="text-rose-500">-{p.diffWithLeader}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: PHASE 7 IMAGE GENERATOR ===================== */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">
                Generador Gráfico de Resultados (1080 × 1350 px)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proporción vertical 4:5 ideal para estados de WhatsApp, Instagram stories y publicaciones de redes sociales.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PNG (1080x1350)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Imagen</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToHistory}
                disabled={generatingImage}
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Guardar en Historial</span>
              </button>
            </div>
          </div>

          {/* Hidden Canvas used for high-res 1080x1350 rendering */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Image Preview Container */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 flex justify-center items-center shadow-xl border border-slate-800">
            {generatedDataUrl ? (
              <div className="max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 ring-4 ring-black/40">
                <img
                  src={generatedDataUrl}
                  alt="Previsualización TBBC Club Bíblico 1080x1350"
                  className="w-full h-auto object-contain"
                />
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold">Generando diseño de alta resolución...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


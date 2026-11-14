import { queryAll, queryOne } from './db.js';
import fs from 'fs';
import path from 'path';

/**
 * Helper para formatear CSV con BOM UTF-8 (para que Microsoft Excel abra acentos y ñ sin problemas)
 */
function toCsv(headers, rows) {
  const BOM = '\uFEFF';
  const headerLine = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map(r => 
    r.map(val => {
      if (val === null || val === undefined) return '""';
      return `"${val.toString().replace(/"/g, '""')}"`;
    }).join(',')
  );
  return BOM + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Formatear fecha a Día/Mes/Año (DD/MM/YYYY) para Excel
 */
function formatDmy(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.toString().split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Reporte de Asistencia en CSV
 */
export function getAttendanceReportCsv(db, seasonId = null) {
  let seasonFilter = '';
  const params = [];
  if (seasonId && seasonId !== 'all') {
    seasonFilter = 'WHERE j.season_id = ?';
    params.push(seasonId);
  }

  const rows = queryAll(db, `
    SELECT 
      j.journey_date,
      j.title as journey_title,
      s.name as season_name,
      p.full_name as participant_name,
      COALESCE(g.name, 'Sin grupo') as group_name,
      a.status,
      a.updated_at
    FROM attendance a
    JOIN journeys j ON a.journey_id = j.id
    LEFT JOIN seasons s ON j.season_id = s.id
    JOIN participants p ON a.participant_id = p.id
    LEFT JOIN groups g ON p.group_id = g.id
    ${seasonFilter}
    ORDER BY j.journey_date DESC, g.name ASC, p.full_name ASC
  `, params);

  const headers = ['Fecha (Día/Mes/Año)', 'Título del Sábado', 'Temporada', 'Participante', 'Grupo', 'Estado Asistencia', 'Fecha Registro'];
  const data = rows.map(r => [
    formatDmy(r.journey_date),
    r.journey_title || '',
    r.season_name || '',
    r.participant_name,
    r.group_name,
    r.status === 'present' ? 'Presente' : r.status === 'absent' ? 'Ausente' : 'Excusado',
    formatDmy(r.updated_at)
  ]);

  return toCsv(headers, data);
}

/**
 * Reporte de Puntuaciones Individuales en CSV
 */
export function getIndividualScoresReportCsv(db, seasonId = null) {
  let seasonFilter = '';
  const params = [];
  if (seasonId && seasonId !== 'all') {
    seasonFilter = 'WHERE j.season_id = ?';
    params.push(seasonId);
  }

  const rows = queryAll(db, `
    SELECT 
      j.journey_date,
      s.name as season_name,
      p.full_name,
      COALESCE(g.name, 'Sin grupo') as group_name,
      ind.punctuality,
      ind.bring_bible,
      ind.attendance,
      ind.devotional,
      ind.verse,
      ind.church,
      ind.total,
      ind.special_recognition
    FROM individual_scores ind
    JOIN journeys j ON ind.journey_id = j.id
    LEFT JOIN seasons s ON j.season_id = s.id
    JOIN participants p ON ind.participant_id = p.id
    LEFT JOIN groups g ON p.group_id = g.id
    ${seasonFilter}
    ORDER BY j.journey_date DESC, ind.total DESC, p.full_name ASC
  `, params);

  const headers = [
    'Fecha (Día/Mes/Año)',
    'Temporada',
    'Participante',
    'Grupo',
    'Puntualidad (15)',
    'Traer Biblia (20)',
    'Asistencia (10)',
    'Devocional (25)',
    'Versículo (10)',
    'Iglesia (20)',
    'Total (100)',
    'Reconocimiento Especial'
  ];

  const data = rows.map(r => [
    formatDmy(r.journey_date),
    r.season_name || '',
    r.full_name,
    r.group_name,
    r.punctuality,
    r.bring_bible,
    r.attendance,
    r.devotional,
    r.verse,
    r.church,
    r.total,
    r.special_recognition ? 'SÍ' : 'NO'
  ]);

  return toCsv(headers, data);
}

/**
 * Reporte de Puntuaciones Grupales en CSV
 */
export function getGroupScoresReportCsv(db, seasonId = null) {
  let seasonFilter = '';
  const params = [];
  if (seasonId && seasonId !== 'all') {
    seasonFilter = 'WHERE j.season_id = ?';
    params.push(seasonId);
  }

  const rows = queryAll(db, `
    SELECT 
      j.journey_date,
      s.name as season_name,
      g.name as group_name,
      gs.game1,
      gs.game2,
      gs.questions,
      gs.bring_bible,
      gs.punctuality,
      gs.group_attendance,
      gs.bible_presentation,
      COALESCE(gs.manual_points, 0) as manual_points,
      COALESCE(gs.manual_points_reason, '') as manual_points_reason,
      gs.total
    FROM group_scores gs
    JOIN journeys j ON gs.journey_id = j.id
    LEFT JOIN seasons s ON j.season_id = s.id
    JOIN groups g ON gs.group_id = g.id
    ${seasonFilter}
    ORDER BY j.journey_date DESC, gs.total DESC, g.name ASC
  `, params);

  const headers = [
    'Fecha (Día/Mes/Año)',
    'Temporada',
    'Grupo',
    'Dinámica 1 (100)',
    'Dinámica 2 (100)',
    'Preguntas (100)',
    'Traer Biblia (200)',
    'Puntualidad (200)',
    'Asistencia Grupal (150)',
    'Texto Bíblico (100)',
    'Puntos Manuales / Extras',
    'Justificación de Puntos Manuales',
    'Total Grupal'
  ];

  const data = rows.map(r => [
    formatDmy(r.journey_date),
    r.season_name || '',
    r.group_name,
    r.game1,
    r.game2,
    r.questions,
    r.bring_bible,
    r.punctuality,
    r.group_attendance,
    r.bible_presentation,
    r.manual_points,
    r.manual_points_reason || '',
    r.total
  ]);

  return toCsv(headers, data);
}


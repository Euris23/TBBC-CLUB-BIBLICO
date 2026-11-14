import { queryAll, queryOne, execute, logAudit } from './db.js';

export const GROUP_COMPETITIONS = [
  { id: 'game1', label: 'Dinámica 1', maxPts: 100 },
  { id: 'game2', label: 'Dinámica 2', maxPts: 100 },
  { id: 'questions', label: 'Preguntas Bíblicas', maxPts: 100 },
  { id: 'bring_bible', label: 'Traer Biblia Grupal', maxPts: 200 },
  { id: 'punctuality', label: 'Puntualidad Grupal', maxPts: 200 },
  { id: 'group_attendance', label: 'Asistencia Grupal', maxPts: 150 },
  { id: 'bible_presentation', label: 'Presentación Texto Bíblico', maxPts: 100 }
];

export const MAX_GROUP_TOTAL = 950;

/**
 * Obtener hoja de puntuaciones grupales para una jornada específica
 */
export function getJourneyGroupScores(db, journeyId) {
  const journey = queryOne(db, `
    SELECT j.*, s.name as season_name 
    FROM journeys j 
    LEFT JOIN seasons s ON j.season_id = s.id 
    WHERE j.id = ?
  `, [journeyId]);

  if (!journey) return null;

  // Obtener grupos activos o que ya tengan puntuación registrada en esta jornada
  const groups = queryAll(db, `
    SELECT 
      g.id as group_id,
      g.name as group_name,
      g.color as group_color,
      g.is_active,
      COALESCE(gs.id, 0) as score_id,
      COALESCE(gs.game1, 0) as game1,
      COALESCE(gs.game2, 0) as game2,
      COALESCE(gs.questions, 0) as questions,
      COALESCE(gs.bring_bible, 0) as bring_bible,
      COALESCE(gs.punctuality, 0) as punctuality,
      COALESCE(gs.group_attendance, 0) as group_attendance,
      COALESCE(gs.bible_presentation, 0) as bible_presentation,
      COALESCE(gs.manual_points, 0) as manual_points,
      COALESCE(gs.manual_points_reason, '') as manual_points_reason,
      COALESCE(gs.total, 0) as total,
      gs.updated_at
    FROM groups g
    LEFT JOIN group_scores gs ON gs.group_id = g.id AND gs.journey_id = ?
    WHERE g.is_active = 1 OR gs.id IS NOT NULL
    ORDER BY total DESC, g.name ASC
  `, [journeyId]);

  // Enriquecer cada grupo con estadísticas de asistencia de esa jornada
  const enrichedGroups = groups.map((grp) => {
    // Total de participantes activos del grupo
    const totalMembers = queryOne(db, `
      SELECT COUNT(*) as count 
      FROM participants 
      WHERE group_id = ? AND is_active = 1
    `, [grp.group_id])?.count || 0;

    // Asistencias presentes en esta jornada
    const presentCount = queryOne(db, `
      SELECT COUNT(*) as count 
      FROM attendance a
      JOIN participants p ON a.participant_id = p.id
      WHERE a.journey_id = ? AND p.group_id = ? AND a.status = 'present'
    `, [journeyId, grp.group_id])?.count || 0;

    const attendanceRate = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;
    const suggestedAttendancePts = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 150) : 0;

    return {
      ...grp,
      totalMembers,
      presentCount,
      attendanceRate,
      suggestedAttendancePts
    };
  });

  // Ordenar y asignar puestos del ranking en la jornada
  enrichedGroups.sort((a, b) => b.total - a.total);
  let currentRank = 1;
  const rankedGroups = enrichedGroups.map((g, idx) => {
    if (idx > 0 && g.total < enrichedGroups[idx - 1].total) {
      currentRank = idx + 1;
    }
    return {
      ...g,
      rank: currentRank,
      diffWithLeader: idx === 0 ? 0 : enrichedGroups[0].total - g.total
    };
  });

  // Estadísticas globales de la jornada
  const totalDistributed = rankedGroups.reduce((acc, g) => acc + g.total, 0);
  const averagePoints = rankedGroups.length > 0 ? Math.round(totalDistributed / rankedGroups.length) : 0;
  const leaderGroup = rankedGroups.length > 0 && rankedGroups[0].total > 0 ? rankedGroups[0] : null;

  return {
    journey,
    groups: rankedGroups,
    summary: {
      totalGroups: rankedGroups.length,
      totalDistributed,
      averagePoints,
      maxPossible: MAX_GROUP_TOTAL,
      leaderGroup: leaderGroup ? {
        id: leaderGroup.group_id,
        name: leaderGroup.group_name,
        color: leaderGroup.group_color,
        total: leaderGroup.total
      } : null
    }
  };
}

/**
 * Guardar o actualizar puntuaciones grupales en bloque
 */
export function saveJourneyGroupScores(db, journeyId, scores) {
  if (!scores || !Array.isArray(scores)) {
    return { success: false, message: 'Formato de puntuaciones inválido.' };
  }

  const journey = queryOne(db, "SELECT * FROM journeys WHERE id = ?", [journeyId]);
  if (!journey) {
    return { success: false, message: 'Jornada no encontrada.' };
  }

  // Validación estricta previa
  for (const item of scores) {
    const { group_id } = item;
    if (!group_id) continue;

    const g1 = parseInt(item.game1, 10) || 0;
    const g2 = parseInt(item.game2, 10) || 0;
    const q = parseInt(item.questions, 10) || 0;
    const bb = parseInt(item.bring_bible, 10) || 0;
    const p = parseInt(item.punctuality, 10) || 0;
    const ga = parseInt(item.group_attendance, 10) || 0;
    const bp = parseInt(item.bible_presentation, 10) || 0;

    if (g1 < 0 || g1 > 100) return { success: false, message: `Dinámica 1 debe estar entre 0 y 100 pts (recibido: ${g1})` };
    if (g2 < 0 || g2 > 100) return { success: false, message: `Dinámica 2 debe estar entre 0 y 100 pts (recibido: ${g2})` };
    if (q < 0 || q > 100) return { success: false, message: `Preguntas Bíblicas debe estar entre 0 y 100 pts (recibido: ${q})` };
    if (bb < 0 || bb > 200) return { success: false, message: `Traer Biblia Grupal debe estar entre 0 y 200 pts (recibido: ${bb})` };
    if (p < 0 || p > 200) return { success: false, message: `Puntualidad Grupal debe estar entre 0 y 200 pts (recibido: ${p})` };
    if (ga < 0 || ga > 150) return { success: false, message: `Asistencia Grupal debe estar entre 0 y 150 pts (recibido: ${ga})` };
    if (bp < 0 || bp > 100) return { success: false, message: `Presentación Texto Bíblico debe estar entre 0 y 100 pts (recibido: ${bp})` };

    const baseTotal = g1 + g2 + q + bb + p + ga + bp;
    if (baseTotal > MAX_GROUP_TOTAL) {
      return { success: false, message: `Los rubros estándar del grupo no pueden superar los ${MAX_GROUP_TOTAL} puntos (suma actual: ${baseTotal}).` };
    }
  }

  const now = new Date().toISOString();

  for (const item of scores) {
    const { group_id } = item;
    if (!group_id) continue;

    const g1 = Math.min(100, Math.max(0, parseInt(item.game1, 10) || 0));
    const g2 = Math.min(100, Math.max(0, parseInt(item.game2, 10) || 0));
    const q = Math.min(100, Math.max(0, parseInt(item.questions, 10) || 0));
    const bb = Math.min(200, Math.max(0, parseInt(item.bring_bible, 10) || 0));
    const p = Math.min(200, Math.max(0, parseInt(item.punctuality, 10) || 0));
    const ga = Math.min(150, Math.max(0, parseInt(item.group_attendance, 10) || 0));
    const bp = Math.min(100, Math.max(0, parseInt(item.bible_presentation, 10) || 0));
    const manualPts = parseInt(item.manual_points, 10) || 0;
    const manualReason = (item.manual_points_reason || '').trim();
    const total = g1 + g2 + q + bb + p + ga + bp + manualPts;

    const existing = queryOne(
      db,
      "SELECT id FROM group_scores WHERE journey_id = ? AND group_id = ?",
      [journeyId, group_id]
    );

    if (existing) {
      execute(
        db,
        `UPDATE group_scores 
         SET game1 = ?, game2 = ?, questions = ?, bring_bible = ?, punctuality = ?, group_attendance = ?, bible_presentation = ?, manual_points = ?, manual_points_reason = ?, total = ?, updated_at = ?
         WHERE id = ?`,
        [g1, g2, q, bb, p, ga, bp, manualPts, manualReason, total, now, existing.id]
      );
    } else {
      execute(
        db,
        `INSERT INTO group_scores (journey_id, group_id, game1, game2, questions, bring_bible, punctuality, group_attendance, bible_presentation, manual_points, manual_points_reason, total, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [journeyId, group_id, g1, g2, q, bb, p, ga, bp, manualPts, manualReason, total, now]
      );
    }
  }

  // Marcar imágenes generadas de esta jornada como desactualizadas para alertar al usuario
  execute(db, "UPDATE generated_images SET is_outdated = 1 WHERE journey_id = ?", [journeyId]);

  logAudit(db, 'PUNTOS_GRUPALES_GUARDADOS', `Puntuaciones grupales actualizadas para jornada #${journeyId} (${journey.journey_date})`);

  return {
    success: true,
    message: 'Puntuaciones grupales guardadas correctamente.'
  };
}

/**
 * Resetear puntuación grupal para un grupo específico en una jornada
 */
export function resetGroupScore(db, journeyId, groupId) {
  const existing = queryOne(db, "SELECT id FROM group_scores WHERE journey_id = ? AND group_id = ?", [journeyId, groupId]);
  const now = new Date().toISOString();

  if (existing) {
    execute(
      db,
      `UPDATE group_scores 
       SET game1 = 0, game2 = 0, questions = 0, bring_bible = 0, punctuality = 0, group_attendance = 0, bible_presentation = 0, manual_points = 0, manual_points_reason = '', total = 0, updated_at = ?
       WHERE id = ?`,
      [now, existing.id]
    );
  }

  execute(db, "UPDATE generated_images SET is_outdated = 1 WHERE journey_id = ?", [journeyId]);
  logAudit(db, 'PUNTOS_GRUPAL_RESETEADOS', `Puntos del grupo #${groupId} reseteados a 0 en jornada #${journeyId}`);

  return {
    success: true,
    message: 'Puntos del grupo restablecidos a 0.'
  };
}

/**
 * Asignar puntos manuales directamente a un equipo con justificación obligatoria
 */
export function assignManualGroupPoints(db, { journeyId, groupId, points, reason }) {
  if (!journeyId || !groupId) {
    return { success: false, message: 'El sábado y el equipo son obligatorios.' };
  }
  const pts = parseInt(points, 10);
  if (isNaN(pts) || pts === 0) {
    return { success: false, message: 'La cantidad de puntos debe ser un número diferente de cero.' };
  }
  if (!reason || !reason.trim()) {
    return { success: false, message: 'Debes escribir el motivo o justificación de por qué se le otorgan estos puntos.' };
  }

  const group = queryOne(db, "SELECT name FROM groups WHERE id = ?", [groupId]);
  if (!group) {
    return { success: false, message: 'Equipo no encontrado.' };
  }
  const journey = queryOne(db, "SELECT journey_date FROM journeys WHERE id = ?", [journeyId]);
  if (!journey) {
    return { success: false, message: 'Sábado / Jornada no encontrada.' };
  }

  const now = new Date().toISOString();
  const existing = queryOne(db, "SELECT * FROM group_scores WHERE journey_id = ? AND group_id = ?", [journeyId, groupId]);

  if (existing) {
    const newManualPts = (existing.manual_points || 0) + pts;
    const cleanReason = reason.trim();
    const newReason = existing.manual_points_reason
      ? `${existing.manual_points_reason} • ${cleanReason} (${pts > 0 ? '+' : ''}${pts} pts)`
      : `${cleanReason} (${pts > 0 ? '+' : ''}${pts} pts)`;
    const newTotal = Math.max(0, (existing.total || 0) + pts);

    execute(
      db,
      "UPDATE group_scores SET manual_points = ?, manual_points_reason = ?, total = ?, updated_at = ? WHERE id = ?",
      [newManualPts, newReason, newTotal, now, existing.id]
    );
  } else {
    execute(
      db,
      `INSERT INTO group_scores (journey_id, group_id, game1, game2, questions, bring_bible, punctuality, group_attendance, bible_presentation, manual_points, manual_points_reason, total, updated_at)
       VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, ?)`,
      [journeyId, groupId, pts, `${reason.trim()} (${pts > 0 ? '+' : ''}${pts} pts)`, Math.max(0, pts), now]
    );
  }

  execute(db, "UPDATE generated_images SET is_outdated = 1 WHERE journey_id = ?", [journeyId]);
  logAudit(
    db,
    'PUNTOS_MANUALES',
    `Se asignaron ${pts > 0 ? '+' + pts : pts} puntos manuales al equipo "${group.name}". Motivo: ${reason.trim()}`
  );

  return {
    success: true,
    message: `¡${pts > 0 ? '+' + pts : pts} puntos manuales asignados a "${group.name}" correctamente!`
  };
}


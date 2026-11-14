import { queryAll, queryOne, execute, logAudit } from './db.js';

// Get all participants with filters & computed metrics (optionally scoped by season)
export function getAllParticipants(db, filters = {}) {
  const { search = '', groupId = '', status = 'all', seasonId = null } = filters;

  let whereClauses = [];
  let params = [];

  if (search && search.trim()) {
    whereClauses.push('LOWER(p.full_name) LIKE LOWER(?)');
    params.push(`%${search.trim()}%`);
  }

  if (groupId && String(groupId) !== 'all') {
    if (groupId === 'none') {
      whereClauses.push('p.group_id IS NULL');
    } else {
      whereClauses.push('p.group_id = ?');
      params.push(groupId);
    }
  }

  if (status === 'active') {
    whereClauses.push('p.is_active = 1');
  } else if (status === 'inactive') {
    whereClauses.push('p.is_active = 0');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const hasSeason = seasonId && String(seasonId) !== 'all';
  const seasonClause = hasSeason ? 'AND j.season_id = ?' : '';

  const totalPointsQuery = hasSeason
    ? '(SELECT SUM(ind.total) FROM individual_scores ind JOIN journeys j ON ind.journey_id = j.id WHERE ind.participant_id = p.id AND j.season_id = ?)'
    : '(SELECT SUM(ind.total) FROM individual_scores ind WHERE ind.participant_id = p.id)';

  const presentCountQuery = hasSeason
    ? '(SELECT COUNT(*) FROM attendance a JOIN journeys j ON a.journey_id = j.id WHERE a.participant_id = p.id AND a.status = \'present\' AND j.season_id = ?)'
    : '(SELECT COUNT(*) FROM attendance a WHERE a.participant_id = p.id AND a.status = \'present\')';

  const absentCountQuery = hasSeason
    ? '(SELECT COUNT(*) FROM attendance a JOIN journeys j ON a.journey_id = j.id WHERE a.participant_id = p.id AND a.status = \'absent\' AND j.season_id = ?)'
    : '(SELECT COUNT(*) FROM attendance a WHERE a.participant_id = p.id AND a.status = \'absent\')';

  const excusedCountQuery = hasSeason
    ? '(SELECT COUNT(*) FROM attendance a JOIN journeys j ON a.journey_id = j.id WHERE a.participant_id = p.id AND a.status = \'excused\' AND j.season_id = ?)'
    : '(SELECT COUNT(*) FROM attendance a WHERE a.participant_id = p.id AND a.status = \'excused\')';

  const totalSessionsQuery = hasSeason
    ? '(SELECT COUNT(*) FROM attendance a JOIN journeys j ON a.journey_id = j.id WHERE a.participant_id = p.id AND j.season_id = ?)'
    : '(SELECT COUNT(*) FROM attendance a WHERE a.participant_id = p.id)';

  const avgPointsQuery = hasSeason
    ? '(SELECT ROUND(AVG(ind.total), 1) FROM individual_scores ind JOIN journeys j ON ind.journey_id = j.id WHERE ind.participant_id = p.id AND j.season_id = ?)'
    : '(SELECT ROUND(AVG(ind.total), 1) FROM individual_scores ind WHERE ind.participant_id = p.id)';

  const selectParams = hasSeason
    ? [seasonId, seasonId, seasonId, seasonId, seasonId, seasonId]
    : [];

  const sql = `
    SELECT 
      p.id,
      p.full_name,
      p.group_id,
      g.name as group_name,
      g.color as group_color,
      p.entry_date,
      p.is_active,
      p.created_at,
      p.updated_at,
      COALESCE(${totalPointsQuery}, 0) as total_points,
      COALESCE(${presentCountQuery}, 0) as present_count,
      COALESCE(${absentCountQuery}, 0) as absent_count,
      COALESCE(${excusedCountQuery}, 0) as excused_count,
      COALESCE(${totalSessionsQuery}, 0) as total_sessions,
      COALESCE(${avgPointsQuery}, 0) as average_points
    FROM participants p
    LEFT JOIN groups g ON p.group_id = g.id
    ${whereSql}
    ORDER BY p.is_active DESC, p.full_name ASC
  `;

  const allParams = [...selectParams, ...params];
  const rows = queryAll(db, sql, allParams);

  // Calculate attendance rate in JS
  return rows.map((row) => {
    const rate = row.total_sessions > 0 ? Math.round((row.present_count / row.total_sessions) * 100) : 0;
    return {
      ...row,
      attendance_rate: rate
    };
  });
}

// Get participant by ID with complete journey breakdown
export function getParticipantById(db, id) {
  const participant = queryOne(db, `
    SELECT 
      p.*,
      g.name as group_name,
      g.color as group_color,
      COALESCE((SELECT SUM(ind.total) FROM individual_scores ind WHERE ind.participant_id = p.id), 0) as total_points,
      COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.participant_id = p.id AND a.status = 'present'), 0) as present_count,
      COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.participant_id = p.id AND a.status = 'absent'), 0) as absent_count,
      COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.participant_id = p.id AND a.status = 'excused'), 0) as excused_count,
      COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.participant_id = p.id), 0) as total_sessions,
      COALESCE((SELECT ROUND(AVG(ind.total), 1) FROM individual_scores ind WHERE ind.participant_id = p.id), 0) as average_points
    FROM participants p
    LEFT JOIN groups g ON p.group_id = g.id
    WHERE p.id = ?
  `, [id]);

  if (!participant) return null;

  // Journey individual scores history
  const scoresHistory = queryAll(db, `
    SELECT 
      ind.*,
      j.journey_date,
      j.title as journey_title,
      a.status as attendance_status
    FROM journeys j
    LEFT JOIN individual_scores ind ON ind.journey_id = j.id AND ind.participant_id = ?
    LEFT JOIN attendance a ON a.journey_id = j.id AND a.participant_id = ?
    ORDER BY j.journey_date DESC
  `, [id, id]);

  const totalSessions = participant.total_sessions || 0;
  const attendanceRate = totalSessions > 0 ? Math.round((participant.present_count / totalSessions) * 100) : 0;

  return {
    ...participant,
    attendance_rate: attendanceRate,
    scoresHistory
  };
}

// Create new participant
export function createParticipant(db, { full_name, group_id = null, entry_date = null }) {
  if (!full_name || !full_name.trim()) {
    return { success: false, message: 'El nombre completo del participante es obligatorio.' };
  }

  const dateValue = entry_date && entry_date.trim() ? entry_date.trim() : new Date().toISOString().split('T')[0];
  const gId = group_id ? parseInt(group_id, 10) : null;
  const now = new Date().toISOString();

  execute(
    db,
    `INSERT INTO participants (full_name, group_id, entry_date, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, 1, ?, ?)`,
    [full_name.trim(), gId, dateValue, now, now]
  );

  const newPart = queryOne(db, "SELECT * FROM participants WHERE id = last_insert_rowid()");
  logAudit(db, 'CREAR_PARTICIPANTE', `Se agregó al participante "${newPart.full_name}" al club`);

  return {
    success: true,
    participant: newPart,
    message: `¡Participante "${newPart.full_name}" registrado correctamente!`
  };
}

// Update participant
export function updateParticipant(db, id, { full_name, group_id = null, entry_date = null, is_active = 1 }) {
  const current = queryOne(db, "SELECT * FROM participants WHERE id = ?", [id]);
  if (!current) {
    return { success: false, message: 'Participante no encontrado.' };
  }

  if (!full_name || !full_name.trim()) {
    return { success: false, message: 'El nombre completo no puede estar vacío.' };
  }

  const dateValue = entry_date && entry_date.trim() ? entry_date.trim() : current.entry_date;
  const gId = group_id ? parseInt(group_id, 10) : null;
  const now = new Date().toISOString();

  execute(
    db,
    `UPDATE participants 
     SET full_name = ?, group_id = ?, entry_date = ?, is_active = ?, updated_at = ? 
     WHERE id = ?`,
    [full_name.trim(), gId, dateValue, is_active ? 1 : 0, now, id]
  );

  logAudit(db, 'EDITAR_PARTICIPANTE', `Se actualizó la información de "${full_name.trim()}"`);

  return {
    success: true,
    message: `¡Participante "${full_name.trim()}" actualizado correctamente!`
  };
}

// Toggle participant active/inactive status
export function toggleParticipantStatus(db, id) {
  const current = queryOne(db, "SELECT id, full_name, is_active FROM participants WHERE id = ?", [id]);
  if (!current) {
    return { success: false, message: 'Participante no encontrado.' };
  }

  const newStatus = current.is_active === 1 ? 0 : 1;
  const now = new Date().toISOString();

  execute(
    db,
    "UPDATE participants SET is_active = ?, updated_at = ? WHERE id = ?",
    [newStatus, now, id]
  );

  const statusText = newStatus === 1 ? 'reactivado' : 'desactivado';
  logAudit(db, 'ESTADO_PARTICIPANTE', `El integrante "${current.full_name}" fue ${statusText} (su historial de asistencia y puntos permanece intacto)`);

  return {
    success: true,
    is_active: newStatus,
    message: `El participante "${current.full_name}" ha sido ${statusText}. Su historial se mantiene permanentemente.`
  };
}

// Delete participant permanently
export function deleteParticipant(db, id) {
  const current = queryOne(db, "SELECT id, full_name FROM participants WHERE id = ?", [id]);
  if (!current) {
    return { success: false, message: 'Participante no encontrado.' };
  }

  execute(db, "DELETE FROM attendance WHERE participant_id = ?", [id]);
  execute(db, "DELETE FROM individual_scores WHERE participant_id = ?", [id]);
  execute(db, "DELETE FROM participants WHERE id = ?", [id]);

  logAudit(db, 'ELIMINAR_PARTICIPANTE', `Se eliminó al participante "${current.full_name}"`);

  return {
    success: true,
    message: `¡Participante "${current.full_name}" eliminado correctamente!`
  };
}



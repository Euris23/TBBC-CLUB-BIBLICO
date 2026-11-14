import { queryAll, queryOne, execute, logAudit } from './db.js';

// Get all journeys with summary attendance metrics, optionally filtered by season
export function getAllJourneys(db, seasonId = null) {
  let whereSql = '';
  let params = [];

  if (seasonId && String(seasonId) !== 'all') {
    whereSql = 'WHERE j.season_id = ?';
    params.push(seasonId);
  }

  const journeys = queryAll(db, `
    SELECT 
      j.*,
      s.name as season_name,
      COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.journey_id = j.id AND a.status = 'present'), 0) as present_count,
      COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.journey_id = j.id AND a.status = 'absent'), 0) as absent_count,
      COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.journey_id = j.id AND a.status = 'excused'), 0) as excused_count,
      COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.journey_id = j.id), 0) as total_attendance
    FROM journeys j
    LEFT JOIN seasons s ON j.season_id = s.id
    ${whereSql}
    ORDER BY j.journey_date DESC
  `, params);

  return journeys.map((j) => {
    const rate = j.total_attendance > 0 ? Math.round((j.present_count / j.total_attendance) * 100) : 0;
    return {
      ...j,
      attendance_rate: rate
    };
  });
}

// Create new journey
export function createJourney(db, { season_id = null, journey_date, title = '', notes = '' }) {
  if (!journey_date || !journey_date.trim()) {
    return { success: false, message: 'La fecha de la jornada es obligatoria.' };
  }

  // Check unique journey_date
  const existing = queryOne(db, "SELECT id FROM journeys WHERE journey_date = ?", [journey_date.trim()]);
  if (existing) {
    return { success: false, message: `Ya existe una jornada registrada con la fecha ${journey_date.trim()}.` };
  }

  // Find active season if not provided
  let finalSeasonId = season_id ? parseInt(season_id, 10) : null;
  if (!finalSeasonId) {
    const activeSeason = queryOne(db, "SELECT id FROM seasons WHERE is_active = 1");
    finalSeasonId = activeSeason ? activeSeason.id : null;
  }

  const now = new Date().toISOString();
  const titleText = title && title.trim() ? title.trim() : `Jornada Sabatina - ${journey_date.trim()}`;

  execute(
    db,
    `INSERT INTO journeys (season_id, journey_date, title, notes, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`,
    [finalSeasonId, journey_date.trim(), titleText, notes.trim(), now]
  );

  const newJourney = queryOne(db, "SELECT * FROM journeys WHERE id = last_insert_rowid()");

  // Pre-populate attendance for all active participants as 'present' by default
  const activeParticipants = queryAll(db, "SELECT id FROM participants WHERE is_active = 1");
  for (const p of activeParticipants) {
    execute(
      db,
      `INSERT INTO attendance (journey_id, participant_id, status, updated_at)
       VALUES (?, ?, 'present', ?)`,
      [newJourney.id, p.id, now]
    );

    // Also auto-initialize individual score record with 10 pts for attendance (linked to roll call)
    execute(
      db,
      `INSERT OR IGNORE INTO individual_scores (
        journey_id, participant_id, punctuality, bring_bible, attendance, devotional, verse, church, total, updated_at
      ) VALUES (?, ?, 0, 0, 10, 0, 0, 0, 10, ?)`,
      [newJourney.id, p.id, now]
    );
  }

  logAudit(db, 'CREAR_JORNADA', `Se creó la jornada sabatina del ${newJourney.journey_date} con ${activeParticipants.length} integrantes`);

  return {
    success: true,
    journey: newJourney,
    message: `¡Jornada del ${newJourney.journey_date} creada exitosamente!`
  };
}

// Get full attendance sheet for a journey
export function getJourneyAttendance(db, journeyId) {
  const journey = queryOne(db, `
    SELECT j.*, s.name as season_name 
    FROM journeys j 
    LEFT JOIN seasons s ON j.season_id = s.id 
    WHERE j.id = ?
  `, [journeyId]);

  if (!journey) return null;

  // Active participants with their attendance record for this journey
  // Also include inactive participants who have an attendance record for this specific journey (preserving history)
  const rows = queryAll(db, `
    SELECT 
      p.id as participant_id,
      p.full_name,
      p.group_id,
      g.name as group_name,
      g.color as group_color,
      p.is_active as participant_is_active,
      COALESCE(a.status, 'absent') as attendance_status,
      a.id as attendance_id
    FROM participants p
    LEFT JOIN groups g ON p.group_id = g.id
    LEFT JOIN attendance a ON a.participant_id = p.id AND a.journey_id = ?
    WHERE p.is_active = 1 OR a.id IS NOT NULL
    ORDER BY COALESCE(g.name, 'zzz') ASC, p.full_name ASC
  `, [journeyId]);

  // Overall totals
  let present = 0;
  let absent = 0;
  let excused = 0;

  // Per group statistics map
  const groupStatsMap = {};

  rows.forEach((r) => {
    if (r.attendance_status === 'present') present++;
    else if (r.attendance_status === 'absent') absent++;
    else if (r.attendance_status === 'excused') excused++;

    const gKey = r.group_id || 'unassigned';
    if (!groupStatsMap[gKey]) {
      groupStatsMap[gKey] = {
        groupId: r.group_id,
        groupName: r.group_name || 'Sin Grupo',
        groupColor: r.group_color || '#64748b',
        present: 0,
        absent: 0,
        excused: 0,
        total: 0
      };
    }

    groupStatsMap[gKey].total++;
    if (r.attendance_status === 'present') groupStatsMap[gKey].present++;
    else if (r.attendance_status === 'absent') groupStatsMap[gKey].absent++;
    else if (r.attendance_status === 'excused') groupStatsMap[gKey].excused++;
  });

  const total = present + absent + excused;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  // Compute percentages per group
  const groupStats = Object.values(groupStatsMap).map((gs) => {
    const groupRate = gs.total > 0 ? Math.round((gs.present / gs.total) * 100) : 0;
    return {
      ...gs,
      rate: groupRate
    };
  }).sort((a, b) => b.rate - a.rate);

  return {
    journey,
    participants: rows,
    summary: {
      present,
      absent,
      excused,
      total,
      rate,
      groupStats
    }
  };
}

// Save attendance records in bulk
export function saveJourneyAttendance(db, journeyId, records) {
  if (!records || !Array.isArray(records)) {
    return { success: false, message: 'Formato de registros inválido.' };
  }

  const journey = queryOne(db, "SELECT * FROM journeys WHERE id = ?", [journeyId]);
  if (!journey) {
    return { success: false, message: 'Jornada no encontrada.' };
  }

  const now = new Date().toISOString();

  for (const item of records) {
    const { participant_id, status } = item;
    if (!participant_id || !['present', 'absent', 'excused'].includes(status)) continue;

    // Insert or update attendance record
    const existing = queryOne(
      db,
      "SELECT id FROM attendance WHERE journey_id = ? AND participant_id = ?",
      [journeyId, participant_id]
    );

    if (existing) {
      execute(
        db,
        "UPDATE attendance SET status = ?, updated_at = ? WHERE id = ?",
        [status, now, existing.id]
      );
    } else {
      execute(
        db,
        "INSERT INTO attendance (journey_id, participant_id, status, updated_at) VALUES (?, ?, ?, ?)",
        [journeyId, participant_id, status, now]
      );
    }

    // Link with individual scores (Section 7 requirement:
    // "La asistencia al Club Bíblico debe vincularse con el pase de lista para evitar duplicar información")
    const attPoints = status === 'present' ? 10 : 0;
    const existingScore = queryOne(
      db,
      "SELECT * FROM individual_scores WHERE journey_id = ? AND participant_id = ?",
      [journeyId, participant_id]
    );

    if (existingScore) {
      const punctuality = existingScore.punctuality || 0;
      const bring_bible = existingScore.bring_bible || 0;
      const devotional = existingScore.devotional || 0;
      const verse = existingScore.verse || 0;
      const church = existingScore.church || 0;
      const newTotal = Math.min(100, punctuality + bring_bible + attPoints + devotional + verse + church);

      execute(
        db,
        `UPDATE individual_scores 
         SET attendance = ?, total = ?, updated_at = ? 
         WHERE id = ?`,
        [attPoints, newTotal, now, existingScore.id]
      );
    } else {
      execute(
        db,
        `INSERT INTO individual_scores (
          journey_id, participant_id, punctuality, bring_bible, attendance, devotional, verse, church, total, updated_at
        ) VALUES (?, ?, 0, 0, ?, 0, 0, 0, ?, ?)`,
        [journeyId, participant_id, attPoints, attPoints, now]
      );
    }
  }

  logAudit(
    db,
    'GUARDAR_ASISTENCIA',
    `Se guardó la asistencia de la jornada del ${journey.journey_date} (${records.length} registros)`
  );

  return {
    success: true,
    message: `¡Asistencia de la jornada del ${journey.journey_date} guardada correctamente!`
  };
}

// Update journey date / title / notes / status
export function updateJourney(db, id, { journey_date, title, notes, status }) {
  const journey = queryOne(db, "SELECT * FROM journeys WHERE id = ?", [id]);
  if (!journey) {
    return { success: false, message: 'Jornada no encontrada.' };
  }

  const targetDate = journey_date && journey_date.trim() ? journey_date.trim() : journey.journey_date;
  if (targetDate !== journey.journey_date) {
    const existing = queryOne(db, "SELECT id FROM journeys WHERE journey_date = ? AND id != ?", [targetDate, id]);
    if (existing) {
      return { success: false, message: `Ya existe otra jornada registrada con la fecha ${targetDate}.` };
    }
  }

  execute(
    db,
    `UPDATE journeys 
     SET journey_date = ?, title = ?, notes = ?, status = ? 
     WHERE id = ?`,
    [targetDate, title !== undefined ? title : journey.title, notes !== undefined ? notes : journey.notes, status || journey.status, id]
  );

  logAudit(db, 'EDITAR_JORNADA', `Se actualizó la información de la jornada del ${targetDate}`);

  return {
    success: true,
    message: 'Jornada actualizada con éxito.'
  };
}

// Delete journey permanently (with cascaded scores and attendance)
export function deleteJourney(db, id) {
  const journey = queryOne(db, "SELECT * FROM journeys WHERE id = ?", [id]);
  if (!journey) {
    return { success: false, message: 'Jornada no encontrada.' };
  }

  execute(db, "DELETE FROM attendance WHERE journey_id = ?", [id]);
  execute(db, "DELETE FROM individual_scores WHERE journey_id = ?", [id]);
  execute(db, "DELETE FROM group_scores WHERE journey_id = ?", [id]);
  execute(db, "DELETE FROM generated_images WHERE journey_id = ?", [id]);
  execute(db, "DELETE FROM journeys WHERE id = ?", [id]);

  logAudit(db, 'ELIMINAR_JORNADA', `Se eliminó la jornada del ${journey.journey_date} y todos sus registros asociados`);

  return {
    success: true,
    message: `¡Jornada del ${journey.journey_date} eliminada correctamente!`
  };
}



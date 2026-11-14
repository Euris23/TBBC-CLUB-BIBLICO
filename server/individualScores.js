import { queryAll, queryOne, execute, logAudit } from './db.js';

// Get individual scores for a journey
export function getJourneyIndividualScores(db, journeyId) {
  const journey = queryOne(db, `
    SELECT j.*, s.name as season_name 
    FROM journeys j 
    LEFT JOIN seasons s ON j.season_id = s.id 
    WHERE j.id = ?
  `, [journeyId]);

  if (!journey) return null;

  // Make sure table has special_recognition column
  try {
    db.run("ALTER TABLE individual_scores ADD COLUMN special_recognition INTEGER DEFAULT 0;");
  } catch (e) {
    // Column already exists, ignore
  }

  // Participants (active or with records for this journey)
  const rows = queryAll(db, `
    SELECT 
      p.id as participant_id,
      p.full_name,
      p.group_id,
      g.name as group_name,
      g.color as group_color,
      p.is_active as participant_is_active,
      COALESCE(ind.id, 0) as score_id,
      COALESCE(ind.punctuality, 0) as punctuality,
      COALESCE(ind.bring_bible, 0) as bring_bible,
      COALESCE(ind.attendance, (CASE WHEN a.status = 'present' THEN 10 ELSE 0 END)) as attendance,
      COALESCE(ind.devotional, 0) as devotional,
      COALESCE(ind.verse, 0) as verse,
      COALESCE(ind.church, 0) as church,
      COALESCE(ind.total, (CASE WHEN a.status = 'present' THEN 10 ELSE 0 END)) as total,
      COALESCE(ind.special_recognition, 0) as special_recognition,
      COALESCE(a.status, 'absent') as attendance_status
    FROM participants p
    LEFT JOIN groups g ON p.group_id = g.id
    LEFT JOIN individual_scores ind ON ind.participant_id = p.id AND ind.journey_id = ?
    LEFT JOIN attendance a ON a.participant_id = p.id AND a.journey_id = ?
    WHERE p.is_active = 1 OR ind.id IS NOT NULL OR a.id IS NOT NULL
    ORDER BY COALESCE(g.name, 'zzz') ASC, p.full_name ASC
  `, [journeyId, journeyId]);

  // Compute journey summary statistics
  let totalDistributed = 0;
  let countWith100 = 0;
  let countPunctual = 0;
  let countBible = 0;
  let countDevotional = 0;
  let countVerse = 0;
  let countChurch = 0;

  rows.forEach((r) => {
    totalDistributed += r.total;
    if (r.total >= 100) countWith100++;
    if (r.punctuality >= 15) countPunctual++;
    if (r.bring_bible >= 20) countBible++;
    if (r.devotional >= 25) countDevotional++;
    if (r.verse >= 10) countVerse++;
    if (r.church >= 20) countChurch++;
  });

  const participantCount = rows.length;
  const averagePoints = participantCount > 0 ? Math.round((totalDistributed / participantCount) * 10) / 10 : 0;

  return {
    journey,
    participants: rows,
    summary: {
      participantCount,
      totalDistributed,
      averagePoints,
      countWith100,
      compliance: {
        punctualRate: participantCount > 0 ? Math.round((countPunctual / participantCount) * 100) : 0,
        bibleRate: participantCount > 0 ? Math.round((countBible / participantCount) * 100) : 0,
        devotionalRate: participantCount > 0 ? Math.round((countDevotional / participantCount) * 100) : 0,
        verseRate: participantCount > 0 ? Math.round((countVerse / participantCount) * 100) : 0,
        churchRate: participantCount > 0 ? Math.round((countChurch / participantCount) * 100) : 0,
      }
    }
  };
}

// Save individual scores in bulk
export function saveJourneyIndividualScores(db, journeyId, scores) {
  if (!scores || !Array.isArray(scores)) {
    return { success: false, message: 'Formato de puntuaciones inválido.' };
  }

  const journey = queryOne(db, "SELECT * FROM journeys WHERE id = ?", [journeyId]);
  if (!journey) {
    return { success: false, message: 'Jornada no encontrada.' };
  }

  const now = new Date().toISOString();

  // Criteria validation constants
  // Puntualidad: 15
  // Traer Biblia: 20
  // Asistencia al Club Bíblico: 10
  // Completar devocional: 25
  // Aprender y decir versículo: 10
  // Asistir a la iglesia: 20
  // TOTAL: 100

  // Strict validation first
  for (const item of scores) {
    const {
      participant_id,
      punctuality = 0,
      bring_bible = 0,
      attendance = 0,
      devotional = 0,
      verse = 0,
      church = 0
    } = item;

    if (!participant_id) continue;

    const p = parseInt(punctuality, 10) || 0;
    const b = parseInt(bring_bible, 10) || 0;
    const a = parseInt(attendance, 10) || 0;
    const d = parseInt(devotional, 10) || 0;
    const v = parseInt(verse, 10) || 0;
    const c = parseInt(church, 10) || 0;

    if (p < 0 || p > 15) return { success: false, message: `Puntualidad debe estar entre 0 y 15 puntos (recibido: ${p})` };
    if (b < 0 || b > 20) return { success: false, message: `Traer Biblia debe estar entre 0 y 20 puntos (recibido: ${b})` };
    if (a < 0 || a > 10) return { success: false, message: `Asistencia debe estar entre 0 y 10 puntos (recibido: ${a})` };
    if (d < 0 || d > 25) return { success: false, message: `Devocional debe estar entre 0 y 25 puntos (recibido: ${d})` };
    if (v < 0 || v > 10) return { success: false, message: `Versículo debe estar entre 0 y 10 puntos (recibido: ${v})` };
    if (c < 0 || c > 20) return { success: false, message: `Iglesia debe estar entre 0 y 20 puntos (recibido: ${c})` };
    if ((p + b + a + d + v + c) > 100) return { success: false, message: 'La suma total no puede superar los 100 puntos por participante.' };
  }

  for (const item of scores) {
    const {
      participant_id,
      punctuality = 0,
      bring_bible = 0,
      attendance = 0,
      devotional = 0,
      verse = 0,
      church = 0,
      special_recognition = 0
    } = item;

    if (!participant_id) continue;

    // Validate criteria limits and non-negative
    const safePunctuality = Math.min(15, Math.max(0, parseInt(punctuality, 10) || 0));
    const safeBible = Math.min(20, Math.max(0, parseInt(bring_bible, 10) || 0));
    const safeAttendance = Math.min(10, Math.max(0, parseInt(attendance, 10) || 0));
    const safeDevotional = Math.min(25, Math.max(0, parseInt(devotional, 10) || 0));
    const safeVerse = Math.min(10, Math.max(0, parseInt(verse, 10) || 0));
    const safeChurch = Math.min(20, Math.max(0, parseInt(church, 10) || 0));
    const safeRecognition = special_recognition ? 1 : 0;

    // Total cannot exceed 100
    const rawTotal = safePunctuality + safeBible + safeAttendance + safeDevotional + safeVerse + safeChurch;
    const total = Math.min(100, Math.max(0, rawTotal));

    // Insert or update individual_scores
    const existing = queryOne(
      db,
      "SELECT id FROM individual_scores WHERE journey_id = ? AND participant_id = ?",
      [journeyId, participant_id]
    );

    if (existing) {
      execute(
        db,
        `UPDATE individual_scores 
         SET punctuality = ?, bring_bible = ?, attendance = ?, devotional = ?, verse = ?, church = ?, total = ?, special_recognition = ?, updated_at = ? 
         WHERE id = ?`,
        [safePunctuality, safeBible, safeAttendance, safeDevotional, safeVerse, safeChurch, total, safeRecognition, now, existing.id]
      );
    } else {
      execute(
        db,
        `INSERT INTO individual_scores (
          journey_id, participant_id, punctuality, bring_bible, attendance, devotional, verse, church, total, special_recognition, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [journeyId, participant_id, safePunctuality, safeBible, safeAttendance, safeDevotional, safeVerse, safeChurch, total, safeRecognition, now]
      );
    }

    // Sync with attendance table (Section 7 rule:
    // "La asistencia al Club Bíblico debe vincularse con el pase de lista para evitar duplicar información")
    const attStatus = safeAttendance > 0 ? 'present' : 'absent';
    const existingAtt = queryOne(
      db,
      "SELECT id, status FROM attendance WHERE journey_id = ? AND participant_id = ?",
      [journeyId, participant_id]
    );

    if (existingAtt) {
      // If was excused, keep excused if attendance is 0, or update if present
      const finalStatus = (existingAtt.status === 'excused' && safeAttendance === 0) ? 'excused' : attStatus;
      execute(
        db,
        "UPDATE attendance SET status = ?, updated_at = ? WHERE id = ?",
        [finalStatus, now, existingAtt.id]
      );
    } else {
      execute(
        db,
        "INSERT INTO attendance (journey_id, participant_id, status, updated_at) VALUES (?, ?, ?, ?)",
        [journeyId, participant_id, attStatus, now]
      );
    }
  }

  logAudit(
    db,
    'GUARDAR_PUNTOS_INDIVIDUALES',
    `Se registraron las puntuaciones individuales de la jornada del ${journey.journey_date} (${scores.length} participantes)`
  );

  return {
    success: true,
    message: `¡Puntuaciones de la jornada del ${journey.journey_date} guardadas correctamente!`
  };
}

// Reset / delete individual score of a participant in a journey
export function resetParticipantScore(db, journeyId, participantId) {
  execute(
    db,
    `UPDATE individual_scores 
     SET punctuality = 0, bring_bible = 0, attendance = 0, devotional = 0, verse = 0, church = 0, total = 0, special_recognition = 0, updated_at = ? 
     WHERE journey_id = ? AND participant_id = ?`,
    [new Date().toISOString(), journeyId, participantId]
  );

  logAudit(db, 'REINICIAR_PUNTOS', `Se reiniciaron los puntos individuales del participante #${participantId} en la jornada #${journeyId}`);

  return {
    success: true,
    message: 'Puntuación reiniciada a 0.'
  };
}

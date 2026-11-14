import { queryAll, queryOne, execute, logAudit } from './db.js';
import { getActiveSeason } from './seasons.js';

/**
 * Obtener rankings de grupos filtrado por temporada y opcionalmente por jornada
 */
export function getGroupRankings(db, seasonId = null, journeyId = null) {
  let season = null;
  if (seasonId && seasonId !== 'all') {
    season = queryOne(db, "SELECT * FROM seasons WHERE id = ?", [seasonId]);
  }
  if (!season && seasonId !== 'all') {
    season = getActiveSeason(db);
    seasonId = season ? season.id : null;
  }

  // Si se solicita una jornada específica
  if (journeyId && journeyId !== 'all') {
    const journey = queryOne(db, "SELECT * FROM journeys WHERE id = ?", [journeyId]);
    if (!journey) return { groups: [], journey: null, season };

    const rows = queryAll(db, `
      SELECT 
        g.id as group_id,
        g.name as group_name,
        g.color as group_color,
        g.is_active,
        COALESCE(gs.game1, 0) as game1,
        COALESCE(gs.game2, 0) as game2,
        COALESCE(gs.questions, 0) as questions,
        COALESCE(gs.bring_bible, 0) as bring_bible,
        COALESCE(gs.punctuality, 0) as punctuality,
        COALESCE(gs.group_attendance, 0) as group_attendance,
        COALESCE(gs.bible_presentation, 0) as bible_presentation,
        COALESCE(gs.manual_points, 0) as manual_points,
        COALESCE(gs.manual_points_reason, '') as manual_points_reason,
        COALESCE(gs.total, 0) as total_points,
        (SELECT COUNT(*) FROM participants WHERE group_id = g.id AND is_active = 1) as member_count
      FROM groups g
      LEFT JOIN group_scores gs ON gs.group_id = g.id AND gs.journey_id = ?
      WHERE g.is_active = 1 OR gs.id IS NOT NULL
      ORDER BY total_points DESC, g.name ASC
    `, [journeyId]);

    // Asignar puestos
    let currentRank = 1;
    const ranked = rows.map((r, idx) => {
      if (idx > 0 && r.total_points < rows[idx - 1].total_points) {
        currentRank = idx + 1;
      }
      return {
        ...r,
        rank: currentRank,
        diffWithLeader: idx === 0 ? 0 : rows[0].total_points - r.total_points
      };
    });

    return {
      type: 'journey',
      journey,
      season,
      groups: ranked
    };
  }

  // Ranking acumulado de toda la temporada (o all-time)
  let seasonFilter = '';
  const params = [];
  if (seasonId && seasonId !== 'all') {
    seasonFilter = 'WHERE j.season_id = ?';
    params.push(seasonId);
  }

  // Obtener puntos acumulados por grupo en las jornadas de la temporada
  const rows = queryAll(db, `
    SELECT 
      g.id as group_id,
      g.name as group_name,
      g.color as group_color,
      g.is_active,
      (SELECT COUNT(*) FROM participants WHERE group_id = g.id AND is_active = 1) as member_count,
      COUNT(DISTINCT gs.journey_id) as journeys_played,
      COALESCE(SUM(gs.total), 0) as total_points,
      COALESCE(SUM(gs.game1), 0) as total_game1,
      COALESCE(SUM(gs.game2), 0) as total_game2,
      COALESCE(SUM(gs.questions), 0) as total_questions,
      COALESCE(SUM(gs.bring_bible), 0) as total_bring_bible,
      COALESCE(SUM(gs.punctuality), 0) as total_punctuality,
      COALESCE(SUM(gs.group_attendance), 0) as total_group_attendance,
      COALESCE(SUM(gs.bible_presentation), 0) as total_bible_presentation
    FROM groups g
    LEFT JOIN group_scores gs ON gs.group_id = g.id
    LEFT JOIN journeys j ON gs.journey_id = j.id ${seasonId && seasonId !== 'all' ? 'AND j.season_id = ?' : ''}
    WHERE g.is_active = 1 OR gs.id IS NOT NULL
    GROUP BY g.id
    ORDER BY total_points DESC, g.name ASC
  `, seasonId && seasonId !== 'all' ? [seasonId] : []);

  // Calcular victorias de cada grupo (cuántas veces fue 1° lugar en una jornada de esta temporada)
  const allJourneysInSeason = queryAll(db, `
    SELECT id FROM journeys j ${seasonFilter} ORDER BY journey_date ASC
  `, params);

  const winsMap = {};
  rows.forEach(r => { winsMap[r.group_id] = 0; });

  allJourneysInSeason.forEach(j => {
    const scoresInJ = queryAll(db, `
      SELECT group_id, total FROM group_scores WHERE journey_id = ? ORDER BY total DESC
    `, [j.id]);

    if (scoresInJ.length > 0 && scoresInJ[0].total > 0) {
      const topScore = scoresInJ[0].total;
      scoresInJ.filter(s => s.total === topScore).forEach(winner => {
        if (winsMap[winner.group_id] !== undefined) {
          winsMap[winner.group_id]++;
        }
      });
    }
  });

  // Asignar puestos, promedio y victorias
  let currentRank = 1;
  const ranked = rows.map((r, idx) => {
    if (idx > 0 && r.total_points < rows[idx - 1].total_points) {
      currentRank = idx + 1;
    }
    const played = r.journeys_played || 0;
    const avg = played > 0 ? Math.round(r.total_points / played) : 0;
    const victories = winsMap[r.group_id] || 0;

    return {
      ...r,
      rank: currentRank,
      victories,
      average_points: avg,
      diffWithLeader: idx === 0 ? 0 : rows[0].total_points - r.total_points
    };
  });

  return {
    type: 'season',
    season,
    totalJourneys: allJourneysInSeason.length,
    groups: ranked
  };
}

/**
 * Obtener rankings de participantes individuales filtrado por temporada/jornada/grupo
 */
export function getIndividualRankings(db, seasonId = null, journeyId = null, groupId = null) {
  let season = null;
  if (seasonId && seasonId !== 'all') {
    season = queryOne(db, "SELECT * FROM seasons WHERE id = ?", [seasonId]);
  }
  if (!season && seasonId !== 'all') {
    season = getActiveSeason(db);
    seasonId = season ? season.id : null;
  }

  // Si se solicita una jornada específica
  if (journeyId && journeyId !== 'all') {
    const journey = queryOne(db, "SELECT * FROM journeys WHERE id = ?", [journeyId]);
    if (!journey) return { participants: [], journey: null, season };

    let groupCondition = '';
    const qParams = [journeyId];
    if (groupId && groupId !== 'all') {
      groupCondition = 'AND p.group_id = ?';
      qParams.push(groupId);
    }

    const rows = queryAll(db, `
      SELECT 
        p.id as participant_id,
        p.full_name,
        p.gender,
        p.group_id,
        g.name as group_name,
        g.color as group_color,
        COALESCE(ind.total, 0) as total_points,
        COALESCE(ind.punctuality, 0) as punctuality,
        COALESCE(ind.bring_bible, 0) as bring_bible,
        COALESCE(ind.attendance, 0) as attendance_pts,
        COALESCE(ind.devotional, 0) as devotional,
        COALESCE(ind.verse, 0) as verse,
        COALESCE(ind.church, 0) as church,
        COALESCE(ind.special_recognition, 0) as special_recognition,
        COALESCE(a.status, 'absent') as attendance_status
      FROM participants p
      LEFT JOIN groups g ON p.group_id = g.id
      LEFT JOIN individual_scores ind ON ind.participant_id = p.id AND ind.journey_id = ?
      LEFT JOIN attendance a ON a.participant_id = p.id AND a.journey_id = ?
      WHERE (p.is_active = 1 OR ind.id IS NOT NULL) ${groupCondition}
      ORDER BY total_points DESC, p.full_name ASC
    `, [journeyId, journeyId, ...(groupId && groupId !== 'all' ? [groupId] : [])]);

    let currentRank = 1;
    const ranked = rows.map((r, idx) => {
      if (idx > 0 && r.total_points < rows[idx - 1].total_points) {
        currentRank = idx + 1;
      }
      return {
        ...r,
        rank: currentRank,
        diffWithLeader: idx === 0 ? 0 : rows[0].total_points - r.total_points
      };
    });

    return {
      type: 'journey',
      journey,
      season,
      participants: ranked
    };
  }

  // Ranking acumulado de la temporada
  let seasonFilter = '';
  const filterParams = [];
  if (seasonId && seasonId !== 'all') {
    seasonFilter = 'AND j.season_id = ?';
    filterParams.push(seasonId);
  }

  let groupFilter = '';
  if (groupId && groupId !== 'all') {
    groupFilter = 'AND p.group_id = ?';
    filterParams.push(groupId);
  }

  const rows = queryAll(db, `
    SELECT 
      p.id as participant_id,
      p.full_name,
      p.gender,
      p.group_id,
      g.name as group_name,
      g.color as group_color,
      COUNT(DISTINCT ind.journey_id) as journeys_attended,
      COALESCE(SUM(ind.total), 0) as total_points,
      COALESCE(SUM(ind.punctuality), 0) as total_punctuality,
      COALESCE(SUM(ind.bring_bible), 0) as total_bring_bible,
      COALESCE(SUM(ind.attendance), 0) as total_attendance,
      COALESCE(SUM(ind.devotional), 0) as total_devotional,
      COALESCE(SUM(ind.verse), 0) as total_verse,
      COALESCE(SUM(ind.church), 0) as total_church,
      COALESCE(SUM(ind.special_recognition), 0) as total_recognitions
    FROM participants p
    LEFT JOIN groups g ON p.group_id = g.id
    LEFT JOIN individual_scores ind ON ind.participant_id = p.id
    LEFT JOIN journeys j ON ind.journey_id = j.id ${seasonId && seasonId !== 'all' ? 'AND j.season_id = ?' : ''}
    WHERE (p.is_active = 1 OR ind.id IS NOT NULL) ${groupId && groupId !== 'all' ? 'AND p.group_id = ?' : ''}
    GROUP BY p.id
    ORDER BY total_points DESC, p.full_name ASC
  `, [
    ...(seasonId && seasonId !== 'all' ? [seasonId] : []),
    ...(groupId && groupId !== 'all' ? [groupId] : [])
  ]);

  let currentRank = 1;
  const ranked = rows.map((r, idx) => {
    if (idx > 0 && r.total_points < rows[idx - 1].total_points) {
      currentRank = idx + 1;
    }
    const attended = r.journeys_attended || 0;
    const avg = attended > 0 ? Math.round((r.total_points / attended) * 10) / 10 : 0;

    return {
      ...r,
      rank: currentRank,
      average_points: avg,
      diffWithLeader: idx === 0 ? 0 : rows[0].total_points - r.total_points
    };
  });

  return {
    type: 'season',
    season,
    participants: ranked
  };
}

/**
 * Guardar imagen generada para historial
 */
export function saveGeneratedImage(db, journeyId, fileName, imageData) {
  const now = new Date().toISOString();
  execute(
    db,
    `INSERT INTO generated_images (journey_id, file_name, image_data, is_outdated, created_at)
     VALUES (?, ?, ?, 0, ?)`,
    [journeyId, fileName, imageData, now]
  );
  logAudit(db, 'IMAGEN_GENERADA', `Imagen generada para la jornada #${journeyId}: ${fileName}`);
  return { success: true, message: 'Imagen guardada en el historial' };
}

/**
 * Obtener última imagen generada para una jornada
 */
export function getLatestGeneratedImage(db, journeyId) {
  return queryOne(
    db,
    "SELECT * FROM generated_images WHERE journey_id = ? ORDER BY id DESC LIMIT 1",
    [journeyId]
  );
}


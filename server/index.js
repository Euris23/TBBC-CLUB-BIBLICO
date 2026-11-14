import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, queryAll, queryOne, execute, logAudit } from './db.js';
import { loginWithPin, validateSession, logoutSession, changePin } from './auth.js';
import { getAllGroups, getGroupById, createGroup, updateGroup, toggleGroupStatus, deleteGroup } from './groups.js';
import { getAllParticipants, getParticipantById, createParticipant, updateParticipant, toggleParticipantStatus, deleteParticipant } from './participants.js';
import { getAllJourneys, createJourney, getJourneyAttendance, saveJourneyAttendance, updateJourney, deleteJourney } from './attendance.js';
import { getAllSeasons, getActiveSeason, createSeason, updateSeason, activateSeason, deleteSeason } from './seasons.js';
import { getJourneyIndividualScores, saveJourneyIndividualScores, resetParticipantScore } from './individualScores.js';
import { getJourneyGroupScores, saveJourneyGroupScores, resetGroupScore, assignManualGroupPoints } from './groupScores.js';
import { getGroupRankings, getIndividualRankings, saveGeneratedImage, getLatestGeneratedImage } from './rankings.js';
import { getAttendanceReportCsv, getIndividualScoresReportCsv, getGroupScoresReportCsv } from './reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let db = null;

// Auth middleware for protected routes
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-session-token'];
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;

  if (!token || !validateSession(db, token)) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Por favor ingresa el PIN general.'
    });
  }
  next();
}

// =================== AUTH ROUTES ===================

app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  const result = loginWithPin(db, pin);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-session-token'];
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  const isValid = validateSession(db, token);
  res.json({ valid: isValid });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-session-token'];
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  logoutSession(db, token);
  res.json({ success: true, message: 'Sesión cerrada' });
});

app.post('/api/auth/change-pin', requireAuth, (req, res) => {
  const { currentPin, newPin } = req.body;
  const result = changePin(db, currentPin, newPin);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// =================== SEASONS ROUTES ===================

app.get('/api/seasons', requireAuth, (req, res) => {
  const seasons = getAllSeasons(db);
  res.json(seasons);
});

app.get('/api/seasons/active', requireAuth, (req, res) => {
  const season = getActiveSeason(db);
  res.json(season || null);
});

app.post('/api/seasons', requireAuth, (req, res) => {
  const result = createSeason(db, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.put('/api/seasons/:id', requireAuth, (req, res) => {
  const result = updateSeason(db, req.params.id, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.patch('/api/seasons/:id/activate', requireAuth, (req, res) => {
  const result = activateSeason(db, req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/seasons/:id', requireAuth, (req, res) => {
  const result = deleteSeason(db, req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// =================== GROUPS ROUTES ===================

app.get('/api/groups', requireAuth, (req, res) => {
  const includeInactive = req.query.includeInactive !== 'false';
  const seasonId = req.query.seasonId || null;
  const groups = getAllGroups(db, includeInactive, seasonId);
  res.json(groups);
});

app.get('/api/groups/:id', requireAuth, (req, res) => {
  const group = getGroupById(db, req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
  }
  res.json(group);
});

app.post('/api/groups', requireAuth, (req, res) => {
  const result = createGroup(db, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.put('/api/groups/:id', requireAuth, (req, res) => {
  const result = updateGroup(db, req.params.id, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.patch('/api/groups/:id/toggle-status', requireAuth, (req, res) => {
  const result = toggleGroupStatus(db, req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/groups/:id', requireAuth, (req, res) => {
  const result = deleteGroup(db, req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// =================== PARTICIPANTS ROUTES ===================

app.get('/api/participants', requireAuth, (req, res) => {
  const participants = getAllParticipants(db, req.query);
  res.json(participants);
});

app.get('/api/participants/:id', requireAuth, (req, res) => {
  const participant = getParticipantById(db, req.params.id);
  if (!participant) {
    return res.status(404).json({ success: false, message: 'Participante no encontrado.' });
  }
  res.json(participant);
});

app.post('/api/participants', requireAuth, (req, res) => {
  const result = createParticipant(db, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.put('/api/participants/:id', requireAuth, (req, res) => {
  const result = updateParticipant(db, req.params.id, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.patch('/api/participants/:id/toggle-status', requireAuth, (req, res) => {
  const result = toggleParticipantStatus(db, req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/participants/:id', requireAuth, (req, res) => {
  const result = deleteParticipant(db, req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// =================== JOURNEYS & ATTENDANCE ROUTES ===================

app.get('/api/journeys', requireAuth, (req, res) => {
  const seasonId = req.query.seasonId || null;
  const journeys = getAllJourneys(db, seasonId);
  res.json(journeys);
});

app.post('/api/journeys', requireAuth, (req, res) => {
  const result = createJourney(db, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.put('/api/journeys/:id', requireAuth, (req, res) => {
  const result = updateJourney(db, req.params.id, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/journeys/:id', requireAuth, (req, res) => {
  const result = deleteJourney(db, req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/attendance/:journeyId', requireAuth, (req, res) => {
  const data = getJourneyAttendance(db, req.params.journeyId);
  if (!data) {
    return res.status(404).json({ success: false, message: 'Jornada no encontrada.' });
  }
  res.json(data);
});

app.post('/api/attendance/:journeyId', requireAuth, (req, res) => {
  const result = saveJourneyAttendance(db, req.params.journeyId, req.body.records);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// =================== INDIVIDUAL SCORES ROUTES ===================

app.get('/api/individual-scores/:journeyId', requireAuth, (req, res) => {
  const data = getJourneyIndividualScores(db, req.params.journeyId);
  if (!data) {
    return res.status(404).json({ success: false, message: 'Jornada no encontrada.' });
  }
  res.json(data);
});

app.post('/api/individual-scores/:journeyId', requireAuth, (req, res) => {
  const result = saveJourneyIndividualScores(db, req.params.journeyId, req.body.scores);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/individual-scores/:journeyId/:participantId', requireAuth, (req, res) => {
  const result = resetParticipantScore(db, req.params.journeyId, req.params.participantId);
  res.json(result);
});

// =================== GROUP SCORES ROUTES ===================

app.post('/api/group-scores/manual', requireAuth, (req, res) => {
  const result = assignManualGroupPoints(db, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/group-scores/:journeyId', requireAuth, (req, res) => {
  const data = getJourneyGroupScores(db, req.params.journeyId);
  if (!data) {
    return res.status(404).json({ success: false, message: 'Jornada no encontrada.' });
  }
  res.json(data);
});

app.post('/api/group-scores/:journeyId', requireAuth, (req, res) => {
  const result = saveJourneyGroupScores(db, req.params.journeyId, req.body.scores);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/group-scores/:journeyId/:groupId', requireAuth, (req, res) => {
  const result = resetGroupScore(db, req.params.journeyId, req.params.groupId);
  res.json(result);
});

// =================== RANKINGS & IMAGE ROUTES ===================

app.get('/api/rankings/groups', requireAuth, (req, res) => {
  const { seasonId, journeyId } = req.query;
  const data = getGroupRankings(db, seasonId, journeyId);
  res.json(data);
});

app.get('/api/rankings/individuals', requireAuth, (req, res) => {
  const { seasonId, journeyId, groupId } = req.query;
  const data = getIndividualRankings(db, seasonId, journeyId, groupId);
  res.json(data);
});

app.post('/api/rankings/image/:journeyId', requireAuth, (req, res) => {
  const { fileName, imageData } = req.body;
  if (!imageData) {
    return res.status(400).json({ success: false, message: 'Datos de imagen requeridos' });
  }
  const result = saveGeneratedImage(db, req.params.journeyId, fileName || `ranking_${req.params.journeyId}.png`, imageData);
  res.json(result);
});

app.get('/api/rankings/image/:journeyId', requireAuth, (req, res) => {
  const image = getLatestGeneratedImage(db, req.params.journeyId);
  res.json(image || null);
});

// =================== REPORTS & BACKUP ROUTES ===================

app.get('/api/reports/attendance/csv', requireAuth, (req, res) => {
  const { seasonId } = req.query;
  const csv = getAttendanceReportCsv(db, seasonId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="asistencia_tbbc_club.csv"');
  res.send(csv);
});

app.get('/api/reports/individual-scores/csv', requireAuth, (req, res) => {
  const { seasonId } = req.query;
  const csv = getIndividualScoresReportCsv(db, seasonId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="puntos_individuales_tbbc_club.csv"');
  res.send(csv);
});

app.get('/api/reports/group-scores/csv', requireAuth, (req, res) => {
  const { seasonId } = req.query;
  const csv = getGroupScoresReportCsv(db, seasonId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="puntos_grupales_tbbc_club.csv"');
  res.send(csv);
});

app.get('/api/reports/backup/db', requireAuth, (req, res) => {
  const dbPath = path.join(__dirname, '..', 'data', 'tbbc_club.sqlite');
  if (fs.existsSync(dbPath)) {
    res.download(dbPath, `backup_tbbc_club_${new Date().toISOString().slice(0, 10)}.sqlite`);
  } else {
    res.status(404).send('Archivo de base de datos no encontrado.');
  }
});

// =================== SYSTEM & DASHBOARD ROUTES ===================

app.get('/api/system/status', requireAuth, (req, res) => {
  const activeParticipants = queryOne(db, "SELECT COUNT(*) as count FROM participants WHERE is_active = 1")?.count || 0;
  const activeGroups = queryOne(db, "SELECT COUNT(*) as count FROM groups WHERE is_active = 1")?.count || 0;
  const totalJourneys = queryOne(db, "SELECT COUNT(*) as count FROM journeys")?.count || 0;
  const activeSeason = queryOne(db, "SELECT * FROM seasons WHERE is_active = 1");

  res.json({
    appName: 'TBBC CLUB BÍBLICO',
    version: '1.0.0',
    dbStatus: 'Conectada y Persistente (SQLite)',
    activeSeason: activeSeason ? activeSeason.name : 'Temporada no iniciada',
    stats: {
      activeParticipants,
      activeGroups,
      totalJourneys
    }
  });
});

app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const reqSeasonId = req.query.seasonId;
  let currentSeason = null;
  if (reqSeasonId && reqSeasonId !== 'all') {
    currentSeason = queryOne(db, "SELECT * FROM seasons WHERE id = ?", [reqSeasonId]);
  }
  if (!currentSeason) {
    currentSeason = getActiveSeason(db);
  }

  const seasonId = currentSeason ? currentSeason.id : null;

  const activeParticipants = queryOne(db, "SELECT COUNT(*) as count FROM participants WHERE is_active = 1")?.count || 0;
  const activeGroups = queryOne(db, "SELECT COUNT(*) as count FROM groups WHERE is_active = 1")?.count || 0;

  // Last journey in this season
  const lastJourney = seasonId
    ? queryOne(db, "SELECT * FROM journeys WHERE season_id = ? ORDER BY journey_date DESC LIMIT 1", [seasonId])
    : queryOne(db, "SELECT * FROM journeys ORDER BY journey_date DESC LIMIT 1");

  let lastAttendance = { present: 0, absent: 0, excused: 0, rate: 0 };
  if (lastJourney) {
    const present = queryOne(db, "SELECT COUNT(*) as count FROM attendance WHERE journey_id = ? AND status = 'present'", [lastJourney.id])?.count || 0;
    const absent = queryOne(db, "SELECT COUNT(*) as count FROM attendance WHERE journey_id = ? AND status = 'absent'", [lastJourney.id])?.count || 0;
    const excused = queryOne(db, "SELECT COUNT(*) as count FROM attendance WHERE journey_id = ? AND status = 'excused'", [lastJourney.id])?.count || 0;
    const total = present + absent + excused;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    lastAttendance = { present, absent, excused, rate, total };
  }

  // Points scoped to season
  const totalIndPoints = seasonId
    ? queryOne(db, "SELECT SUM(ind.total) as sum FROM individual_scores ind JOIN journeys j ON ind.journey_id = j.id WHERE j.season_id = ?", [seasonId])?.sum || 0
    : queryOne(db, "SELECT SUM(total) as sum FROM individual_scores")?.sum || 0;

  const totalGrpPoints = seasonId
    ? queryOne(db, "SELECT SUM(gs.total) as sum FROM group_scores gs JOIN journeys j ON gs.journey_id = j.id WHERE j.season_id = ?", [seasonId])?.sum || 0
    : queryOne(db, "SELECT SUM(total) as sum FROM group_scores")?.sum || 0;

  // Leader group in this season
  const leaderGroup = seasonId
    ? queryOne(db, `
        SELECT g.id, g.name, g.color, COALESCE(SUM(gs.total), 0) as total_points
        FROM groups g
        LEFT JOIN group_scores gs ON g.id = gs.group_id
        LEFT JOIN journeys j ON gs.journey_id = j.id AND j.season_id = ?
        WHERE g.is_active = 1
        GROUP BY g.id
        ORDER BY total_points DESC
        LIMIT 1
      `, [seasonId])
    : queryOne(db, `
        SELECT g.id, g.name, g.color, COALESCE(SUM(gs.total), 0) as total_points
        FROM groups g
        LEFT JOIN group_scores gs ON g.id = gs.group_id
        WHERE g.is_active = 1
        GROUP BY g.id
        ORDER BY total_points DESC
        LIMIT 1
      `);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSaturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
  const nextSaturdayStr = nextSaturday.toISOString().split('T')[0];

  // Groups summary scoped to season
  const groupsSummary = seasonId
    ? queryAll(db, `
        SELECT g.id, g.name, g.color,
          (SELECT COUNT(*) FROM participants p WHERE p.group_id = g.id AND p.is_active = 1) as member_count,
          COALESCE((SELECT SUM(gs.total) FROM group_scores gs JOIN journeys j ON gs.journey_id = j.id WHERE gs.group_id = g.id AND j.season_id = ?), 0) as group_points,
          COALESCE((SELECT SUM(ind.total) FROM individual_scores ind JOIN journeys j ON ind.journey_id = j.id JOIN participants part ON ind.participant_id = part.id WHERE part.group_id = g.id AND j.season_id = ?), 0) as individual_points
        FROM groups g
        WHERE g.is_active = 1
        ORDER BY group_points DESC
      `, [seasonId, seasonId])
    : queryAll(db, `
        SELECT g.id, g.name, g.color,
          (SELECT COUNT(*) FROM participants p WHERE p.group_id = g.id AND p.is_active = 1) as member_count,
          COALESCE((SELECT SUM(gs.total) FROM group_scores gs WHERE gs.group_id = g.id), 0) as group_points,
          COALESCE((SELECT SUM(ind.total) FROM individual_scores ind JOIN participants part ON ind.participant_id = part.id WHERE part.group_id = g.id), 0) as individual_points
        FROM groups g
        WHERE g.is_active = 1
        ORDER BY group_points DESC
      `);

  const recentLogs = queryAll(db, "SELECT * FROM audit_logs ORDER BY id DESC LIMIT 6");

  res.json({
    activeParticipants,
    activeGroups,
    currentSeason: currentSeason ? {
      id: currentSeason.id,
      name: currentSeason.name,
      start_date: currentSeason.start_date,
      end_date: currentSeason.end_date,
      is_active: currentSeason.is_active
    } : null,
    lastJourney: lastJourney ? {
      id: lastJourney.id,
      date: lastJourney.journey_date,
      title: lastJourney.title,
      status: lastJourney.status
    } : null,
    lastAttendance,
    totalIndPoints,
    totalGrpPoints,
    leaderGroup: leaderGroup ? {
      name: leaderGroup.name,
      color: leaderGroup.color,
      points: leaderGroup.total_points
    } : null,
    nextSaturday: nextSaturdayStr,
    groupsSummary,
    recentLogs
  });
});

app.get('/api/audit-logs', requireAuth, (req, res) => {
  const logs = queryAll(db, "SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50");
  res.json(logs);
});

// Static files
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>TBBC CLUB BÍBLICO API</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px;">
            <h1>TBBC CLUB BÍBLICO - Servidor Backend Activo</h1>
            <p>La base de datos SQLite está conectada y operando correctamente en el puerto ${PORT}.</p>
          </body>
        </html>
      `);
    }
  });
});

async function startServer() {
  try {
    db = await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=========================================`);
      console.log(` TBBC CLUB BÍBLICO - SERVIDOR ACTIVO`);
      console.log(` Puerto: ${PORT}`);
      console.log(` Local: http://localhost:${PORT}`);
      console.log(` Base de datos: SQLite persistente`);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('Error al inicializar el servidor:', err);
  }
}

startServer();

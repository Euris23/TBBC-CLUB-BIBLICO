import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'tbbc_club.sqlite');

let dbInstance = null;
let SQL = null;

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function initDb() {
  if (dbInstance) return dbInstance;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      console.log('Base de datos SQLite cargada desde:', DB_PATH);
    } catch (err) {
      console.error('Error al leer base de datos existente, inicializando nueva:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    console.log('Creando nueva base de datos SQLite persistente en:', DB_PATH);
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Create tables
  createTables(dbInstance);
  seedInitialData(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error al guardar base de datos SQLite en disco:', err);
  }
}

function createTables(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS active_sessions (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      logo TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      group_id INTEGER,
      entry_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journeys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER,
      journey_date TEXT NOT NULL UNIQUE,
      title TEXT,
      notes TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT NOT NULL,
      FOREIGN KEY(season_id) REFERENCES seasons(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journey_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('present', 'absent', 'excused')) NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(journey_id, participant_id),
      FOREIGN KEY(journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
      FOREIGN KEY(participant_id) REFERENCES participants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS individual_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journey_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      punctuality INTEGER DEFAULT 0,
      bring_bible INTEGER DEFAULT 0,
      attendance INTEGER DEFAULT 0,
      devotional INTEGER DEFAULT 0,
      verse INTEGER DEFAULT 0,
      church INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(journey_id, participant_id),
      FOREIGN KEY(journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
      FOREIGN KEY(participant_id) REFERENCES participants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journey_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      game1 INTEGER DEFAULT 0,
      game2 INTEGER DEFAULT 0,
      questions INTEGER DEFAULT 0,
      bring_bible INTEGER DEFAULT 0,
      punctuality INTEGER DEFAULT 0,
      group_attendance INTEGER DEFAULT 0,
      bible_presentation INTEGER DEFAULT 0,
      manual_points INTEGER DEFAULT 0,
      manual_points_reason TEXT DEFAULT '',
      total INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(journey_id, group_id),
      FOREIGN KEY(journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS generated_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journey_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      image_data TEXT NOT NULL,
      is_outdated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(journey_id) REFERENCES journeys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Migraciones seguras para columnas agregadas dinámicamente
  try {
    const tableInfo = queryAll(db, "PRAGMA table_info(group_scores)");
    const colNames = tableInfo.map((c) => c.name);
    if (!colNames.includes('manual_points')) {
      db.run("ALTER TABLE group_scores ADD COLUMN manual_points INTEGER DEFAULT 0");
    }
    if (!colNames.includes('manual_points_reason')) {
      db.run("ALTER TABLE group_scores ADD COLUMN manual_points_reason TEXT DEFAULT ''");
    }
  } catch (e) {
    console.error('Error al verificar columnas de group_scores:', e);
  }
}

function seedInitialData(db) {
  const now = new Date().toISOString();

  // Default PIN 2026 (or 1234)
  const pinRes = queryOne(db, "SELECT value FROM system_config WHERE key = 'access_pin'");
  if (!pinRes) {
    db.run(
      "INSERT INTO system_config (key, value, updated_at) VALUES ('access_pin', ?, ?)",
      ['2026', now]
    );
    db.run(
      "INSERT INTO system_config (key, value, updated_at) VALUES ('app_name', ?, ?)",
      ['TBBC CLUB BÍBLICO', now]
    );
    logAudit(db, 'INICIALIZACIÓN', 'Sistema inicializado con PIN por defecto (2026)');
  }

  // Initial Season
  const seasonRes = queryOne(db, "SELECT id FROM seasons WHERE is_active = 1");
  let activeSeasonId = seasonRes ? seasonRes.id : null;
  if (!activeSeasonId) {
    db.run(
      "INSERT INTO seasons (name, start_date, end_date, is_active, created_at) VALUES (?, ?, ?, 1, ?)",
      ['Desafío Real', '2026-01-10', '2026-12-15', now]
    );
    const newSeason = queryOne(db, "SELECT last_insert_rowid() as id");
    activeSeasonId = newSeason.id;
  }

  // Initial Groups (strictly 2 teams: Reyes Invictos and Reyes del Desafío)
  const groupCount = queryOne(db, "SELECT COUNT(*) as count FROM groups");
  if (!groupCount || groupCount.count === 0) {
    const initialGroups = [
      { name: 'Reyes Invictos', color: '#2563eb', desc: 'Equipo de campeones invictos en la fe' },
      { name: 'Reyes del Desafío', color: '#dc2626', desc: 'Guerreros valientes listos para cada desafío' }
    ];

    for (const g of initialGroups) {
      db.run(
        "INSERT INTO groups (name, color, logo, description, is_active, created_at, updated_at) VALUES (?, ?, '', ?, 1, ?, ?)",
        [g.name, g.color, g.desc, now, now]
      );
    }
  }

  // Initial Participants
  const partCount = queryOne(db, "SELECT COUNT(*) as count FROM participants");
  if (!partCount || partCount.count === 0) {
    const groups = queryAll(db, "SELECT id, name FROM groups WHERE is_active = 1");
    const sampleMembers = [
      { name: 'Mateo González', groupIndex: 0 },
      { name: 'Valentina Martínez', groupIndex: 0 },
      { name: 'Santiago López', groupIndex: 0 },
      { name: 'Lucas Benítez', groupIndex: 0 },
      { name: 'Daniel Morales', groupIndex: 0 },
      { name: 'Samuel Pérez', groupIndex: 0 },
      { name: 'Sofía Rodríguez', groupIndex: 1 },
      { name: 'Camila Fernández', groupIndex: 1 },
      { name: 'Isabella Castro', groupIndex: 1 },
      { name: 'Victoria Herrera', groupIndex: 1 },
      { name: 'David Sánchez', groupIndex: 1 },
      { name: 'Gabriela Torres', groupIndex: 1 },
    ];

    for (const sm of sampleMembers) {
      const gId = groups[sm.groupIndex] ? groups[sm.groupIndex].id : null;
      db.run(
        "INSERT INTO participants (full_name, group_id, entry_date, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
        [sm.name, gId, '2026-01-10', now, now]
      );
    }
  }

  // Initial sample Journey to seed stats
  const journeyCount = queryOne(db, "SELECT COUNT(*) as count FROM journeys");
  if (!journeyCount || journeyCount.count === 0) {
    const journeyDate = '2026-02-28';
    db.run(
      "INSERT INTO journeys (season_id, journey_date, title, notes, status, created_at) VALUES (?, ?, ?, ?, 'completed', ?)",
      [activeSeasonId, journeyDate, 'Jornada Inaugural - La Armadura de Dios', 'Inicio de actividades con gran entusiasmo', now]
    );
    const jId = queryOne(db, "SELECT last_insert_rowid() as id").id;

    // Seed Attendance and Individual Points for that journey
    const participants = queryAll(db, "SELECT id, group_id FROM participants");
    for (const p of participants) {
      db.run(
        "INSERT INTO attendance (journey_id, participant_id, status, updated_at) VALUES (?, ?, 'present', ?)",
        [jId, p.id, now]
      );
      // Criteria: punctuality(15), bible(20), att(10), devotional(25), verse(10), church(20) = 100
      db.run(
        "INSERT INTO individual_scores (journey_id, participant_id, punctuality, bring_bible, attendance, devotional, verse, church, total, updated_at) VALUES (?, ?, 15, 20, 10, 25, 10, 20, 100, ?)",
        [jId, p.id, now]
      );
    }

    // Seed Group Points for that journey (max 950)
    const groups = queryAll(db, "SELECT id FROM groups WHERE is_active = 1");
    const scores = [880, 840];
    groups.forEach((g, idx) => {
      const total = scores[idx] || 700;
      db.run(
        `INSERT INTO group_scores (
          journey_id, group_id, game1, game2, questions, bring_bible, punctuality, group_attendance, bible_presentation, total, updated_at
        ) VALUES (?, ?, 90, 85, 90, 190, 185, 140, 100, ?, ?)`,
        [jId, g.id, total, now]
      );
    });

    logAudit(db, 'DATOS_INICIALES', 'Jornada inaugural de muestra registrada con éxito');
  }
}

// Helper query wrappers for sql.js
export function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(db, sql, params = []) {
  const rows = queryAll(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(db, sql, params = []) {
  db.run(sql, params);
  saveDb();
}

export function logAudit(db, action, details = '') {
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO audit_logs (action, details, created_at) VALUES (?, ?, ?)",
    [action, details, now]
  );
  saveDb();
}

export { dbInstance };


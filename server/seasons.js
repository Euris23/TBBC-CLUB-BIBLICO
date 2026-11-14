import { queryAll, queryOne, execute, logAudit } from './db.js';

// Get all seasons with computed stats
export function getAllSeasons(db) {
  const sql = `
    SELECT 
      s.*,
      COALESCE((SELECT COUNT(*) FROM journeys j WHERE j.season_id = s.id), 0) as journeys_count,
      COALESCE((
        SELECT SUM(gs.total) 
        FROM group_scores gs 
        JOIN journeys j ON gs.journey_id = j.id 
        WHERE j.season_id = s.id
      ), 0) as total_group_points,
      COALESCE((
        SELECT SUM(ind.total) 
        FROM individual_scores ind 
        JOIN journeys j ON ind.journey_id = j.id 
        WHERE j.season_id = s.id
      ), 0) as total_individual_points,
      COALESCE((
        SELECT COUNT(*) 
        FROM attendance a 
        JOIN journeys j ON a.journey_id = j.id 
        WHERE j.season_id = s.id AND a.status = 'present'
      ), 0) as total_present
    FROM seasons s
    ORDER BY s.is_active DESC, s.start_date DESC
  `;

  return queryAll(db, sql);
}

// Get active season
export function getActiveSeason(db) {
  let season = queryOne(db, "SELECT * FROM seasons WHERE is_active = 1 LIMIT 1");
  if (!season) {
    season = queryOne(db, "SELECT * FROM seasons ORDER BY id DESC LIMIT 1");
  }
  return season;
}

// Create new season
export function createSeason(db, { name, start_date, end_date = '', set_active = false }) {
  if (!name || !name.trim()) {
    return { success: false, message: 'El nombre de la temporada es obligatorio.' };
  }
  if (!start_date || !start_date.trim()) {
    return { success: false, message: 'La fecha de inicio de la temporada es obligatoria.' };
  }

  const now = new Date().toISOString();

  // If set_active, deactivate others
  if (set_active) {
    execute(db, "UPDATE seasons SET is_active = 0");
  }

  const activeValue = set_active ? 1 : 0;

  execute(
    db,
    `INSERT INTO seasons (name, start_date, end_date, is_active, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [name.trim(), start_date.trim(), end_date ? end_date.trim() : null, activeValue, now]
  );

  const newSeason = queryOne(db, "SELECT * FROM seasons WHERE id = last_insert_rowid()");
  logAudit(db, 'CREAR_TEMPORADA', `Se creó la temporada "${newSeason.name}" (${newSeason.start_date} al ${newSeason.end_date || 'En curso'})`);

  return {
    success: true,
    season: newSeason,
    message: `¡Temporada "${newSeason.name}" creada exitosamente!`
  };
}

// Update season
export function updateSeason(db, id, { name, start_date, end_date = '', is_active }) {
  const current = queryOne(db, "SELECT * FROM seasons WHERE id = ?", [id]);
  if (!current) {
    return { success: false, message: 'Temporada no encontrada.' };
  }

  if (!name || !name.trim()) {
    return { success: false, message: 'El nombre de la temporada no puede estar vacío.' };
  }
  if (!start_date || !start_date.trim()) {
    return { success: false, message: 'La fecha de inicio es obligatoria.' };
  }

  // If activating this season, deactivate others
  if (is_active === 1 || is_active === true) {
    execute(db, "UPDATE seasons SET is_active = 0 WHERE id != ?", [id]);
  }

  execute(
    db,
    `UPDATE seasons 
     SET name = ?, start_date = ?, end_date = ?, is_active = ? 
     WHERE id = ?`,
    [
      name.trim(),
      start_date.trim(),
      end_date ? end_date.trim() : null,
      is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
      id
    ]
  );

  logAudit(db, 'EDITAR_TEMPORADA', `Se actualizó la información de la temporada "${name.trim()}"`);

  return {
    success: true,
    message: `¡Temporada "${name.trim()}" actualizada correctamente!`
  };
}

// Activate season
export function activateSeason(db, id) {
  const season = queryOne(db, "SELECT * FROM seasons WHERE id = ?", [id]);
  if (!season) {
    return { success: false, message: 'Temporada no encontrada.' };
  }

  execute(db, "UPDATE seasons SET is_active = 0");
  execute(db, "UPDATE seasons SET is_active = 1 WHERE id = ?", [id]);

  logAudit(db, 'ACTIVAR_TEMPORADA', `Se estableció como activa la temporada "${season.name}"`);

  return {
    success: true,
    season,
    message: `¡Temporada "${season.name}" activada como la temporada en curso!`
  };
}

// Delete season permanently
export function deleteSeason(db, id) {
  const season = queryOne(db, "SELECT * FROM seasons WHERE id = ?", [id]);
  if (!season) {
    return { success: false, message: 'Temporada no encontrada.' };
  }

  // Count journeys in season
  const journeys = queryAll(db, "SELECT id FROM journeys WHERE season_id = ?", [id]);
  for (const j of journeys) {
    execute(db, "DELETE FROM attendance WHERE journey_id = ?", [j.id]);
    execute(db, "DELETE FROM individual_scores WHERE journey_id = ?", [j.id]);
    execute(db, "DELETE FROM group_scores WHERE journey_id = ?", [j.id]);
    execute(db, "DELETE FROM generated_images WHERE journey_id = ?", [j.id]);
  }
  execute(db, "DELETE FROM journeys WHERE season_id = ?", [id]);
  execute(db, "DELETE FROM seasons WHERE id = ?", [id]);

  // If the deleted season was active, activate the most recent remaining one
  const anyActive = queryOne(db, "SELECT id FROM seasons WHERE is_active = 1");
  if (!anyActive) {
    const latest = queryOne(db, "SELECT id FROM seasons ORDER BY id DESC LIMIT 1");
    if (latest) {
      execute(db, "UPDATE seasons SET is_active = 1 WHERE id = ?", [latest.id]);
    }
  }

  logAudit(db, 'ELIMINAR_TEMPORADA', `Se eliminó la temporada "${season.name}" y sus datos asociados`);

  return {
    success: true,
    message: `¡Temporada "${season.name}" eliminada correctamente!`
  };
}


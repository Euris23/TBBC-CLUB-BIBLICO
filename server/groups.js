import { queryAll, queryOne, execute, logAudit } from './db.js';

// Get all groups with computed metrics (optionally scoped by season)
export function getAllGroups(db, includeInactive = true, seasonId = null) {
  const whereClause = includeInactive ? '' : 'WHERE g.is_active = 1';
  const hasSeason = seasonId && String(seasonId) !== 'all';
  const seasonParam = hasSeason ? [seasonId, seasonId] : [];

  const grpPointsQuery = hasSeason
    ? '(SELECT SUM(gs.total) FROM group_scores gs JOIN journeys j ON gs.journey_id = j.id WHERE gs.group_id = g.id AND j.season_id = ?)'
    : '(SELECT SUM(gs.total) FROM group_scores gs WHERE gs.group_id = g.id)';

  const indPointsQuery = hasSeason
    ? '(SELECT SUM(ind.total) FROM individual_scores ind JOIN journeys j ON ind.journey_id = j.id JOIN participants part ON ind.participant_id = part.id WHERE part.group_id = g.id AND j.season_id = ?)'
    : '(SELECT SUM(ind.total) FROM individual_scores ind JOIN participants part ON ind.participant_id = part.id WHERE part.group_id = g.id)';

  const sql = `
    SELECT 
      g.id,
      g.name,
      g.color,
      g.logo,
      g.description,
      g.is_active,
      g.created_at,
      g.updated_at,
      (SELECT COUNT(*) FROM participants p WHERE p.group_id = g.id AND p.is_active = 1) as active_members_count,
      (SELECT COUNT(*) FROM participants p WHERE p.group_id = g.id) as total_members_count,
      COALESCE(${grpPointsQuery}, 0) as group_points,
      COALESCE(${indPointsQuery}, 0) as individual_points
    FROM groups g
    ${whereClause}
    ORDER BY g.is_active DESC, group_points DESC, g.name ASC
  `;

  return queryAll(db, sql, seasonParam);
}

// Get group by ID with its participants and scores history
export function getGroupById(db, id) {
  const group = queryOne(db, `
    SELECT 
      g.*,
      (SELECT COUNT(*) FROM participants p WHERE p.group_id = g.id AND p.is_active = 1) as active_members_count,
      COALESCE((SELECT SUM(gs.total) FROM group_scores gs WHERE gs.group_id = g.id), 0) as group_points
    FROM groups g 
    WHERE g.id = ?
  `, [id]);

  if (!group) return null;

  // Group members
  const members = queryAll(db, `
    SELECT id, full_name, entry_date, is_active 
    FROM participants 
    WHERE group_id = ? 
    ORDER BY is_active DESC, full_name ASC
  `, [id]);

  // Scores by journey
  const scoresHistory = queryAll(db, `
    SELECT 
      gs.*,
      j.journey_date,
      j.title as journey_title
    FROM group_scores gs
    JOIN journeys j ON gs.journey_id = j.id
    WHERE gs.group_id = ?
    ORDER BY j.journey_date DESC
  `, [id]);

  return {
    ...group,
    members,
    scoresHistory
  };
}

// Create new group
export function createGroup(db, { name, color, logo = '', description = '' }) {
  if (!name || !name.trim()) {
    return { success: false, message: 'El nombre del grupo es obligatorio.' };
  }
  if (!color || !color.trim()) {
    return { success: false, message: 'El color identificativo es obligatorio.' };
  }

  // Check unique name
  const existing = queryOne(db, "SELECT id FROM groups WHERE LOWER(name) = LOWER(?)", [name.trim()]);
  if (existing) {
    return { success: false, message: `Ya existe un grupo con el nombre "${name.trim()}".` };
  }

  const now = new Date().toISOString();
  execute(
    db,
    `INSERT INTO groups (name, color, logo, description, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [name.trim(), color.trim(), logo.trim(), description.trim(), now, now]
  );

  const newGroup = queryOne(db, "SELECT * FROM groups WHERE id = last_insert_rowid()");
  logAudit(db, 'CREAR_GRUPO', `Se creó el grupo "${newGroup.name}" con color ${newGroup.color}`);

  return {
    success: true,
    group: newGroup,
    message: `¡Grupo "${newGroup.name}" creado con éxito!`
  };
}

// Update group
export function updateGroup(db, id, { name, color, logo = '', description = '', is_active = 1 }) {
  const current = queryOne(db, "SELECT * FROM groups WHERE id = ?", [id]);
  if (!current) {
    return { success: false, message: 'Grupo no encontrado.' };
  }

  if (!name || !name.trim()) {
    return { success: false, message: 'El nombre del grupo no puede estar vacío.' };
  }
  if (!color || !color.trim()) {
    return { success: false, message: 'El color no puede estar vacío.' };
  }

  // Check unique name excluding self
  const duplicate = queryOne(
    db, 
    "SELECT id FROM groups WHERE LOWER(name) = LOWER(?) AND id != ?", 
    [name.trim(), id]
  );
  if (duplicate) {
    return { success: false, message: `Ya existe otro grupo con el nombre "${name.trim()}".` };
  }

  const now = new Date().toISOString();
  execute(
    db,
    `UPDATE groups 
     SET name = ?, color = ?, logo = ?, description = ?, is_active = ?, updated_at = ? 
     WHERE id = ?`,
    [name.trim(), color.trim(), logo.trim(), description.trim(), is_active ? 1 : 0, now, id]
  );

  logAudit(db, 'EDITAR_GRUPO', `Se actualizó la información del grupo "${name.trim()}"`);

  return {
    success: true,
    message: `¡Grupo "${name.trim()}" actualizado correctamente!`
  };
}

// Toggle group active/inactive status
export function toggleGroupStatus(db, id) {
  const current = queryOne(db, "SELECT id, name, is_active FROM groups WHERE id = ?", [id]);
  if (!current) {
    return { success: false, message: 'Grupo no encontrado.' };
  }

  const newStatus = current.is_active === 1 ? 0 : 1;
  const now = new Date().toISOString();

  execute(
    db,
    "UPDATE groups SET is_active = ?, updated_at = ? WHERE id = ?",
    [newStatus, now, id]
  );

  const statusText = newStatus === 1 ? 'reactivado' : 'desactivado';
  logAudit(db, 'ESTADO_GRUPO', `El grupo "${current.name}" fue ${statusText} (su historial permanece intacto)`);

  return {
    success: true,
    is_active: newStatus,
    message: `El grupo "${current.name}" ha sido ${statusText}. El historial se conserva permanentemente.`
  };
}

// Delete group permanently
export function deleteGroup(db, id) {
  const current = queryOne(db, "SELECT id, name FROM groups WHERE id = ?", [id]);
  if (!current) {
    return { success: false, message: 'Grupo no encontrado.' };
  }

  // Disassociate members first
  execute(db, "UPDATE participants SET group_id = NULL WHERE group_id = ?", [id]);
  // Delete associated group scores
  execute(db, "DELETE FROM group_scores WHERE group_id = ?", [id]);
  // Delete the group
  execute(db, "DELETE FROM groups WHERE id = ?", [id]);

  logAudit(db, 'ELIMINAR_GRUPO', `Se eliminó el grupo "${current.name}"`);

  return {
    success: true,
    message: `¡Grupo "${current.name}" eliminado correctamente!`
  };
}



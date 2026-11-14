import { initDb, queryAll, queryOne, execute, logAudit, saveDb } from './db.js';

async function migrate() {
  console.log('Iniciando migración: Temporada "Desafío Real" y 2 Equipos ("Reyes Invictos" y "Reyes del Desafío")...');
  const db = await initDb();
  const now = new Date().toISOString();

  // 1. Actualizar o crear temporada activa "Desafío Real"
  const activeSeason = queryOne(db, "SELECT id, name FROM seasons WHERE is_active = 1");
  let activeSeasonId;
  if (activeSeason) {
    execute(db, "UPDATE seasons SET name = 'Desafío Real' WHERE id = ?", [activeSeason.id]);
    activeSeasonId = activeSeason.id;
    console.log(`Temporada activa #${activeSeasonId} renombrada a 'Desafío Real'.`);
  } else {
    execute(
      db,
      "INSERT INTO seasons (name, start_date, end_date, is_active, created_at) VALUES ('Desafío Real', '2026-01-10', '2026-12-15', 1, ?)",
      [now]
    );
    const created = queryOne(db, "SELECT last_insert_rowid() as id");
    activeSeasonId = created.id;
    console.log(`Nueva temporada activa creada #${activeSeasonId}: 'Desafío Real'.`);
  }

  // 2. Asegurar Grupo 1: "Reyes Invictos"
  const g1 = queryOne(db, "SELECT id FROM groups WHERE id = 1");
  if (g1) {
    execute(
      db,
      "UPDATE groups SET name = 'Reyes Invictos', color = '#2563eb', description = 'Equipo de campeones invictos en la fe', is_active = 1, updated_at = ? WHERE id = 1",
      [now]
    );
    console.log('Grupo #1 configurado como: Reyes Invictos (#2563eb)');
  } else {
    execute(
      db,
      "INSERT INTO groups (id, name, color, logo, description, is_active, created_at, updated_at) VALUES (1, 'Reyes Invictos', '#2563eb', '', 'Equipo de campeones invictos en la fe', 1, ?, ?)",
      [now, now]
    );
    console.log('Grupo #1 insertado como: Reyes Invictos (#2563eb)');
  }

  // 3. Asegurar Grupo 2: "Reyes del Desafío"
  const g2 = queryOne(db, "SELECT id FROM groups WHERE id = 2");
  if (g2) {
    execute(
      db,
      "UPDATE groups SET name = 'Reyes del Desafío', color = '#dc2626', description = 'Guerreros valientes listos para cada desafío', is_active = 1, updated_at = ? WHERE id = 2",
      [now]
    );
    console.log('Grupo #2 configurado como: Reyes del Desafío (#dc2626)');
  } else {
    execute(
      db,
      "INSERT INTO groups (id, name, color, logo, description, is_active, created_at, updated_at) VALUES (2, 'Reyes del Desafío', '#dc2626', '', 'Guerreros valientes listos para cada desafío', 1, ?, ?)",
      [now, now]
    );
    console.log('Grupo #2 insertado como: Reyes del Desafío (#dc2626)');
  }

  // 4. Desactivar todos los demás grupos
  execute(db, "UPDATE groups SET is_active = 0 WHERE id NOT IN (1, 2)");
  console.log('Todos los demás grupos marcados como inactivos.');

  // 5. Reasignar todos los participantes activos a los 2 equipos (50% y 50%)
  const participants = queryAll(db, "SELECT id, full_name FROM participants WHERE is_active = 1 ORDER BY id ASC");
  console.log(`Reasignando ${participants.length} participantes entre Reyes Invictos y Reyes del Desafío...`);

  participants.forEach((p, idx) => {
    const targetGroupId = (idx % 2 === 0) ? 1 : 2;
    execute(
      db,
      "UPDATE participants SET group_id = ?, updated_at = ? WHERE id = ?",
      [targetGroupId, now, p.id]
    );
  });

  const countG1 = queryOne(db, "SELECT COUNT(*) as c FROM participants WHERE group_id = 1 AND is_active = 1").c;
  const countG2 = queryOne(db, "SELECT COUNT(*) as c FROM participants WHERE group_id = 2 AND is_active = 1").c;
  console.log(`Integrantes en Reyes Invictos: ${countG1} | Integrantes en Reyes del Desafío: ${countG2}`);

  // 6. Limpiar group_scores de grupos obsoletos en todas las jornadas para rankings limpios
  execute(db, "DELETE FROM group_scores WHERE group_id NOT IN (1, 2)");
  console.log('Puntajes de grupos depurados para los dos equipos principales.');

  // 7. Asegurar que las jornadas tengan puntuaciones asignadas a los dos equipos
  const journeys = queryAll(db, "SELECT id FROM journeys");
  for (const j of journeys) {
    const hasG1 = queryOne(db, "SELECT id FROM group_scores WHERE journey_id = ? AND group_id = 1", [j.id]);
    if (!hasG1) {
      execute(
        db,
        `INSERT INTO group_scores (
          journey_id, group_id, game1, game2, questions, bring_bible, punctuality, group_attendance, bible_presentation, total, updated_at
        ) VALUES (?, 1, 95, 90, 95, 190, 190, 140, 100, 900, ?)`,
        [j.id, now]
      );
    }
    const hasG2 = queryOne(db, "SELECT id FROM group_scores WHERE journey_id = ? AND group_id = 2", [j.id]);
    if (!hasG2) {
      execute(
        db,
        `INSERT INTO group_scores (
          journey_id, group_id, game1, game2, questions, bring_bible, punctuality, group_attendance, bible_presentation, total, updated_at
        ) VALUES (?, 2, 90, 85, 90, 185, 185, 135, 95, 865, ?)`,
        [j.id, now]
      );
    }
  }

  logAudit(db, 'MIGRACIÓN_TEMPORADA', 'Temporada ajustada a "Desafío Real" con 2 equipos: Reyes Invictos y Reyes del Desafío');
  saveDb();
  console.log('¡Migración completada exitosamente!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});


import crypto from 'crypto';
import { queryOne, queryAll, execute, logAudit } from './db.js';

// Clean expired sessions periodically
export function cleanExpiredSessions(db) {
  const now = new Date().toISOString();
  execute(db, "DELETE FROM active_sessions WHERE expires_at < ?", [now]);
}

// Verify PIN and create a session
export function loginWithPin(db, inputPin) {
  cleanExpiredSessions(db);
  const config = queryOne(db, "SELECT value FROM system_config WHERE key = 'access_pin'");
  const validPin = config ? config.value : '2026';

  if (!inputPin || String(inputPin).trim() !== String(validPin).trim()) {
    logAudit(db, 'ACCESO_FALLIDO', 'Intento de acceso con PIN incorrecto');
    return { success: false, message: 'PIN incorrecto. Verifica e intenta nuevamente.' };
  }

  // Generate 7-day session token
  const token = crypto.randomBytes(32).toString('hex');
  const createdAt = new Date();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  execute(
    db,
    "INSERT INTO active_sessions (token, created_at, expires_at) VALUES (?, ?, ?)",
    [token, createdAt.toISOString(), expiresAt.toISOString()]
  );

  logAudit(db, 'ACCESO_EXITOSO', 'Sesión iniciada correctamente');

  return {
    success: true,
    token,
    expiresAt: expiresAt.toISOString(),
    message: 'Acceso autorizado al Club Bíblico TBBC'
  };
}

// Validate session token
export function validateSession(db, token) {
  if (!token) return false;
  cleanExpiredSessions(db);
  const now = new Date().toISOString();
  const session = queryOne(
    db,
    "SELECT token, expires_at FROM active_sessions WHERE token = ? AND expires_at > ?",
    [token, now]
  );
  return !!session;
}

// Terminate / logout session
export function logoutSession(db, token) {
  if (!token) return;
  execute(db, "DELETE FROM active_sessions WHERE token = ?", [token]);
  logAudit(db, 'CIERRE_SESION', 'Sesión cerrada por el usuario');
}

// Change access PIN
export function changePin(db, currentPin, newPin) {
  const config = queryOne(db, "SELECT value FROM system_config WHERE key = 'access_pin'");
  const actualPin = config ? config.value : '2026';

  if (String(currentPin).trim() !== String(actualPin).trim()) {
    return { success: false, message: 'El PIN actual no coincide. Por seguridad, no se modificó.' };
  }

  if (!newPin || String(newPin).trim().length < 4) {
    return { success: false, message: 'El nuevo PIN debe tener al menos 4 caracteres numéricos.' };
  }

  const now = new Date().toISOString();
  execute(
    db,
    "UPDATE system_config SET value = ?, updated_at = ? WHERE key = 'access_pin'",
    [String(newPin).trim(), now]
  );

  logAudit(db, 'CAMBIO_PIN', 'Se ha actualizado el PIN general de acceso');

  return { success: true, message: '¡PIN actualizado exitosamente! Utiliza el nuevo PIN a partir de ahora.' };
}


/**
 * Utilidades para formatear fechas en orden dominicano / latino: DÍA / MES / AÑO (DD/MM/YYYY)
 */

/**
 * Convierte '2026-11-14' o timestamp en '14/11/2026'
 */
export function formatDateDMY(dateStr) {
  if (!dateStr) return '';
  // Si ya viene como YYYY-MM-DD
  const parts = dateStr.toString().split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Convierte '2026-11-14' en '14 de nov. de 2026' o 'Sábado 14 de Noviembre, 2026'
 */
export function formatDateWords(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.toString().split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${day} de ${months[monthIndex]} de ${year}`;
  }
  return formatDateDMY(dateStr);
}


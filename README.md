# TBBC CLUB BÍBLICO — Sistema de Gestión

Aplicación web profesional para la administración de las actividades sabatinas del Club Bíblico TBBC.

## 🚀 Cómo Iniciar la Aplicación

1. Abre la carpeta del proyecto en la terminal:
   ```bash
   cd "C:\Users\MAPFRE\.gemini\antigravity\scratch\tbbc-club-biblico"
   ```

2. Ejecuta el servidor:
   ```bash
   npm start
   ```

3. Abre en tu navegador (en tu computadora, tableta o celular):
   - **Local:** `http://localhost:3001`
   - **En red local (WiFi de la iglesia / casa):** `http://<IP-DE-TU-PC>:3001`

---

## 🔑 Acceso Inicial
- **PIN General compartido:** `2026`
- Puedes cambiar el PIN en cualquier momento desde el botón **"Cambiar PIN"** o en la sección **Configuración** (te solicitará el PIN actual).

---

## 📊 Arquitectura — Fase 1 Implementada
- **Base de Datos:** SQLite persistente en `data/tbbc_club.sqlite` con soporte relacional completo (grupos, participantes, jornadas, asistencias, puntuaciones individuales, puntuaciones grupales, imágenes y auditoría).
- **Backend:** Node.js con Express, API REST protegida por sesiones y validación de PIN.
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, diseño completamente responsivo para PC, tablet y móviles.
- **Auditoría:** Registro de fecha y hora de cambios importantes (ej. cambio de PIN, inicialización) sin requerir perfiles individuales.


import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Seasons Management State
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(() => localStorage.getItem('tbbc_season_id') || '');
  const [activeSeason, setActiveSeason] = useState(null);

  // Show temporary toast message
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch all seasons
  const fetchSeasons = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const res = await fetch('/api/seasons', {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setSeasons(data);

        // Find currently active season
        const active = data.find((s) => s.is_active === 1) || data[0] || null;
        setActiveSeason(active);

        // Set default selected season if not set or invalid
        setSelectedSeasonId((prev) => {
          if (prev && data.some((s) => String(s.id) === String(prev))) {
            return prev;
          }
          const defaultId = active ? String(active.id) : (data[0] ? String(data[0].id) : '');
          if (defaultId) localStorage.setItem('tbbc_season_id', defaultId);
          return defaultId;
        });
      }
    } catch (err) {
      console.error('Error al cargar temporadas:', err);
    }
  }, [isAuthenticated, token]);

  // Fetch real statistics from server scoped to selected season
  const fetchDashboardStats = useCallback(async (seasonIdParam) => {
    if (!isAuthenticated || !token) return;
    const sId = seasonIdParam !== undefined ? seasonIdParam : selectedSeasonId;
    setLoadingStats(true);
    try {
      const query = sId ? `?seasonId=${sId}` : '';
      const res = await fetch(`/api/dashboard/stats${query}`, {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error al obtener estadísticas del dashboard:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [isAuthenticated, token, selectedSeasonId]);

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const res = await fetch('/api/system/status', {
        headers: { 'x-session-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.error('Error al obtener estado del sistema:', err);
    }
  }, [isAuthenticated, token]);

  // Change selected season handler
  const handleSelectSeason = (id) => {
    setSelectedSeasonId(String(id));
    localStorage.setItem('tbbc_season_id', String(id));
    fetchDashboardStats(String(id));
  };

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSeasons();
      fetchSystemStatus();
    }
  }, [isAuthenticated, fetchSeasons, fetchSystemStatus]);

  // Re-fetch stats when selectedSeasonId changes
  useEffect(() => {
    if (isAuthenticated && selectedSeasonId) {
      fetchDashboardStats(selectedSeasonId);
    }
  }, [isAuthenticated, selectedSeasonId, fetchDashboardStats]);

  return (
    <AppContext.Provider
      value={{
        currentSection,
        setCurrentSection,
        stats,
        systemStatus,
        loadingStats,
        fetchDashboardStats,
        fetchSystemStatus,
        isPinModalOpen,
        setIsPinModalOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        toast,
        showToast,
        seasons,
        activeSeason,
        selectedSeasonId,
        setSelectedSeasonId: handleSelectSeason,
        fetchSeasons
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser utilizado dentro de un AppProvider');
  }
  return context;
}

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import PinLockScreen from './components/PinLockScreen';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Dashboard from './components/Dashboard';
import GroupsView from './components/GroupsView';
import ParticipantsView from './components/ParticipantsView';
import AttendanceView from './components/AttendanceView';
import IndividualScoresView from './components/IndividualScoresView';
import GroupScoresView from './components/GroupScoresView';
import RankingsView from './components/RankingsView';
import SeasonsView from './components/SeasonsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import ModulePlaceholder from './components/ModulePlaceholder';
import ChangePinModal from './components/ChangePinModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const { currentSection, toast } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Iniciando TBBC CLUB BÍBLICO...</p>
      </div>
    );
  }

  // Not authenticated -> Show PIN Lock Screen
  if (!isAuthenticated) {
    return <PinLockScreen />;
  }

  // Authenticated -> Show Main App Layout
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentSection === 'dashboard' && <Dashboard />}
            {currentSection === 'groups' && <GroupsView />}
            {currentSection === 'participants' && <ParticipantsView />}
            {currentSection === 'attendance' && <AttendanceView />}
            {currentSection === 'individual_scores' && <IndividualScoresView />}
            {currentSection === 'group_scores' && <GroupScoresView />}
            {currentSection === 'rankings' && <RankingsView />}
            {currentSection === 'seasons' && <SeasonsView />}
            {currentSection === 'reports' && <ReportsView />}
            {currentSection === 'settings' && <SettingsView />}
            {currentSection !== 'dashboard' &&
              currentSection !== 'groups' &&
              currentSection !== 'participants' &&
              currentSection !== 'attendance' &&
              currentSection !== 'individual_scores' &&
              currentSection !== 'group_scores' &&
              currentSection !== 'rankings' &&
              currentSection !== 'seasons' &&
              currentSection !== 'reports' &&
              currentSection !== 'settings' && (
                <ModulePlaceholder sectionId={currentSection} />
              )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Bar & Full Drawer */}
      <MobileNav />

      {/* Global Change PIN Modal */}
      <ChangePinModal />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-16 lg:bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-xl border border-slate-800 animate-bounce">
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

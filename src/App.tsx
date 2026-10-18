import React, { useState } from 'react';
import { 
  ShiftSession, 
  MasterTargetDryMap, 
  ShiftName, 
  ProductType,
  UserAccount,
  AuthSession
} from './types/qc';
import { 
  getStoredAuth, 
  saveStoredAuth, 
  logoutUser, 
  getStoredActiveSession, 
  saveStoredActiveSession, 
  getStoredMasterTargets, 
  saveStoredMasterTargets, 
  switchOrStartShift, 
  resetFactoryData 
} from './services/qcStorage';

import { Navbar } from './components/qc/Navbar';
import { LoginPage } from './components/qc/LoginPage';
import { ProfileModal } from './components/qc/ProfileModal';
import { ShiftModal } from './components/qc/ShiftModal';
import { AiAnalyzerModal } from './components/qc/AiAnalyzerModal';
import { DataGridPage } from './components/qc/DataGridPage';
import { ProporsiPage } from './components/qc/ProporsiPage';
import { RawMaterialsPage } from './components/qc/RawMaterialsPage';
import { WhatsAppReportPage } from './components/qc/WhatsAppReportPage';
import { RiwayatPage } from './components/qc/RiwayatPage';
import { MasterDataPage } from './components/qc/MasterDataPage';

export default function App() {
  const [auth, setAuth] = useState<AuthSession>(() => getStoredAuth());
  const [currentTab, setCurrentTab] = useState<'grid' | 'proporsi' | 'materials' | 'report' | 'riwayat' | 'master'>('grid');
  const [session, setSession] = useState<ShiftSession>(() => getStoredActiveSession());
  const [masterTargets, setMasterTargets] = useState<MasterTargetDryMap>(() => getStoredMasterTargets());
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [proporsiTargetMill, setProporsiTargetMill] = useState<'TM' | 'VRM'>('TM');

  // Handle successful login
  const handleLoginSuccess = (user: UserAccount, date: string, shift: ShiftName) => {
    const newAuth: AuthSession = {
      isLoggedIn: true,
      user,
      loginDate: date,
      loginShift: shift,
    };
    setAuth(newAuth);
    saveStoredAuth(newAuth);

    // Switch or resume active shift for this date & shift
    const loadedSession = switchOrStartShift(
      date,
      shift,
      user.name,
      session.tm?.isRunning ?? true,
      session.tm?.productType ?? 'PCC NON FA',
      session.tm?.siloName ?? 'SILO 5',
      session.vrm?.isRunning ?? true,
      session.vrm?.productType ?? 'PCC Plus FA',
      session.vrm?.siloName ?? 'SILO 4'
    );
    setSession(loadedSession);
    setCurrentTab('grid');
  };

  // Handle user logout
  const handleLogout = () => {
    logoutUser();
    setAuth({
      isLoggedIn: false,
      user: null,
      loginDate: new Date().toISOString().slice(0, 10),
      loginShift: 'SHIFT 2',
    });
    setIsProfileModalOpen(false);
  };

  // Update session and persist to storage and archive
  const handleUpdateSession = (updated: ShiftSession) => {
    setSession(updated);
    saveStoredActiveSession(updated);
  };

  // Start or switch shift from ShiftModal with Dual-Mill support
  const handleConfirmNewShift = (
    shiftName: ShiftName,
    date: string,
    analystName: string,
    tmRunning: boolean,
    tmProduct: ProductType,
    tmSilo: string,
    vrmRunning: boolean,
    vrmProduct: ProductType,
    vrmSilo: string
  ) => {
    const newSession = switchOrStartShift(
      date,
      shiftName,
      analystName,
      tmRunning,
      tmProduct,
      tmSilo,
      vrmRunning,
      vrmProduct,
      vrmSilo
    );
    setSession(newSession);
    setCurrentTab('grid');
  };

  // Load an archived shift directly onto the active workspace
  const handleLoadArchiveToActive = (archivedSession: ShiftSession) => {
    setSession(archivedSession);
    saveStoredActiveSession(archivedSession);
    setCurrentTab('grid');
  };

  // Navigate to Proporsi targeting a specific mill
  const handleNavigateToProporsi = (mill: 'TM' | 'VRM' = 'TM') => {
    setProporsiTargetMill(mill);
    setCurrentTab('proporsi');
  };

  // Update master targets (Supervisor only)
  const handleUpdateMasterTargets = (updatedTargets: MasterTargetDryMap) => {
    setMasterTargets(updatedTargets);
    saveStoredMasterTargets(updatedTargets);
  };

  // Reset to factory data
  const handleResetFactory = () => {
    const freshSession = resetFactoryData();
    const freshTargets = getStoredMasterTargets();
    setSession(freshSession);
    setMasterTargets(freshTargets);
    setCurrentTab('grid');
  };

  // 1. If not authenticated, render Login Portal (Poin 2)
  if (!auth.isLoggedIn || !auth.user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const currentUser = auth.user;
  const isSupervisor = currentUser.role === 'supervisor';

  return (
    <div className="min-h-screen bg-[#CBD5E1] flex flex-col font-sans selection:bg-[#E31E24]/20 selection:text-[#E31E24]">
      {/* Top Navigation Bar with Brand, Shifts, AI Button & Profile */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        session={session}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {/* Tab 1: INPUT DATA */}
        {currentTab === 'grid' && (
          <DataGridPage
            session={session}
            onUpdateSession={handleUpdateSession}
            onNavigateToProporsi={handleNavigateToProporsi}
          />
        )}

        {/* Tab 2: PROPORSI */}
        {currentTab === 'proporsi' && (
          <ProporsiPage
            session={session}
            masterTargets={masterTargets}
            initialMill={proporsiTargetMill}
            onUpdateSession={handleUpdateSession}
            onSwitchTab={setCurrentTab}
          />
        )}

        {/* Tab 3: INCOMING */}
        {currentTab === 'materials' && (
          <RawMaterialsPage
            session={session}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {/* Tab 4: LAPORAN WA */}
        {currentTab === 'report' && (
          <WhatsAppReportPage
            session={session}
          />
        )}

        {/* Tab 5: RIWAYAT (Poin 3) */}
        {currentTab === 'riwayat' && (
          <RiwayatPage
            onLoadArchiveToActive={handleLoadArchiveToActive}
          />
        )}

        {/* Tab 6: MASTER DATA (Supervisor only) */}
        {currentTab === 'master' && isSupervisor && (
          <MasterDataPage
            masterTargets={masterTargets}
            onUpdateMasterTargets={handleUpdateMasterTargets}
            onResetFactoryData={handleResetFactory}
          />
        )}
      </main>

      {/* Shift & Dual-Mill Switcher Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentSession={session}
        onConfirmNewShift={handleConfirmNewShift}
      />

      {/* Flexible AI Analyzer Modal (Google Gemini) */}
      <AiAnalyzerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        session={session}
        onUpdateSession={handleUpdateSession}
      />

      {/* User Profile & PIN Change Modal (Poin 2) */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Clean Compact Footer */}
      <footer className="border-t-2 border-slate-400 bg-white py-3 text-center text-xs text-slate-700">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 font-mono text-[11px]">
          <div className="font-bold text-slate-800">
            QC Process System · Grinding Plant Ciwandan
          </div>
          <div className="text-slate-500">
            PT Cemindo Gemilang Tbk · Semen Merah Putih
          </div>
        </div>
      </footer>
    </div>
  );
}

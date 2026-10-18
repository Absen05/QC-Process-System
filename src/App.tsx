import React, { useState } from 'react';
import { 
  UserRole, 
  ShiftSession, 
  MasterTargetDryMap, 
  ShiftName, 
  ProductType 
} from './types/qc';
import { 
  getStoredRole, 
  saveStoredRole, 
  getStoredActiveSession, 
  saveStoredActiveSession, 
  getStoredMasterTargets, 
  saveStoredMasterTargets, 
  startNewShiftSession, 
  resetFactoryData 
} from './services/qcStorage';

import { Navbar } from './components/qc/Navbar';
import { ShiftModal } from './components/qc/ShiftModal';
import { AiAnalyzerModal } from './components/qc/AiAnalyzerModal';
import { DataGridPage } from './components/qc/DataGridPage';
import { ProporsiPage } from './components/qc/ProporsiPage';
import { RawMaterialsPage } from './components/qc/RawMaterialsPage';
import { WhatsAppReportPage } from './components/qc/WhatsAppReportPage';
import { MasterDataPage } from './components/qc/MasterDataPage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'grid' | 'proporsi' | 'materials' | 'report' | 'master'>('grid');
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [session, setSession] = useState<ShiftSession>(() => getStoredActiveSession());
  const [masterTargets, setMasterTargets] = useState<MasterTargetDryMap>(() => getStoredMasterTargets());
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [proporsiTargetMill, setProporsiTargetMill] = useState<'TM' | 'VRM'>('TM');

  // Update session and persist
  const handleUpdateSession = (updated: ShiftSession) => {
    setSession(updated);
    saveStoredActiveSession(updated);
  };

  // Toggle user role between Analyst and Supervisor
  const handleToggleRole = () => {
    const nextRole: UserRole = userRole === 'analyst' ? 'supervisor' : 'analyst';
    setUserRole(nextRole);
    saveStoredRole(nextRole);
    if (nextRole === 'analyst' && currentTab === 'master') {
      setCurrentTab('grid');
    }
  };

  // Start new shift session from ShiftModal with Dual-Mill support
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
    const newSession = startNewShiftSession(
      shiftName,
      date,
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

  // Navigate to Proporsi targeting a specific mill
  const handleNavigateToProporsi = (mill: 'TM' | 'VRM' = 'TM') => {
    setProporsiTargetMill(mill);
    setCurrentTab('proporsi');
  };

  // Update master targets
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

  return (
    <div className="min-h-screen bg-[#E2E8F0] flex flex-col font-sans selection:bg-[#E31E24]/20 selection:text-[#E31E24]">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userRole={userRole}
        onToggleRole={handleToggleRole}
        session={session}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {currentTab === 'grid' && (
          <DataGridPage
            session={session}
            onUpdateSession={handleUpdateSession}
            onNavigateToProporsi={handleNavigateToProporsi}
          />
        )}

        {currentTab === 'proporsi' && (
          <ProporsiPage
            session={session}
            masterTargets={masterTargets}
            initialMill={proporsiTargetMill}
            onUpdateSession={handleUpdateSession}
            onSwitchTab={setCurrentTab}
          />
        )}

        {currentTab === 'materials' && (
          <RawMaterialsPage
            session={session}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {currentTab === 'report' && (
          <WhatsAppReportPage
            session={session}
          />
        )}

        {currentTab === 'master' && userRole === 'supervisor' && (
          <MasterDataPage
            masterTargets={masterTargets}
            onUpdateMasterTargets={handleUpdateMasterTargets}
            onResetFactoryData={handleResetFactory}
          />
        )}
      </main>

      {/* Shift Switcher Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentSession={session}
        onConfirmNewShift={handleConfirmNewShift}
      />

      {/* Flexible AI Analyzer Modal (Pop-up on demand) */}
      <AiAnalyzerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        session={session}
        onUpdateSession={handleUpdateSession}
      />

      {/* Clean Compact Footer */}
      <footer className="border-t border-gray-200 bg-white py-3 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 font-mono text-[11px]">
          <div>
            QC Process System · Grinding Plant Ciwandan
          </div>
          <div className="text-gray-400">
            PT Cemindo Gemilang Tbk · Semen Merah Putih
          </div>
        </div>
      </footer>
    </div>
  );
}

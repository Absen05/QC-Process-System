import React, { useState, useEffect } from 'react';
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
  saveStoredQualitySpecs,
  saveStoredCgaSettings,
  saveStoredProductList,
  switchOrStartShift, 
  resetFactoryData 
} from './services/qcStorage';
import { 
  fetchCloudSession, 
  saveCloudSession, 
  fetchCloudMasterTargets, 
  fetchCloudQualitySpecs, 
  fetchCloudCgaSettings, 
  fetchCloudProductList 
} from './services/qcApi';

import { Navbar, MainAppTab } from './components/qc/Navbar';
import { LoginPage } from './components/qc/LoginPage';
import { ProfileModal } from './components/qc/ProfileModal';
import { ShiftModal } from './components/qc/ShiftModal';
import { AiAnalyzerModal } from './components/qc/AiAnalyzerModal';
import { DataGridPage } from './components/qc/DataGridPage';
import { ProporsiPage } from './components/qc/ProporsiPage';
import { DataWfPage } from './components/qc/DataWfPage';
import { DataCpPage } from './components/qc/DataCpPage';
import { RawMaterialsPage } from './components/qc/RawMaterialsPage';
import { WhatsAppReportPage } from './components/qc/WhatsAppReportPage';
import { RiwayatPage } from './components/qc/RiwayatPage';
import { MasterDataPage } from './components/qc/MasterDataPage';
import { DashboardAnalitikPage } from './components/qc/DashboardAnalitikPage';

import { supabase } from './services/supabaseClient';

export default function App() {
  const [auth, setAuth] = useState<AuthSession>(() => getStoredAuth());
  const [currentTab, setCurrentTab] = useState<MainAppTab>(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth.isLoggedIn && storedAuth.user?.role === 'supervisor') {
      return 'master';
    }
    // Persistensi Navigasi Halaman Terakhir Analis (Poin I.1)
    try {
      const saved = localStorage.getItem('active_tab_analyst') as MainAppTab | null;
      const validAnalystTabs: MainAppTab[] = ['grid', 'proporsi', 'data_wf', 'data_cp', 'materials', 'report', 'riwayat'];
      if (saved && validAnalystTabs.includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'grid';
  });

  // Persist tab navigation for analysts (Poin I.1)
  const handleSelectTab = (tab: MainAppTab) => {
    setCurrentTab(tab);
    if (auth.user?.role !== 'supervisor') {
      try {
        localStorage.setItem('active_tab_analyst', tab);
      } catch (e) {}
    }
  };

  const [session, setSession] = useState<ShiftSession>(() => getStoredActiveSession());
  const [masterTargets, setMasterTargets] = useState<MasterTargetDryMap>(() => getStoredMasterTargets());
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [proporsiTargetMill, setProporsiTargetMill] = useState<'TM' | 'VRM'>('TM');

  // Global Master Data & Cloud Database Real-time Sync (PC & HP)
  useEffect(() => {
    // 1. Sync master data globally across all users (Admin & Analis)
    fetchCloudMasterTargets().then((targets) => {
      if (targets) {
        setMasterTargets(targets);
        saveStoredMasterTargets(targets);
      }
    });
    fetchCloudQualitySpecs().then((specs) => {
      if (specs) saveStoredQualitySpecs(specs);
    });
    fetchCloudCgaSettings().then((settings) => {
      if (settings) saveStoredCgaSettings(settings);
    });
    fetchCloudProductList().then((products) => {
      if (products) saveStoredProductList(products);
    });

    if (!auth.isLoggedIn || !auth.loginDate || !auth.loginShift) return;

    let isMounted = true;
    fetchCloudSession(auth.loginDate, auth.loginShift).then((res) => {
      if (isMounted && res.found && res.session) {
        setSession(res.session);
      }
    });

    // Supabase Realtime Listener untuk sinkronisasi seketika antar HP & PC
    const channel = supabase
      .channel('qc_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qc_sessions' },
        () => {
          fetchCloudSession(auth.loginDate, auth.loginShift).then((res) => {
            if (isMounted && res.found && res.session) {
              setSession(res.session);
            }
          });
        }
      )
      .subscribe();

    // Background polling sync setiap 10 detik sebagai backup
    const interval = setInterval(() => {
      fetchCloudSession(auth.loginDate, auth.loginShift).then((res) => {
        if (isMounted && res.found && res.session) {
          setSession((prev) => {
            if (res.session && res.session._serverUpdatedAt && res.session._serverUpdatedAt !== (prev as any)._serverUpdatedAt) {
              return res.session;
            }
            return prev;
          });
        }
      });
      // Also poll master targets in background so admin changes reflect on analyst devices immediately
      fetchCloudMasterTargets().then((targets) => {
        if (isMounted && targets) {
          setMasterTargets(targets);
          saveStoredMasterTargets(targets);
        }
      });
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [auth.isLoggedIn, auth.loginDate, auth.loginShift]);

  // Handle successful login: query cloud session first, else create with carry-over (Estafet Proporsi)
  const handleLoginSuccess = async (user: UserAccount, date: string, shift: ShiftName) => {
    const newAuth: AuthSession = {
      isLoggedIn: true,
      user,
      loginDate: date,
      loginShift: shift,
    };
    setAuth(newAuth);
    saveStoredAuth(newAuth);

    // Sync master data globally on login
    const cloudTargets = await fetchCloudMasterTargets();
    if (cloudTargets) {
      setMasterTargets(cloudTargets);
      saveStoredMasterTargets(cloudTargets);
    }
    const cloudSpecs = await fetchCloudQualitySpecs();
    if (cloudSpecs) saveStoredQualitySpecs(cloudSpecs);
    const cloudCga = await fetchCloudCgaSettings();
    if (cloudCga) saveStoredCgaSettings(cloudCga);
    const cloudProducts = await fetchCloudProductList();
    if (cloudProducts) saveStoredProductList(cloudProducts);

    if (user.role === 'supervisor') {
      setCurrentTab('master');
      const cloudRes = await fetchCloudSession(date, shift);
      if (cloudRes.session) {
        setSession(cloudRes.session);
      }
    } else {
      // Poin I.1: Buka otomatis rute/tab yang terakhir diakses oleh analis
      let targetTab: MainAppTab = 'grid';
      try {
        const saved = localStorage.getItem('active_tab_analyst') as MainAppTab | null;
        const validAnalystTabs: MainAppTab[] = ['grid', 'proporsi', 'data_wf', 'data_cp', 'materials', 'report', 'riwayat'];
        if (saved && validAnalystTabs.includes(saved)) {
          targetTab = saved;
        }
      } catch (e) {}
      setCurrentTab(targetTab);

      // Poin I.2: Inisialisasi Shift Baru Bersih dari Supabase
      // Query pengecekan ke Supabase berdasarkan { tanggal, shift }. Jika belum ada data, seluruh grid KOSONG (blank / null).
      const cloudRes = await fetchCloudSession(date, shift);
      if (cloudRes.found && cloudRes.session) {
        setSession(cloudRes.session);
        saveStoredActiveSession(cloudRes.session);
      } else {
        // Shift baru bersih: seluruh baris dan form kondisi KOSONG (blank / null), bukan sisa data lampau
        const loadedSession = switchOrStartShift(date, shift, user.name, null);
        setSession(loadedSession);
        saveCloudSession(loadedSession);
      }
    }
  };

  // Handle user logout: persist state permanently before clearing auth
  const handleLogout = () => {
    saveStoredActiveSession(session);
    saveCloudSession(session);
    logoutUser();
    setAuth({
      isLoggedIn: false,
      user: null,
      loginDate: new Date().toISOString().slice(0, 10),
      loginShift: 'SHIFT 2',
    });
    setIsProfileModalOpen(false);
  };

  // Update session and persist to storage and cloud database (Poin 2)
  const handleUpdateSession = (updated: ShiftSession) => {
    setSession(updated);
    saveStoredActiveSession(updated);
    saveCloudSession(updated);
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
    handleSelectTab('grid');
  };

  // Load an archived shift directly onto the active workspace
  const handleLoadArchiveToActive = (archivedSession: ShiftSession) => {
    setSession(archivedSession);
    saveStoredActiveSession(archivedSession);
    handleSelectTab('grid');
  };

  // Navigate to Proporsi targeting a specific mill
  const handleNavigateToProporsi = (mill: 'TM' | 'VRM' = 'TM') => {
    setProporsiTargetMill(mill);
    handleSelectTab('proporsi');
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
    handleSelectTab('grid');
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
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        session={session}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {/* Tab 1: INPUT DATA (Tabel Rutin Jam TM & VRM) */}
        {currentTab === 'grid' && (
          <DataGridPage
            session={session}
            onUpdateSession={handleUpdateSession}
            onNavigateToProporsi={handleNavigateToProporsi}
          />
        )}

        {/* Tab 2: PROPORSI (Kalkulasi Wet Base & Share CCR) */}
        {currentTab === 'proporsi' && (
          <ProporsiPage
            session={session}
            masterTargets={masterTargets}
            initialMill={proporsiTargetMill}
            onUpdateSession={handleUpdateSession}
            onSwitchTab={handleSelectTab}
          />
        )}

        {/* Tab 3: DATA WF (Clinker & Moisture Raw Material WF) */}
        {currentTab === 'data_wf' && (
          <DataWfPage
            session={session}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {/* Tab 4: DATA CP (Dual CP Sampling Produk & Silo) */}
        {currentTab === 'data_cp' && (
          <DataCpPage
            session={session}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {/* Tab 5: INCOMING (Material Masuk dengan Tombol Hapus pada Setiap Kartu) */}
        {currentTab === 'materials' && (
          <RawMaterialsPage
            session={session}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {/* Tab 6: LAPORAN WA (Format Bersih, Tanpa Ikon/Poin, Comma Decimal) */}
        {currentTab === 'report' && (
          <WhatsAppReportPage
            session={session}
          />
        )}

        {/* Tab 7: RIWAYAT (Pencarian & Arsip Shift Lampau) */}
        {currentTab === 'riwayat' && (
          <RiwayatPage
            onLoadArchiveToActive={handleLoadArchiveToActive}
          />
        )}

        {/* Tab 8: MASTER DATA (Supervisor only) */}
        {currentTab === 'master' && isSupervisor && (
          <MasterDataPage
            masterTargets={masterTargets}
            onUpdateMasterTargets={handleUpdateMasterTargets}
            onResetFactoryData={handleResetFactory}
          />
        )}

        {/* Tab 9: DASHBOARD ANALITIK & TREN MUTU (Khusus Dashboard SI) */}
        {currentTab === 'analytics' && isSupervisor && (
          <DashboardAnalitikPage />
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

      {/* User Profile & PIN Change Modal */}
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

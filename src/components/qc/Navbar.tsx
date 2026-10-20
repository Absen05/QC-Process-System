import React from 'react';
import { UserAccount, ShiftSession } from '../../types/qc';
import { 
  Table, 
  Sliders, 
  Layers, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  Sparkles, 
  Clock, 
  Calendar,
  History,
  Lock,
  Scale,
  Package
} from 'lucide-react';
import { formatIndonesianDate } from '../../utils/qcCalculations';

export type MainAppTab = 'grid' | 'proporsi' | 'data_wf' | 'data_cp' | 'materials' | 'report' | 'riwayat' | 'master';

interface NavbarProps {
  currentTab: MainAppTab;
  onSelectTab: (tab: MainAppTab) => void;
  currentUser: UserAccount;
  session: ShiftSession;
  onOpenShiftModal?: () => void;
  onOpenAiModal: () => void;
  onOpenProfileModal: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  session,
  onOpenAiModal,
  onOpenProfileModal,
  onLogout,
}) => {
  const isSupervisor = currentUser.role === 'supervisor';

  return (
    <header className="sticky top-0 z-30 bg-slate-800 border-b-2 border-slate-600 shadow-md">
      {/* Top Bar: Brand, Static Badges (Poin 5.1), AI Trigger & User Profile */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand Logo & Plant Title */}
          <div className="flex items-center gap-3 shrink-0">
            <img 
              src="/logo_semen_merah_putih.webp" 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://cms.semenmerahputih.com/storage/5187/responsive-images/Logo_Semen_Merah_Putih-1___converted_1684_489.webp";
              }}
              alt="Semen Merah Putih" 
              className="h-10 sm:h-11 w-auto object-contain"
            />
            <div className="hidden sm:block border-l-2 border-slate-600 pl-3">
              <h1 className="text-sm font-bold text-white tracking-wide leading-none uppercase">
                QC Process System
              </h1>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                Grinding Plant Ciwandan
              </p>
            </div>
          </div>

          {/* Header Bersih & Statis (Read-Only) - Sesuai Poin 5.1 */}
          {!isSupervisor ? (
            <div className="hidden md:flex items-center gap-2">
              {/* [ 🟢 VRM / TM AKTIF ] */}
              {session.tm.isRunning && (
                <div className="px-2.5 py-1.5 bg-emerald-950/80 border border-emerald-500 rounded-lg text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>TM AKTIF</span>
                </div>
              )}
              {session.vrm.isRunning && (
                <div className="px-2.5 py-1.5 bg-emerald-950/80 border border-emerald-500 rounded-lg text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>VRM AKTIF</span>
                </div>
              )}
              {!session.tm.isRunning && !session.vrm.isRunning && (
                <div className="px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-400 font-bold text-xs select-none">
                  STANDBY
                </div>
              )}

              {/* [ 🕒 SHIFT 3 (16:00 - 24:00) ] */}
              <div className="px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-2xs select-none">
                <Clock className="w-3.5 h-3.5 text-[#E31E24]" />
                <span>{session.shiftName} ({session.shiftHours})</span>
              </div>

              {/* [ 👤 AHMAD RIFAI ] */}
              <div className="px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 font-mono font-bold text-xs flex items-center gap-1.5 shadow-2xs select-none">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>{session.analystName}</span>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-950/70 border border-amber-500/80 rounded-lg text-xs text-amber-300 select-none">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="font-bold tracking-wide">SI / SUPERVISOR AUDIT (NON-SHIFT)</span>
            </div>
          )}

          {/* AI Trigger & User / Logout Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* ✨ Flexible AI Trigger Button */}
            <button
              onClick={onOpenAiModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm transition-all active:scale-95"
              title="Buka Analisa Tren Kualitas AI (Google Gemini)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Analisa AI</span>
            </button>

            {/* Mobile Statis Shift Badge */}
            {!isSupervisor && (
              <div className="md:hidden flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold bg-slate-900 border border-slate-600 text-white rounded-lg select-none">
                <Clock className="w-3 h-3 text-[#E31E24]" />
                <span>{session.shiftName}</span>
              </div>
            )}

            {/* User Profile & PIN Menu Button */}
            <button
              onClick={onOpenProfileModal}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
                isSupervisor
                  ? 'bg-[#D97706] hover:bg-amber-700 text-white border border-amber-500'
                  : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-500'
              }`}
              title="Buka Profil / Ganti PIN / Keluar"
            >
              <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center">
                {isSupervisor ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden sm:block">
                <div className="leading-tight text-[11px] font-mono">{currentUser.name}</div>
                <div className="text-[9px] text-slate-300 leading-none">Ubah PIN / Profil</div>
              </div>
            </button>

            {/* Ganti Shift / Logout Resmi (Poin 5.1: Ganti shift hanya via keluar/logout resmi) */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-200 bg-red-950/80 hover:bg-red-900 border border-red-700 rounded-lg transition-colors shadow-2xs"
                title="Keluar akun dan pilih/ganti shift lain"
              >
                <span>Ganti Shift</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Navigation Tabs Bar (Solid background & Role-Based Tabs Poin 1) */}
      <div className="border-t-2 border-slate-700 bg-slate-900">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1.5 py-1.5" aria-label="Tabs">
            {isSupervisor ? (
              /* Khusus Dashboard SI (Admin) - HANYA MASTER DATA & RIWAYAT (Poin 1) */
              <>
                <button
                  onClick={() => onSelectTab('master')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'master'
                      ? 'bg-[#D97706] text-white shadow-sm'
                      : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>MASTER DATA</span>
                </button>

                <button
                  onClick={() => onSelectTab('riwayat')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'riwayat'
                      ? 'bg-[#0284C7] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>RIWAYAT ARSIP SHIFT</span>
                </button>
              </>
            ) : (
              /* Khusus Akun Analis Shift - Akses Operasional Shift Penuh (Poin 1) */
              <>
                <button
                  onClick={() => onSelectTab('grid')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'grid'
                      ? 'bg-[#E31E24] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  <span>INPUT DATA</span>
                </button>

                <button
                  onClick={() => onSelectTab('proporsi')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'proporsi'
                      ? 'bg-[#E31E24] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>PROPORSI</span>
                </button>

                {/* Panel Baru: DATA WF */}
                <button
                  onClick={() => onSelectTab('data_wf')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'data_wf'
                      ? 'bg-[#0284C7] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>DATA WF</span>
                </button>

                {/* Panel Baru: DATA CP */}
                <button
                  onClick={() => onSelectTab('data_cp')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'data_cp'
                      ? 'bg-[#0284C7] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>DATA CP</span>
                </button>

                <button
                  onClick={() => onSelectTab('materials')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'materials'
                      ? 'bg-[#E31E24] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>INCOMING</span>
                </button>

                <button
                  onClick={() => onSelectTab('report')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'report'
                      ? 'bg-[#16A34A] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>LAPORAN WA</span>
                </button>

                {/* Tab: RIWAYAT untuk Analis Shift */}
                <button
                  onClick={() => onSelectTab('riwayat')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                    currentTab === 'riwayat'
                      ? 'bg-[#0284C7] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>RIWAYAT</span>
                </button>
              </>
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 font-mono pr-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatIndonesianDate(session.date)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

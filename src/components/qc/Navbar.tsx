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
  Lock
} from 'lucide-react';
import { formatIndonesianDate } from '../../utils/qcCalculations';

interface NavbarProps {
  currentTab: 'grid' | 'proporsi' | 'materials' | 'report' | 'riwayat' | 'master';
  onSelectTab: (tab: 'grid' | 'proporsi' | 'materials' | 'report' | 'riwayat' | 'master') => void;
  currentUser: UserAccount;
  session: ShiftSession;
  onOpenShiftModal: () => void;
  onOpenAiModal: () => void;
  onOpenProfileModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  session,
  onOpenShiftModal,
  onOpenAiModal,
  onOpenProfileModal,
}) => {
  const isSupervisor = currentUser.role === 'supervisor';

  return (
    <header className="sticky top-0 z-30 bg-slate-800 border-b-2 border-slate-600 shadow-md">
      {/* Top Bar: Brand, Dual-Mill Context, AI Trigger & User Profile */}
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

          {/* Active Shift & Dual-Mill Status (Clickable to switch shift) */}
          <div 
            onClick={onOpenShiftModal}
            className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/90 hover:bg-black border border-slate-600 rounded-lg cursor-pointer transition-colors text-xs text-white shadow-xs"
            title="Klik untuk mengubah shift atau konfigurasi Mill"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-[#E31E24]" />
              <span className="font-mono">{session.shiftName}</span>
              <span className="text-slate-400 font-normal">({session.shiftHours})</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                session.tm.isRunning ? 'bg-green-700 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                TM {session.tm.isRunning ? 'ON' : 'OFF'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                session.vrm.isRunning ? 'bg-green-700 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                VRM {session.vrm.isRunning ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Flexible AI Action Button & User Profile */}
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

            {/* Quick Shift Switch for mobile */}
            <button
              onClick={onOpenShiftModal}
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-700 text-white rounded-lg"
            >
              <Clock className="w-3.5 h-3.5 text-[#E31E24]" />
              <span>{session.shiftName}</span>
            </button>

            {/* User Profile & PIN Menu Button (Poin 2) */}
            <button
              onClick={onOpenProfileModal}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
                isSupervisor
                  ? 'bg-[#D97706] hover:bg-amber-700 text-white border border-amber-500'
                  : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-500'
              }`}
              title="Klik untuk membuka profil dan mengganti PIN 6 digit"
            >
              <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center">
                {isSupervisor ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden sm:block">
                <div className="leading-tight text-[11px] font-mono">{currentUser.name}</div>
                <div className="text-[9px] text-slate-300 leading-none">Ubah PIN / Profil</div>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Navigation Tabs Bar (Solid background & buttons) */}
      <div className="border-t-2 border-slate-700 bg-slate-900">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1.5 py-1.5" aria-label="Tabs">
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

            {/* New Tab: RIWAYAT (Poin 3) */}
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

            {isSupervisor && (
              <button
                onClick={() => onSelectTab('master')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                  currentTab === 'master'
                    ? 'bg-[#D97706] text-white shadow-sm'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>MASTER DATA</span>
              </button>
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

import React from 'react';
import { UserRole, ShiftSession } from '../../types/qc';
import { 
  Table, 
  Sliders, 
  Layers, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  Sparkles, 
  Clock, 
  Calendar 
} from 'lucide-react';
import { formatIndonesianDate } from '../../utils/qcCalculations';

interface NavbarProps {
  currentTab: 'grid' | 'proporsi' | 'materials' | 'report' | 'master';
  onSelectTab: (tab: 'grid' | 'proporsi' | 'materials' | 'report' | 'master') => void;
  userRole: UserRole;
  onToggleRole: () => void;
  session: ShiftSession;
  onOpenShiftModal: () => void;
  onOpenAiModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  onToggleRole,
  session,
  onOpenShiftModal,
  onOpenAiModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      {/* Top Bar: Brand, Dual-Mill Context, AI Trigger & Role Switcher */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand Logo & Plant Title */}
          <div className="flex items-center gap-3 shrink-0">
            <img 
              src="https://cms.semenmerahputih.com/storage/5187/responsive-images/Logo_Semen_Merah_Putih-1___converted_1684_489.webp" 
              alt="Semen Merah Putih" 
              referrerPolicy="no-referrer"
              className="h-10 sm:h-11 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-gray-200 pl-3">
              <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
                QC Process System
              </h1>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Grinding Plant Ciwandan
              </p>
            </div>
          </div>

          {/* Active Shift & Dual-Mill Status (Clickable to switch shift) */}
          <div 
            onClick={onOpenShiftModal}
            className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg cursor-pointer transition-colors text-xs"
            title="Klik untuk mengubah shift atau konfigurasi Mill"
          >
            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Clock className="w-3.5 h-3.5 text-[#E31E24]" />
              <span className="font-mono">{session.shiftName}</span>
              <span className="text-gray-400 font-normal">({session.shiftHours})</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                session.tm.isRunning ? 'bg-amber-100 text-amber-900' : 'bg-gray-200 text-gray-600'
              }`}>
                TM {session.tm.isRunning ? 'Running' : 'Off'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                session.vrm.isRunning ? 'bg-sky-100 text-sky-900' : 'bg-gray-200 text-gray-600'
              }`}>
                VRM {session.vrm.isRunning ? 'Running' : 'Off'}
              </span>
            </div>
          </div>

          {/* Flexible AI Action Button & Role Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* ✨ Flexible AI Trigger Button */}
            <button
              onClick={onOpenAiModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#0284C7] to-indigo-600 hover:from-sky-700 hover:to-indigo-700 rounded-lg shadow-2xs transition-all active:scale-95"
              title="Buka Analisa Tren Kualitas AI (Google Gemini)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Analisa AI</span>
            </button>

            {/* Quick Shift Switch for mobile */}
            <button
              onClick={onOpenShiftModal}
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
            >
              <Clock className="w-3.5 h-3.5 text-[#E31E24]" />
              <span>{session.shiftName}</span>
            </button>

            {/* Role Switcher */}
            <button
              onClick={onToggleRole}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                userRole === 'supervisor'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Ganti Peran Pengguna"
            >
              {userRole === 'supervisor' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Supervisor</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span className="hidden sm:inline">Analis QC</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Navigation Tabs Bar with simplified titles */}
      <div className="border-t border-gray-200 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1 py-1" aria-label="Tabs">
            <button
              onClick={() => onSelectTab('grid')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-md whitespace-nowrap transition-colors ${
                currentTab === 'grid'
                  ? 'bg-[#E31E24] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>INPUT DATA</span>
            </button>

            <button
              onClick={() => onSelectTab('proporsi')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-md whitespace-nowrap transition-colors ${
                currentTab === 'proporsi'
                  ? 'bg-[#E31E24] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>PROPORSI</span>
            </button>

            <button
              onClick={() => onSelectTab('materials')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-md whitespace-nowrap transition-colors ${
                currentTab === 'materials'
                  ? 'bg-[#E31E24] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>INCOMING</span>
            </button>

            <button
              onClick={() => onSelectTab('report')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-md whitespace-nowrap transition-colors ${
                currentTab === 'report'
                  ? 'bg-[#16A34A] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>LAPORAN WA</span>
            </button>

            {userRole === 'supervisor' && (
              <button
                onClick={() => onSelectTab('master')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-md whitespace-nowrap transition-colors ${
                  currentTab === 'master'
                    ? 'bg-amber-700 text-white'
                    : 'text-amber-800 hover:text-amber-900 hover:bg-amber-100/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>MASTER DATA</span>
              </button>
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 font-mono pr-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>{formatIndonesianDate(session.date)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

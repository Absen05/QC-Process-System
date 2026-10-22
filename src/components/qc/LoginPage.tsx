import React, { useState } from 'react';
import { ShiftName, UserAccount } from '../../types/qc';
import { SHIFT_DEFINITIONS, isShiftAllowedNow, getAutoRecommendedShift } from '../../utils/qcCalculations';
import { getStoredUsers, getStoredActiveSession } from '../../services/qcStorage';
import { ShieldCheck, User, Lock, Calendar, Clock, LogIn, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount, date: string, shift: ShiftName) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const currentActive = getStoredActiveSession();
  const autoShift = getAutoRecommendedShift();
  const [selectedRole, setSelectedRole] = useState<'analyst' | 'supervisor'>('analyst');
  const [selectedUserName, setSelectedUserName] = useState<string>('AHMAD RIFAI');
  const [pin, setPin] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => currentActive?.date || new Date().toISOString().slice(0, 10));
  const [selectedShift, setSelectedShift] = useState<ShiftName>(() => {
    if (currentActive?.shiftName && isShiftAllowedNow(currentActive.shiftName)) {
      return currentActive.shiftName;
    }
    return autoShift;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const users = getStoredUsers();
  const analystUsers = users.filter(u => u.role === 'analyst');

  const handleRoleChange = (role: 'analyst' | 'supervisor') => {
    setSelectedRole(role);
    setErrorMessage(null);
    setPin('');
    if (role === 'supervisor') {
      setSelectedUserName('SI (ADMIN)');
    } else {
      setSelectedUserName(analystUsers[0]?.name || 'AHMAD RIFAI');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (pin.length !== 6) {
      setErrorMessage('PIN harus terdiri dari tepat 6 digit angka.');
      return;
    }

    const targetUser = users.find(u => u.name.toUpperCase() === selectedUserName.toUpperCase());
    if (!targetUser) {
      setErrorMessage('Pengguna tidak ditemukan.');
      return;
    }

    if (targetUser.pin !== pin) {
      setErrorMessage('PIN yang Anda masukkan salah. Hubungi SI jika lupa PIN.');
      return;
    }

    // Poin 4: Restriksi login shift berdasarkan jam berjalan
    if (selectedRole === 'analyst' && !isShiftAllowedNow(selectedShift)) {
      setErrorMessage('Waktu kerja belum memasuki periode shift ini.');
      return;
    }

    // Success login
    onLoginSuccess(targetUser, selectedDate, selectedShift);
  };

  return (
    <div className="min-h-screen bg-[#CBD5E1] flex flex-col justify-center items-center p-4">
      
      {/* Brand & Title Card */}
      <div className="w-full max-w-md bg-white border-2 border-slate-500 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header with Logo */}
        <div className="bg-slate-800 p-6 text-center border-b-2 border-slate-600">
          <img 
            src="/logo_semen_merah_putih.webp" 
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "https://cms.semenmerahputih.com/storage/5187/responsive-images/Logo_Semen_Merah_Putih-1___converted_1684_489.webp";
            }}
            alt="Semen Merah Putih" 
            className="h-12 w-auto mx-auto object-contain mb-2"
          />
          <h1 className="text-base font-bold text-white tracking-wide uppercase">
            QC Process Management System
          </h1>
          <p className="text-xs text-slate-300 font-mono mt-0.5">
            Grinding Plant Ciwandan · PT Cemindo Gemilang Tbk
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleLogin} className="p-6 space-y-4 text-xs font-sans">
          
          {/* Role Picker (Solid Buttons) */}
          <div>
            <label className="block text-slate-800 font-bold mb-1.5 uppercase text-[11px]">
              Pilih Role Pengguna
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange('analyst')}
                className={`py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedRole === 'analyst'
                    ? 'bg-[#E31E24] text-white shadow-md border-2 border-red-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-400'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Analis Shift</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('supervisor')}
                className={`py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedRole === 'supervisor'
                    ? 'bg-[#D97706] text-white shadow-md border-2 border-amber-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>SI (Admin)</span>
              </button>
            </div>
          </div>

          {/* User Name Picker */}
          <div>
            <label className="block text-slate-800 font-bold mb-1 text-[11px]">
              Nama Pengguna
            </label>
            {selectedRole === 'analyst' ? (
              <select
                value={selectedUserName}
                onChange={(e) => setSelectedUserName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-400 rounded-lg text-slate-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-slate-600"
              >
                {analystUsers.map(u => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                readOnly
                value="SI (ADMIN / SUPERVISOR)"
                className="w-full p-2.5 bg-slate-100 border-2 border-slate-400 rounded-lg text-slate-900 font-bold text-xs cursor-not-allowed"
              />
            )}
          </div>

          {/* 6-Digit PIN */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-800 font-bold text-[11px]">
                PIN Keamanan (6 Digit)
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                maxLength={6}
                inputMode="numeric"
                required
                placeholder="Masukkan 6 digit PIN..."
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono tracking-widest text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>

          {/* Shift & Date Selection - Khusus Analis Shift (Poin 2: SI tidak terikat shift) */}
          {selectedRole === 'analyst' ? (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tanggal Shift</span>
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono text-xs text-slate-900 font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Shift Kerja</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                    Rekomendasi: {autoShift}
                  </span>
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value as ShiftName)}
                  className="w-full p-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono text-xs text-slate-900 font-bold focus:bg-white focus:outline-none"
                >
                  {Object.keys(SHIFT_DEFINITIONS).map(s => {
                    const shiftName = s as ShiftName;
                    const allowed = isShiftAllowedNow(shiftName);
                    return (
                      <option 
                        key={s} 
                        value={s}
                        disabled={!allowed}
                        className={!allowed ? 'text-slate-400 bg-slate-100' : 'text-slate-900 font-bold'}
                      >
                        {s} ({SHIFT_DEFINITIONS[shiftName].timeRange}) {!allowed ? '— [Di luar jam operasional]' : '— [Aktif]'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Akun SI (Admin) tidak terikat shift harian. Anda akan langsung diarahkan ke Dashboard Pengelolaan Master Data & Riwayat.</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-100 border border-red-400 rounded-lg text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Solid Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#E31E24] hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-sm mt-3"
          >
            <LogIn className="w-4 h-4" />
            <span>MASUK KE SISTEM QC</span>
          </button>

          <p className="text-[11px] text-center text-slate-500 pt-1">
            Lupa PIN? Hubungi akun SI (Admin) untuk mereset PIN analis.
          </p>
        </form>

      </div>
    </div>
  );
};

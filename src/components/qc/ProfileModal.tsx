import React, { useState } from 'react';
import { UserAccount } from '../../types/qc';
import { updateUserPin } from '../../services/qcStorage';
import { X, Lock, Check, AlertCircle, LogOut, ShieldCheck, User } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (oldPin !== currentUser.pin) {
      setStatusMessage({ type: 'error', text: 'PIN lama yang Anda masukkan salah.' });
      return;
    }

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setStatusMessage({ type: 'error', text: 'PIN baru harus terdiri dari tepat 6 digit angka.' });
      return;
    }

    if (newPin !== confirmPin) {
      setStatusMessage({ type: 'error', text: 'Konfirmasi PIN baru tidak cocok.' });
      return;
    }

    const success = updateUserPin(currentUser.name, newPin);
    if (success) {
      currentUser.pin = newPin;
      setStatusMessage({ type: 'success', text: '✅ PIN 6 digit berhasil diperbarui dan tersimpan!' });
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
    } else {
      setStatusMessage({ type: 'error', text: 'Gagal memperbarui PIN.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800 border-b-2 border-slate-600 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E31E24] flex items-center justify-center font-bold">
              {currentUser.role === 'supervisor' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold">{currentUser.name}</h3>
              <p className="text-[11px] text-slate-300 font-mono">
                {currentUser.role === 'supervisor' ? 'SI (Admin / QC Supervisor)' : 'Analis Shift QC'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs font-sans">
          
          {/* User Info Card */}
          <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block">Status Akun</span>
              <span className="font-bold text-slate-900 font-mono">Aktif / Terautentikasi</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block text-right">Role</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                currentUser.role === 'supervisor' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
              }`}>
                {currentUser.role === 'supervisor' ? 'SUPERVISOR' : 'ANALIS'}
              </span>
            </div>
          </div>

          {/* Form Ubah PIN */}
          <form onSubmit={handleUpdatePin} className="space-y-3 pt-1">
            <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Ganti PIN Keamanan (6 Digit)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                PIN Saat Ini
              </label>
              <input
                type="password"
                maxLength={6}
                inputMode="numeric"
                required
                placeholder="6 digit PIN lama..."
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  PIN Baru (6 Digit)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  required
                  placeholder="6 digit baru..."
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  Konfirmasi PIN Baru
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  required
                  placeholder="Ulangi 6 digit..."
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {statusMessage && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === 'success' 
                  ? 'bg-green-100 text-green-900 border border-green-300' 
                  : 'bg-red-100 text-red-900 border border-red-300'
              }`}>
                {statusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 mt-2"
            >
              <Check className="w-4 h-4" />
              <span>Simpan PIN Baru</span>
            </button>
          </form>

          {/* Logout Section */}
          <div className="pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2 px-3 bg-[#E31E24] hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar (Logout)</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

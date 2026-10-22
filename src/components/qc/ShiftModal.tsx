import React, { useState } from 'react';
import { ShiftName, ProductType, ShiftSession, DEFAULT_SILO_OPTIONS } from '../../types/qc';
import { X, CheckCircle, Factory, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { getStoredProductList } from '../../services/qcStorage';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: ShiftSession;
  onConfirmNewShift: (
    shiftName: ShiftName,
    date: string,
    analystName: string,
    tmRunning: boolean,
    tmProduct: ProductType,
    tmSilo: string,
    vrmRunning: boolean,
    vrmProduct: ProductType,
    vrmSilo: string
  ) => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onConfirmNewShift,
}) => {
  const [selectedShift, setSelectedShift] = useState<ShiftName>(currentSession.shiftName);
  const [selectedDate, setSelectedDate] = useState<string>(currentSession.date);
  const [analystName, setAnalystName] = useState<string>(currentSession.analystName);

  // Dual-Mill configuration
  const [tmRunning, setTmRunning] = useState<boolean>(currentSession.tm.isRunning);
  const [tmProduct, setTmProduct] = useState<ProductType>(currentSession.tm.productType);
  const [tmSilo, setTmSilo] = useState<string>(currentSession.tm.siloName);

  const [vrmRunning, setVrmRunning] = useState<boolean>(currentSession.vrm.isRunning);
  const [vrmProduct, setVrmProduct] = useState<ProductType>(currentSession.vrm.productType);
  const [vrmSilo, setVrmSilo] = useState<string>(currentSession.vrm.siloName);

  const productList = getStoredProductList();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmNewShift(
      selectedShift,
      selectedDate,
      analystName,
      tmRunning,
      tmProduct,
      tmSilo,
      vrmRunning,
      vrmProduct,
      vrmSilo
    );
    onClose();
  };

  const shiftOptions: { name: ShiftName; label: string; range: string; category: string }[] = [
    { name: 'SHIFT 1', label: 'Shift 1', range: '00:00 - 08:00', category: 'Normal (8 Jam)' },
    { name: 'SHIFT 2', label: 'Shift 2', range: '08:00 - 16:00', category: 'Normal (8 Jam)' },
    { name: 'SHIFT 3', label: 'Shift 3', range: '16:00 - 24:00', category: 'Normal (8 Jam)' },
    { name: 'AM 1', label: 'AM 1', range: '08:00 - 20:00', category: 'Lembur V1 (12 Jam)' },
    { name: 'PM 1', label: 'PM 1', range: '20:00 - 08:00', category: 'Lembur V1 (12 Jam)' },
    { name: 'AM 2', label: 'AM 2', range: '08:00 - 18:00', category: 'Lembur V2 (10 Jam)' },
    { name: 'PM 2', label: 'PM 2', range: '22:00 - 08:00', category: 'Lembur V2 (10 Jam)' },
  ];

  const isChangingShift = selectedDate !== currentSession.date || selectedShift !== currentSession.shiftName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-800 px-5 py-4 border-b-2 border-slate-600 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <img 
              src="/logo_semen_merah_putih.webp" 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://cms.semenmerahputih.com/storage/5187/responsive-images/Logo_Semen_Merah_Putih-1___converted_1684_489.webp";
              }}
              alt="Semen Merah Putih" 
              className="h-10 w-auto object-contain"
            />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide">
                Konfigurasi Shift & Dual-Mill
              </h2>
              <p className="text-[11px] text-slate-300 font-mono">
                Grinding Plant Ciwandan
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice for auto-reset */}
        {isChangingShift && (
          <div className="p-3 bg-amber-50 border-b-2 border-amber-300 text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Perhatian:</strong> Pergantian shift akan otomatis mengarsipkan data shift saat ini, dan membuka lembar kerja baru yang bersih (reset).
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          
          {/* Shift Schedule */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Jadwal Shift Kerja
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {shiftOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.name}
                  onClick={() => setSelectedShift(opt.name)}
                  className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                    selectedShift === opt.name
                      ? 'border-[#E31E24] bg-red-50 text-slate-900 font-bold shadow-xs'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-900 font-mono text-xs">
                    {opt.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {opt.range}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Analyst */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Tanggal</span>
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Nama Analis Shift</span>
              </label>
              <input
                type="text"
                required
                value={analystName}
                onChange={(e) => setAnalystName(e.target.value)}
                placeholder="Nama Analis..."
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Dual-Mill Setup (TM & VRM) */}
          <div className="pt-2 border-t-2 border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Konfigurasi Operasi Dual-Mill
            </span>

            {/* Tube Mill (TM) */}
            <div className="p-3 bg-slate-100 border-2 border-slate-400 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Factory className="w-4 h-4 text-amber-600" />
                  <span>Tube Mill (TM)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTmRunning(!tmRunning)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    tmRunning ? 'bg-[#16A34A] text-white' : 'bg-[#334155] text-white'
                  }`}
                >
                  {tmRunning ? 'RUNNING' : 'OFF / STANDBY'}
                </button>
              </div>

              {tmRunning && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Produk TM</label>
                    <select
                      value={tmProduct}
                      onChange={(e) => setTmProduct(e.target.value as ProductType)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-bold text-slate-900 focus:outline-none"
                    >
                      {productList.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Silo TM</label>
                    <select
                      value={tmSilo}
                      onChange={(e) => setTmSilo(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-bold text-slate-900 focus:outline-none"
                    >
                      {DEFAULT_SILO_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Roller Mill (VRM) */}
            <div className="p-3 bg-slate-100 border-2 border-slate-400 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Factory className="w-4 h-4 text-[#0284C7]" />
                  <span>Vertical Roller Mill (VRM)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVrmRunning(!vrmRunning)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    vrmRunning ? 'bg-[#16A34A] text-white' : 'bg-[#334155] text-white'
                  }`}
                >
                  {vrmRunning ? 'RUNNING' : 'OFF / STANDBY'}
                </button>
              </div>

              {vrmRunning && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Produk VRM</label>
                    <select
                      value={vrmProduct}
                      onChange={(e) => setVrmProduct(e.target.value as ProductType)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-bold text-slate-900 focus:outline-none"
                    >
                      {productList.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Silo VRM</label>
                    <select
                      value={vrmSilo}
                      onChange={(e) => setVrmSilo(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-bold text-slate-900 focus:outline-none"
                    >
                      {DEFAULT_SILO_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Solid Actions */}
          <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-white bg-[#334155] hover:bg-slate-800 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Simpan & Terapkan Shift</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

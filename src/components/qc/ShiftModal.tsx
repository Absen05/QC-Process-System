import React, { useState } from 'react';
import { ShiftName, ProductType, ShiftSession } from '../../types/qc';
import { X, CheckCircle, Factory } from 'lucide-react';

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

  const productOptions: ProductType[] = [
    'PCC Plus FA',
    'PCC NON FA',
    'PCC WS',
    'SPK',
    'OPC G',
    'OPC P',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border-1.5 border-slate-300 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-white px-5 py-4 border-b border-slate-300 flex items-center justify-between">
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
              <h2 className="text-sm font-bold text-gray-900">
                Konfigurasi Shift & Dual-Mill
              </h2>
              <p className="text-[11px] text-gray-500 font-mono">
                Grinding Plant Ciwandan
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Shift Schedule */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Jadwal Shift Aktif
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {shiftOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.name}
                  onClick={() => setSelectedShift(opt.name)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedShift === opt.name
                      ? 'border-[#E31E24] bg-red-50/70 ring-1 ring-[#E31E24]'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="font-bold text-gray-900 font-mono">
                    {opt.name}
                  </div>
                  <div className="text-[11px] text-gray-600 font-mono">
                    {opt.range}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Analyst Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#E31E24]"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">Nama Analis QC</label>
              <input
                type="text"
                value={analystName}
                onChange={(e) => setAnalystName(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#E31E24]"
              />
            </div>
          </div>

          {/* Dual-Mill Running Configuration (TM Mill 1 first, VRM Mill 2 second) */}
          <div className="border-t border-gray-200 pt-3 space-y-3">
            <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Status Operasi Dual-Mill (Bisa Jalan Berbarengan)
            </span>

            {/* Mill 1: TM */}
            <div className={`p-3 rounded-lg border transition-colors ${tmRunning ? 'bg-amber-50/40 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={tmRunning}
                    onChange={(e) => setTmRunning(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-gray-300"
                  />
                  <span>Mill 1: Tube Mill (TM) - {tmRunning ? 'Aktif Running' : 'Standby'}</span>
                </label>
              </div>

              {tmRunning && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Produk TM</label>
                    <select
                      value={tmProduct}
                      onChange={(e) => setTmProduct(e.target.value as ProductType)}
                      className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none"
                    >
                      {productOptions.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Silo TM</label>
                    <input
                      type="text"
                      value={tmSilo}
                      onChange={(e) => setTmSilo(e.target.value)}
                      placeholder="SILO 5"
                      className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mill 2: VRM */}
            <div className={`p-3 rounded-lg border transition-colors ${vrmRunning ? 'bg-sky-50/40 border-sky-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={vrmRunning}
                    onChange={(e) => setVrmRunning(e.target.checked)}
                    className="w-4 h-4 text-[#0284C7] rounded border-gray-300"
                  />
                  <span>Mill 2: Vertical Roller Mill (VRM) - {vrmRunning ? 'Aktif Running' : 'Standby'}</span>
                </label>
              </div>

              {vrmRunning && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Produk VRM</label>
                    <select
                      value={vrmProduct}
                      onChange={(e) => setVrmProduct(e.target.value as ProductType)}
                      className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none"
                    >
                      {productOptions.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Silo VRM</label>
                    <input
                      type="text"
                      value={vrmSilo}
                      onChange={(e) => setVrmSilo(e.target.value)}
                      placeholder="SILO 4"
                      className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Simpan & Buka Shift</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

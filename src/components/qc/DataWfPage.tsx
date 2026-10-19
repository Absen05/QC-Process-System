import React, { useState } from 'react';
import { ShiftSession } from '../../types/qc';
import { Scale, Droplets, Check, Info } from 'lucide-react';

interface DataWfPageProps {
  session: ShiftSession;
  onUpdateSession: (updated: ShiftSession) => void;
}

export const DataWfPage: React.FC<DataWfPageProps> = ({
  session,
  onUpdateSession,
}) => {
  const [saveIndicator, setSaveIndicator] = useState(false);

  const showSaveSuccess = () => {
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const handleClinkerChange = (field: 'c3s' | 'fcao' | 'c3a' | 'h2o', val: string) => {
    const num = val === '' ? null : parseFloat(val);
    onUpdateSession({
      ...session,
      clinkerWf: {
        ...session.clinkerWf,
        [field]: isNaN(num as number) ? null : num,
      },
    });
    showSaveSuccess();
  };

  const handleMoistureChange = (field: 'gypsum' | 'limestone' | 'trass' | 'bbKonsumsi', val: string) => {
    const num = val === '' ? null : parseFloat(val);
    onUpdateSession({
      ...session,
      moistureWf: {
        ...session.moistureWf,
        [field]: isNaN(num as number) ? null : num,
      },
    });
    showSaveSuccess();
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Header Card */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#0284C7] text-white font-bold text-xs rounded uppercase tracking-wide">
              PANEL INPUT
            </span>
            <h2 className="text-base font-bold text-slate-900 uppercase">
              DATA WF (CLINKER & MOISTURE RAW MATERIAL)
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Shift: <strong>{session.shiftName}</strong> | Tanggal: <strong>{session.date}</strong> | Analis: <strong>{session.analystName}</strong>
          </p>
        </div>

        {saveIndicator && (
          <div className="px-3 py-1.5 bg-green-100 border border-green-400 text-green-900 font-bold text-xs rounded-lg flex items-center gap-1.5 animate-pulse">
            <Check className="w-4 h-4 text-green-700" />
            <span>Tersimpan Otomatis!</span>
          </div>
        )}
      </div>

      {/* Grid: 2 Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Clinker WF */}
        <div className="bg-white border-2 border-slate-500 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-[#E31E24] flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Clinker WF
                </h3>
                <p className="text-[11px] text-slate-500">
                  Parameter analisa mineralogi & free-lime clinker
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded">
              Satuan: %
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                C3S (%)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="misal: 59.92"
                value={session.clinkerWf.c3s !== null && session.clinkerWf.c3s !== undefined ? session.clinkerWf.c3s : ''}
                onChange={(e) => handleClinkerChange('c3s', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                F-CaO (Free Lime) (%)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="misal: 0.70"
                value={session.clinkerWf.fcao !== null && session.clinkerWf.fcao !== undefined ? session.clinkerWf.fcao : ''}
                onChange={(e) => handleClinkerChange('fcao', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                C3A (%)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="misal: 7.89"
                value={session.clinkerWf.c3a !== null && session.clinkerWf.c3a !== undefined ? session.clinkerWf.c3a : ''}
                onChange={(e) => handleClinkerChange('c3a', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                H2O (%)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="kosongkan jika **"
                value={session.clinkerWf.h2o !== null && session.clinkerWf.h2o !== undefined ? session.clinkerWf.h2o : ''}
                onChange={(e) => handleClinkerChange('h2o', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-[11px] text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <span>
              Nilai yang dikosongkan akan otomatis dicetak sebagai tanda bintang <strong>**%</strong> di laporan WhatsApp.
            </span>
          </div>
        </div>

        {/* Card 2: Moisture Raw Material WF */}
        <div className="bg-white border-2 border-slate-500 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0284C7] flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Moisture Raw Material WF
                </h3>
                <p className="text-[11px] text-slate-500">
                  Kadar air bahan baku umpan penggilingan
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded">
              Satuan: %
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Gypsum (%)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="misal: 3.2"
                value={session.moistureWf.gypsum !== null && session.moistureWf.gypsum !== undefined ? session.moistureWf.gypsum : ''}
                onChange={(e) => handleMoistureChange('gypsum', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Limestone (%)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="misal: 8.0"
                value={session.moistureWf.limestone !== null && session.moistureWf.limestone !== undefined ? session.moistureWf.limestone : ''}
                onChange={(e) => handleMoistureChange('limestone', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Trass (%)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="misal: 10.8"
                value={session.moistureWf.trass !== null && session.moistureWf.trass !== undefined ? session.moistureWf.trass : ''}
                onChange={(e) => handleMoistureChange('trass', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                BB Konsumsi (%)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="misal: 19.2"
                value={session.moistureWf.bbKonsumsi !== null && session.moistureWf.bbKonsumsi !== undefined ? session.moistureWf.bbKonsumsi : ''}
                onChange={(e) => handleMoistureChange('bbKonsumsi', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-[11px] text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <span>
              Kadar air ini otomatis disinkronkan ke laporan WhatsApp dengan penulisan desimal koma (contoh: 3,2%).
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

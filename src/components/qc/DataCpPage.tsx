import React, { useState, useEffect } from 'react';
import { ShiftSession, CpProductSample } from '../../types/qc';
import { getStoredProductList } from '../../services/qcStorage';
import { Package, Check, Layers, AlertCircle } from 'lucide-react';

interface DataCpPageProps {
  session: ShiftSession;
  onUpdateSession: (updated: ShiftSession) => void;
}

export const DataCpPage: React.FC<DataCpPageProps> = ({
  session,
  onUpdateSession,
}) => {
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const productList = getStoredProductList();

  useEffect(() => {
    setRawValues({});
  }, [session.date, session.shift]);

  const showSaveSuccess = () => {
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const cpProducts: [CpProductSample, CpProductSample] = session.cpProducts || [
    {
      id: 'cp_1',
      label: 'CP Produk 1',
      productType: session.tm.productType || 'PCC Plus FA',
      siloName: session.cpShiftSilo?.siloName || 'SILO 4',
      blaine: session.cpShiftSilo?.blaine ?? null,
      r45: session.cpShiftSilo?.r45 ?? null,
      h2o: session.cpShiftSilo?.h2o ?? null,
      so3: session.cpShiftSilo?.so3 ?? null,
    },
    {
      id: 'cp_2',
      label: 'CP Produk 2',
      productType: session.vrm.productType || 'OPC G',
      siloName: 'SILO 2',
      blaine: null,
      r45: null,
      h2o: null,
      so3: null,
    },
  ];

  const getCpDisplay = (index: 0 | 1, field: 'blaine' | 'r45' | 'h2o' | 'so3'): string => {
    const key = `cp_${index}_${field}`;
    if (rawValues[key] !== undefined) return rawValues[key];
    const v = cpProducts[index][field];
    return v !== null && v !== undefined ? String(v) : '';
  };

  const handleUpdateCp = (index: 0 | 1, field: keyof CpProductSample, val: any) => {
    const nextCp: [CpProductSample, CpProductSample] = [
      { ...cpProducts[0] },
      { ...cpProducts[1] },
    ];

    if (field === 'productType' || field === 'siloName' || field === 'label') {
      (nextCp[index] as any)[field] = typeof val === 'string' ? val.toUpperCase() : val;
    } else {
      const strVal = String(val);
      if (strVal !== '' && !/^\d*[.,]?\d*$/.test(strVal)) return;
      setRawValues(prev => ({ ...prev, [`cp_${index}_${field}`]: strVal }));
      const cleanVal = strVal.replace(',', '.');
      const num = (cleanVal === '' || cleanVal === '.') ? null : parseFloat(cleanVal);
      (nextCp[index] as any)[field] = isNaN(num as number) ? null : num;
    }

    // Sync legacy cpShiftSilo with CP 1 for backward compat
    const updatedSession: ShiftSession = {
      ...session,
      cpProducts: nextCp,
      cpShiftSilo: {
        siloName: nextCp[0].siloName,
        blaine: nextCp[0].blaine,
        r45: nextCp[0].r45,
        h2o: nextCp[0].h2o,
        so3: nextCp[0].so3,
      },
    };

    onUpdateSession(updatedSession);
    showSaveSuccess();
  };

  const handleClearCp = (index: 0 | 1) => {
    setRawValues(prev => {
      const next = { ...prev };
      delete next[`cp_${index}_blaine`];
      delete next[`cp_${index}_r45`];
      delete next[`cp_${index}_h2o`];
      delete next[`cp_${index}_so3`];
      return next;
    });
    const nextCp: [CpProductSample, CpProductSample] = [
      { ...cpProducts[0] },
      { ...cpProducts[1] },
    ];
    nextCp[index] = {
      ...nextCp[index],
      blaine: null,
      r45: null,
      h2o: null,
      so3: null,
    };
    onUpdateSession({
      ...session,
      cpProducts: nextCp,
    });
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
              DATA CP (CEMENT PRODUCT) SHIFT
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Shift: <strong>{session.shiftName}</strong> | Mendukung hingga 2 sampling CP produk/silo berbeda dalam 1 shift.
          </p>
        </div>

        {saveIndicator && (
          <div className="px-3 py-1.5 bg-green-100 border border-green-400 text-green-900 font-bold text-xs rounded-lg flex items-center gap-1.5 animate-pulse">
            <Check className="w-4 h-4 text-green-700" />
            <span>Tersimpan Otomatis!</span>
          </div>
        )}
      </div>

      {/* Grid: 2 Separate Cards for CP Product 1 & CP Product 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((idx) => {
          const cp = cpProducts[idx as 0 | 1];
          const isCp1 = idx === 0;

          return (
            <div 
              key={cp.id}
              className="bg-white border-2 border-slate-500 rounded-xl p-5 shadow-sm space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                    isCp1 ? 'bg-[#E31E24]' : 'bg-[#0284C7]'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      {isCp1 ? 'CP Produk 1' : 'CP Produk 2 (Opsional / Silo Ke-2)'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Sample komposit semen silo shift {session.shiftName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClearCp(idx as 0 | 1)}
                  className="text-[11px] font-bold text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                >
                  Reset Nilai
                </button>
              </div>

              {/* Product and Silo Pure Free-Text Inputs (Poin I.B: Input Otomatis Huruf Kapital / CAPSLOCK) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Jenis Produk CP (Input Bebas)
                  </label>
                  <input
                    type="text"
                    placeholder="MISAL: PCC FLEXIPLUS, OPC G, SPK..."
                    value={cp.productType}
                    onChange={(e) => handleUpdateCp(idx as 0 | 1, 'productType', e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:border-slate-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Ketik manual nama produk yang diproduksi (otomatis huruf besar)
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Lokasi Silo (Input Bebas)
                  </label>
                  <input
                    type="text"
                    placeholder="MISAL: SILO 1, SILO 2, SILO 3..."
                    value={cp.siloName}
                    onChange={(e) => handleUpdateCp(idx as 0 | 1, 'siloName', e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:border-slate-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Ketik manual nomor silo penampungan (otomatis huruf besar)
                  </span>
                </div>
              </div>

              {/* 4 Laboratory Parameters */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Blaine (cm²/gr)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="misal: 5041"
                    value={getCpDisplay(idx as 0 | 1, 'blaine')}
                    onChange={(e) => handleUpdateCp(idx as 0 | 1, 'blaine', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    R45 (Residu %)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="misal: 5,54"
                    value={getCpDisplay(idx as 0 | 1, 'r45')}
                    onChange={(e) => handleUpdateCp(idx as 0 | 1, 'r45', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    H2O (Moisture %)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="misal: 0,27"
                    value={getCpDisplay(idx as 0 | 1, 'h2o')}
                    onChange={(e) => handleUpdateCp(idx as 0 | 1, 'h2o', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    SO3 (%)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="misal: 1,93"
                    value={getCpDisplay(idx as 0 | 1, 'so3')}
                    onChange={(e) => handleUpdateCp(idx as 0 | 1, 'so3', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>

              {/* Format Preview in WhatsApp */}
              <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg font-mono text-[11px] text-slate-700 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Preview Judul di Laporan WhatsApp:
                </span>
                <span className="font-bold text-slate-900">
                  *CP {session.shiftName} {cp.productType.toUpperCase()} {cp.siloName.toUpperCase()}*
                </span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

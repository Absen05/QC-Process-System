import React, { useState } from 'react';
import { MasterTargetDryMap, MillType, ProductType, ShiftSession } from '../../types/qc';
import { ShieldCheck, Save, RotateCcw, Check, Download, Upload } from 'lucide-react';
import { saveStoredMasterTargets, resetFactoryData } from '../../services/qcStorage';

interface MasterDataPageProps {
  masterTargets: MasterTargetDryMap;
  onUpdateMasterTargets: (targets: MasterTargetDryMap) => void;
  onResetFactoryData: () => void;
}

export const MasterDataPage: React.FC<MasterDataPageProps> = ({
  masterTargets,
  onUpdateMasterTargets,
  onResetFactoryData,
}) => {
  const [activeMill, setActiveMill] = useState<MillType>('Vertical Roller Mill (VRM)');
  const [targets, setTargets] = useState<MasterTargetDryMap>(masterTargets);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const productList: ProductType[] = [
    'PCC Plus FA',
    'PCC NON FA',
    'PCC WS',
    'SPK',
    'OPC G',
    'OPC P',
  ];

  const handleTargetChange = (
    mill: MillType,
    product: ProductType,
    material: 'clinker' | 'gypsum' | 'limestone' | 'trass' | 'flyAsh',
    val: string
  ) => {
    const num = parseFloat(val);
    setTargets(prev => ({
      ...prev,
      [mill]: {
        ...prev[mill],
        [product]: {
          ...prev[mill][product],
          [material]: isNaN(num) ? 0 : num,
        },
      },
    }));
  };

  const handleSaveAll = () => {
    // Validate each product sums to 100%
    for (const mill of ['Vertical Roller Mill (VRM)', 'Tube Mill (TM)'] as MillType[]) {
      for (const prod of productList) {
        const p = targets[mill][prod];
        const sum = p.clinker + p.gypsum + p.limestone + p.trass + p.flyAsh;
        if (Math.abs(sum - 100.0) > 0.1) {
          alert(`Peringatan: Total Target Dry untuk ${mill} - ${prod} adalah ${sum.toFixed(1)}%. Wajib tepat 100.0%.`);
          return;
        }
      }
    }

    saveStoredMasterTargets(targets);
    onUpdateMasterTargets(targets);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Master_Target_Dry_QC_Ciwandan_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="bg-white border-1.5 border-slate-300 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Supervisor / QC Leader (Admin)</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Pengaturan Master Data: Standar Target Dry Proporsi
          </h2>
          <p className="text-xs text-slate-500">
            Nilai yang ditetapkan di sini akan menjadi acuan baku default saat analis membuka sesi shift atau mengganti produk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor JSON</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Master Tersimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Master Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mill Selection Tabs */}
      <div className="bg-white border-1.5 border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMill('Vertical Roller Mill (VRM)')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeMill === 'Vertical Roller Mill (VRM)'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vertical Roller Mill (VRM)
            </button>
            <button
              onClick={() => setActiveMill('Tube Mill (TM)')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeMill === 'Tube Mill (TM)'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tube Mill (TM)
            </button>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            Satuan: Persen Dry (%)
          </span>
        </div>

        {/* Master Target Dry Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100/80 text-gray-800 font-bold border-b border-gray-200">
                <th className="py-2.5 px-3 border-r border-gray-200 w-36">Produk Semen</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right w-24">Clinker (%)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right w-24">Gypsum (%)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right w-24">Limestone (%)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right w-24">Trass (%)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right w-24">Fly Ash (%)</th>
                <th className="py-2.5 px-3 text-right w-28 bg-gray-50">Total Dry (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {productList.map((prod) => {
                const item = targets[activeMill][prod];
                const total = item.clinker + item.gypsum + item.limestone + item.trass + item.flyAsh;
                const isValid = Math.abs(total - 100.0) < 0.05;

                return (
                  <tr key={prod} className="hover:bg-amber-50/20">
                    <td className="py-2.5 px-3 border-r border-gray-200 font-sans font-bold text-gray-900">
                      {prod}
                    </td>
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="0.1"
                        value={item.clinker}
                        onChange={(e) => handleTargetChange(activeMill, prod, 'clinker', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="0.1"
                        value={item.gypsum}
                        onChange={(e) => handleTargetChange(activeMill, prod, 'gypsum', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="0.1"
                        value={item.limestone}
                        onChange={(e) => handleTargetChange(activeMill, prod, 'limestone', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="0.1"
                        value={item.trass}
                        onChange={(e) => handleTargetChange(activeMill, prod, 'trass', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="0.1"
                        value={item.flyAsh}
                        onChange={(e) => handleTargetChange(activeMill, prod, 'flyAsh', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${
                      isValid ? 'text-[#16A34A] bg-green-50/40' : 'text-[#E31E24] bg-red-50/50'
                    }`}>
                      {total.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone: Factory Reset */}
      <div className="bg-red-50/50 border border-red-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-red-900">
            Reset Data Pabrik ke Standar Default (Factory Defaults)
          </h4>
          <p className="text-xs text-red-700">
            Mengembalikan semua master target dry, data analisa shift aktif, dan raw material ke data pabrik Semen Merah Putih awal.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Apakah Anda yakin ingin me-reset seluruh data ke standar pabrik awal?')) {
              onResetFactoryData();
              alert('Data berhasil di-reset ke standar pabrik.');
            }
          }}
          className="px-4 py-2 text-xs font-bold text-red-700 bg-white border border-red-300 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset ke Default Pabrik</span>
        </button>
      </div>

    </div>
  );
};

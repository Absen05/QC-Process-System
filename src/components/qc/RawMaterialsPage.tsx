import React, { useState } from 'react';
import { ShiftSession, UnifiedIncomingMaterial, IncomingParamKey } from '../../types/qc';
import { Plus, Trash2, Check, Truck, X } from 'lucide-react';

interface RawMaterialsPageProps {
  session: ShiftSession;
  onUpdateSession: (updated: ShiftSession) => void;
}

const PARAMETER_CHECKLIST: { key: IncomingParamKey; label: string; unit: string; step: string }[] = [
  { key: 'blaine', label: 'Blaine', unit: 'cm²/gr', step: '1' },
  { key: 'r45', label: 'R45 (Residu)', unit: '%', step: '0.01' },
  { key: 'h2o', label: 'H2O (Moisture)', unit: '%', step: '0.01' },
  { key: 'so3', label: 'SO3', unit: '%', step: '0.01' },
  { key: 'fcao', label: 'F-CaO (Freelime)', unit: '%', step: '0.01' },
  { key: 'c3s', label: 'C3S', unit: '%', step: '0.1' },
  { key: 'c3a', label: 'C3A', unit: '%', step: '0.01' },
  { key: 'valuePercent', label: 'Kadar / Nilai (%)', unit: '%', step: '0.01' },
  { key: 'statusText', label: 'Status / Keterangan Teks (misal: on process)', unit: 'teks', step: '' },
];

export const RawMaterialsPage: React.FC<RawMaterialsPageProps> = ({
  session,
  onUpdateSession,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [selectedParams, setSelectedParams] = useState<IncomingParamKey[]>(['valuePercent']);

  // Handle single param edit
  const handleParamChange = (
    matId: string,
    paramKey: IncomingParamKey,
    val: string
  ) => {
    const updated = session.incomingMaterials.map(m => {
      if (m.id === matId) {
        if (paramKey === 'statusText') {
          return {
            ...m,
            params: { ...m.params, statusText: val },
          };
        } else {
          const parsed = val === '' ? null : parseFloat(val);
          return {
            ...m,
            params: {
              ...m.params,
              [paramKey]: isNaN(parsed as number) ? null : parsed,
            },
          };
        }
      }
      return m;
    });

    onUpdateSession({ ...session, incomingMaterials: updated });
  };

  // Delete material
  const handleDelete = (matId: string) => {
    const updated = session.incomingMaterials.filter(m => m.id !== matId);
    onUpdateSession({ ...session, incomingMaterials: updated });
  };

  // Toggle checkbox in add modal
  const handleToggleParam = (key: IncomingParamKey) => {
    if (selectedParams.includes(key)) {
      if (selectedParams.length > 1) {
        setSelectedParams(selectedParams.filter(p => p !== key));
      }
    } else {
      setSelectedParams([...selectedParams, key]);
    }
  };

  // Save new material
  const handleSaveNewIncoming = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;

    let finalName = newMaterialName.trim();
    if (!finalName.toLowerCase().startsWith('incoming ')) {
      finalName = `Incoming ${finalName}`;
    }

    const newMaterial: UnifiedIncomingMaterial = {
      id: `incoming_${Date.now()}`,
      name: finalName,
      enabledParams: [...selectedParams],
      params: {},
      isCustom: true,
    };

    onUpdateSession({
      ...session,
      incomingMaterials: [...session.incomingMaterials, newMaterial],
    });

    setNewMaterialName('');
    setSelectedParams(['valuePercent']);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">

      {/* Top Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#E31E24]" />
          <h2 className="text-sm sm:text-base font-bold text-gray-900">
            INCOMING RAW MATERIAL
          </h2>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500 font-mono">
            {session.incomingMaterials.length} Material Terdaftar
          </span>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Incoming</span>
        </button>
      </div>

      {/* Unified Material Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {session.incomingMaterials.map((mat) => {
          const isSimpleSingle = mat.enabledParams.length === 1 && mat.enabledParams[0] === 'valuePercent';
          const isSingleWithStatus = mat.enabledParams.length === 2 && mat.enabledParams.includes('valuePercent') && mat.enabledParams.includes('statusText');

          return (
            <div 
              key={mat.id}
              className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs hover:border-gray-300 transition-colors flex flex-col justify-between space-y-2.5"
            >
              {/* Card Title */}
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-900 font-mono">
                  {mat.name}
                </span>
                {mat.isCustom && (
                  <button
                    onClick={() => handleDelete(mat.id)}
                    className="text-gray-400 hover:text-red-600 p-0.5"
                    title="Hapus material ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dynamic Param Inputs */}
              <div className="space-y-2">
                {/* Compact rendering for simple percent items (Trass, Limestone, Gypsum, etc.) */}
                {isSimpleSingle || isSingleWithStatus ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="Nilai (%)"
                        value={mat.params.valuePercent !== null && mat.params.valuePercent !== undefined ? mat.params.valuePercent : ''}
                        onChange={(e) => handleParamChange(mat.id, 'valuePercent', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-gray-50 border border-gray-300 rounded focus:bg-white focus:outline-none"
                      />
                    </div>
                    {mat.enabledParams.includes('statusText') && (
                      <div className="w-28">
                        <input
                          type="text"
                          placeholder="Status (on process)"
                          value={mat.params.statusText || ''}
                          onChange={(e) => handleParamChange(mat.id, 'statusText', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:bg-white focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Multi-parameter layout (BBFS, Fly Ash, Clinker Bayah, Custom checklist) */
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {mat.enabledParams.map(paramKey => {
                      const def = PARAMETER_CHECKLIST.find(p => p.key === paramKey);
                      if (!def) return null;

                      if (paramKey === 'statusText') {
                        return (
                          <div key={paramKey} className="col-span-2">
                            <label className="block text-gray-500 text-[10px] uppercase font-bold mb-0.5">Status</label>
                            <input
                              type="text"
                              value={mat.params.statusText || ''}
                              onChange={(e) => handleParamChange(mat.id, 'statusText', e.target.value)}
                              placeholder="on process"
                              className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs focus:bg-white focus:outline-none"
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={paramKey}>
                          <label className="block text-gray-600 text-[11px] font-medium mb-0.5">
                            {def.label} ({def.unit})
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step={def.step}
                            placeholder={def.unit}
                            value={mat.params[paramKey] !== null && mat.params[paramKey] !== undefined ? mat.params[paramKey] : ''}
                            onChange={(e) => handleParamChange(mat.id, paramKey, e.target.value)}
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded font-mono font-bold text-xs focus:bg-white focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal: + Tambah Incoming Baru (Checklist Parameter) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                + Tambah Incoming Raw Material Baru
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewIncoming} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-800 font-bold mb-1">
                  Nama Material (Contoh: Incoming FA PT A atau Incoming Pozzolan)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ketik nama material..."
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E31E24]/30"
                />
              </div>

              <div>
                <label className="block text-gray-800 font-bold mb-2">
                  Daftar Pilihan Parameter Analisa Laboratorium (Centang yang dibutuhkan):
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-56 overflow-y-auto">
                  {PARAMETER_CHECKLIST.map((param) => (
                    <label
                      key={param.key}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParams.includes(param.key)}
                        onChange={() => handleToggleParam(param.key)}
                        className="w-4 h-4 text-[#E31E24] rounded border-gray-300 focus:ring-[#E31E24]"
                      />
                      <span className="font-medium text-gray-800">
                        {param.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-xs"
                >
                  Simpan Incoming
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

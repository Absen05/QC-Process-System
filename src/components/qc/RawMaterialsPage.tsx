import React, { useState } from 'react';
import { ShiftSession, UnifiedIncomingMaterial, IncomingParamKey } from '../../types/qc';
import { Plus, Trash2, Truck, X, Edit3, Check } from 'lucide-react';

interface RawMaterialsPageProps {
  session: ShiftSession;
  onUpdateSession: (updated: ShiftSession) => void;
}

const PARAMETER_CHECKLIST: { key: IncomingParamKey; label: string; unit: string; step: string }[] = [
  { key: 'valuePercent', label: 'Kadar / Nilai (%)', unit: '%', step: '0.01' },
  { key: 'blaine', label: 'Blaine', unit: 'cm²/gr', step: '1' },
  { key: 'r45', label: 'R45 (Residu)', unit: '%', step: '0.01' },
  { key: 'h2o', label: 'H2O (Moisture)', unit: '%', step: '0.01' },
  { key: 'so3', label: 'SO3', unit: '%', step: '0.01' },
  { key: 'fcao', label: 'F-CaO (Freelime)', unit: '%', step: '0.01' },
  { key: 'c3s', label: 'C3S', unit: '%', step: '0.1' },
  { key: 'c3a', label: 'C3A', unit: '%', step: '0.01' },
  { key: 'statusText', label: 'Status / Keterangan Teks (misal: on process)', unit: 'teks', step: '' },
];

export const RawMaterialsPage: React.FC<RawMaterialsPageProps> = ({
  session,
  onUpdateSession,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [selectedParams, setSelectedParams] = useState<IncomingParamKey[]>(['valuePercent']);

  // Edit Material Parameter modal state
  const [editingMaterial, setEditingMaterial] = useState<UnifiedIncomingMaterial | null>(null);
  const [editMaterialName, setEditMaterialName] = useState('');
  const [editParams, setEditParams] = useState<IncomingParamKey[]>([]);

  // Handle single param edit in card inputs
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

  // Open Edit Parameter Modal for any item (Poin 4)
  const handleOpenEditModal = (mat: UnifiedIncomingMaterial) => {
    setEditingMaterial(mat);
    setEditMaterialName(mat.name);
    setEditParams([...mat.enabledParams]);
  };

  const handleToggleEditParam = (key: IncomingParamKey) => {
    if (editParams.includes(key)) {
      if (editParams.length > 1) {
        setEditParams(editParams.filter(p => p !== key));
      }
    } else {
      setEditParams([...editParams, key]);
    }
  };

  const handleSaveEditedMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    const updated = session.incomingMaterials.map(m => {
      if (m.id === editingMaterial.id) {
        return {
          ...m,
          name: editMaterialName.trim() || m.name,
          enabledParams: [...editParams],
        };
      }
      return m;
    });

    onUpdateSession({ ...session, incomingMaterials: updated });
    setEditingMaterial(null);
  };

  // Delete material
  const handleDelete = (matId: string) => {
    if (confirm('Hapus material incoming ini?')) {
      const updated = session.incomingMaterials.filter(m => m.id !== matId);
      onUpdateSession({ ...session, incomingMaterials: updated });
    }
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
    <div className="space-y-4 font-sans">

      {/* Top Header */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#E31E24]" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            INCOMING RAW MATERIAL
          </h2>
          <span className="text-slate-400">·</span>
          <span className="text-xs text-slate-600 font-mono font-bold">
            {session.incomingMaterials.length} Material Terdaftar
          </span>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
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
              className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm hover:border-slate-600 transition-colors flex flex-col justify-between space-y-3"
            >
              {/* Card Title & Edit Parameter Button (Poin 4) */}
              <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {mat.name}
                </span>

                <div className="flex items-center gap-1">
                  {/* Solid Blue Button: Edit Parameter */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(mat)}
                    className="px-2 py-1 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                    title="Ubah parameter checklist analisa untuk material ini"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  {mat.isCustom && (
                    <button
                      onClick={() => handleDelete(mat.id)}
                      className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                      title="Hapus material ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Param Inputs */}
              <div className="space-y-2">
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
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border-2 border-slate-400 rounded focus:bg-white focus:outline-none"
                      />
                    </div>
                    {mat.enabledParams.includes('statusText') && (
                      <div className="w-32">
                        <input
                          type="text"
                          placeholder="on process"
                          value={mat.params.statusText || ''}
                          onChange={(e) => handleParamChange(mat.id, 'statusText', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-slate-50 border-2 border-slate-400 rounded focus:bg-white focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Multi-parameter layout */
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {mat.enabledParams.map(paramKey => {
                      const def = PARAMETER_CHECKLIST.find(p => p.key === paramKey);
                      if (!def) return null;

                      if (paramKey === 'statusText') {
                        return (
                          <div key={paramKey} className="col-span-2">
                            <label className="block text-slate-600 text-[10px] uppercase font-bold mb-0.5">Status</label>
                            <input
                              type="text"
                              value={mat.params.statusText || ''}
                              onChange={(e) => handleParamChange(mat.id, 'statusText', e.target.value)}
                              placeholder="on process"
                              className="w-full px-2 py-1 bg-slate-50 border-2 border-slate-400 rounded text-xs focus:bg-white focus:outline-none"
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={paramKey}>
                          <label className="block text-slate-700 text-[11px] font-bold mb-0.5">
                            {def.label} ({def.unit})
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step={def.step}
                            placeholder={def.unit}
                            value={mat.params[paramKey] !== null && mat.params[paramKey] !== undefined ? mat.params[paramKey] : ''}
                            onChange={(e) => handleParamChange(mat.id, paramKey, e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border-2 border-slate-400 rounded font-mono font-bold text-xs focus:bg-white focus:outline-none"
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

      {/* Modal: Edit Parameter Material (Poin 4) */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            
            <div className="px-5 py-4 bg-slate-800 text-white border-b-2 border-slate-600 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-[#0284C7]" />
                <span>Edit Parameter Material: {editingMaterial.name}</span>
              </h3>
              <button onClick={() => setEditingMaterial(null)} className="text-slate-300 hover:text-white p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedMaterial} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Nama Material
                </label>
                <input
                  type="text"
                  required
                  value={editMaterialName}
                  onChange={(e) => setEditMaterialName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border-2 border-slate-400 rounded-lg font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  Centang Parameter Analisa yang Ingin Ditampilkan:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-3 rounded-lg border-2 border-slate-300 max-h-56 overflow-y-auto">
                  {PARAMETER_CHECKLIST.map((param) => (
                    <label
                      key={param.key}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={editParams.includes(param.key)}
                        onChange={() => handleToggleEditParam(param.key)}
                        className="w-4 h-4 text-[#0284C7] rounded border-slate-400 focus:ring-[#0284C7]"
                      />
                      <span className="font-bold text-slate-800">
                        {param.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 text-white bg-[#334155] hover:bg-slate-800 rounded-lg font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal: + Tambah Incoming Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            
            <div className="px-5 py-4 bg-slate-800 text-white border-b-2 border-slate-600 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#E31E24]" />
                <span>+ Tambah Incoming Raw Material Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-white p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewIncoming} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Nama Material (Contoh: Pozzolan atau Fly Ash Baru)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ketik nama material..."
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border-2 border-slate-400 rounded-lg font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  Centang Parameter Analisa yang Ingin Ditampilkan:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-3 rounded-lg border-2 border-slate-300 max-h-56 overflow-y-auto">
                  {PARAMETER_CHECKLIST.map((param) => (
                    <label
                      key={param.key}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParams.includes(param.key)}
                        onChange={() => handleToggleParam(param.key)}
                        className="w-4 h-4 text-[#E31E24] rounded border-slate-400 focus:ring-[#E31E24]"
                      />
                      <span className="font-bold text-slate-800">
                        {param.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-white bg-[#334155] hover:bg-slate-800 rounded-lg font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-sm"
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

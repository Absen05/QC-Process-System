import React, { useState } from 'react';
import { MasterTargetDryMap, MillType, ProductType, UserAccount, ProductQualitySpec, CgaMasterSetting } from '../../types/qc';
import { 
  saveStoredMasterTargets, 
  resetFactoryData, 
  getStoredUsers, 
  saveStoredUsers, 
  resetUserPin, 
  getStoredProductList, 
  addNewProductType,
  getStoredQualitySpecs,
  saveStoredQualitySpecs,
  getStoredCgaSettings,
  saveStoredCgaSettings
} from '../../services/qcStorage';
import { ShieldCheck, Save, RotateCcw, Check, Plus, Trash2, Key, Beaker, Sliders, Users, Layers, Download, X } from 'lucide-react';

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
  const [activeSubTab, setActiveSubTab] = useState<'targets' | 'quality' | 'cga' | 'users'>('targets');
  const [activeMill, setActiveMill] = useState<MillType>('Vertical Roller Mill (VRM)');
  
  // Targets state
  const [targets, setTargets] = useState<MasterTargetDryMap>(masterTargets);
  const [productList, setProductList] = useState<string[]>(() => getStoredProductList());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quality Specs state
  const [qualitySpecs, setQualitySpecs] = useState<ProductQualitySpec[]>(() => getStoredQualitySpecs());
  
  // CGA Master state
  const [cgaSettings, setCgaSettings] = useState<CgaMasterSetting[]>(() => getStoredCgaSettings());
  const [cgaBrands, setCgaBrands] = useState<string[]>(['SIKA', 'CONCH', 'GCP']);

  // Users state
  const [usersList, setUsersList] = useState<UserAccount[]>(() => getStoredUsers());
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);

  // Modal: Add New Product
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdClk, setNewProdClk] = useState(72.0);
  const [newProdGyp, setNewProdGyp] = useState(4.0);
  const [newProdLst, setNewProdLst] = useState(14.0);
  const [newProdTrass, setNewProdTrass] = useState(5.0);
  const [newProdFa, setNewProdFa] = useState(5.0);

  // Modal: Add New CGA Brand
  const [showAddCgaModal, setShowAddCgaModal] = useState(false);
  const [newCgaBrand, setNewCgaBrand] = useState('');

  // Target change handler
  const handleTargetChange = (
    mill: MillType,
    product: string,
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

  const handleSaveTargets = () => {
    // Validate each product sums to 100%
    for (const mill of ['Vertical Roller Mill (VRM)', 'Tube Mill (TM)'] as MillType[]) {
      for (const prod of productList) {
        const p = targets[mill]?.[prod];
        if (p) {
          const sum = p.clinker + p.gypsum + p.limestone + p.trass + p.flyAsh;
          if (Math.abs(sum - 100.0) > 0.1) {
            alert(`Peringatan: Total Target Dry untuk ${mill} - ${prod} adalah ${sum.toFixed(1)}%. Wajib tepat 100.0%.`);
            return;
          }
        }
      }
    }

    saveStoredMasterTargets(targets);
    onUpdateMasterTargets(targets);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Create new product
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProdName.trim().toUpperCase();
    if (!name) return;

    const sum = newProdClk + newProdGyp + newProdLst + newProdTrass + newProdFa;
    if (Math.abs(sum - 100.0) > 0.1) {
      alert(`Total proporsi harus 100.0% (Saat ini: ${sum.toFixed(1)}%)`);
      return;
    }

    const targetObj = {
      clinker: newProdClk,
      gypsum: newProdGyp,
      limestone: newProdLst,
      trass: newProdTrass,
      flyAsh: newProdFa,
    };

    addNewProductType(name, targetObj, targetObj);
    setProductList(getStoredProductList());
    setTargets(prev => ({
      'Tube Mill (TM)': { ...prev['Tube Mill (TM)'], [name]: targetObj },
      'Vertical Roller Mill (VRM)': { ...prev['Vertical Roller Mill (VRM)'], [name]: targetObj },
    }));
    setQualitySpecs(getStoredQualitySpecs());
    setCgaSettings(getStoredCgaSettings());

    setNewProdName('');
    setShowAddProductModal(false);
    alert(`✅ Produk baru [${name}] berhasil didaftarkan ke Master Data!`);
  };

  // Quality Spec change
  const handleQualitySpecChange = (prod: string, param: keyof ProductQualitySpec, key: 'min' | 'max' | 'std', val: string) => {
    const num = val === '' ? null : parseFloat(val);
    const updated = qualitySpecs.map(s => {
      if (s.productType === prod) {
        return {
          ...s,
          [param]: {
            ...(s[param] as any),
            [key]: isNaN(num as number) ? null : num,
          },
        };
      }
      return s;
    });
    setQualitySpecs(updated);
  };

  const handleSaveQualitySpecs = () => {
    saveStoredQualitySpecs(qualitySpecs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // CGA settings change
  const handleCgaChange = (id: string, field: 'cgaBrand' | 'dosagePpm' | 'notes', val: any) => {
    const updated = cgaSettings.map(c => {
      if (c.id === id) {
        return { ...c, [field]: field === 'dosagePpm' ? (parseInt(val) || 0) : val };
      }
      return c;
    });
    setCgaSettings(updated);
  };

  const handleSaveCga = () => {
    saveStoredCgaSettings(cgaSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddCgaBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const brand = newCgaBrand.trim().toUpperCase();
    if (!brand) return;
    if (!cgaBrands.includes(brand)) {
      setCgaBrands([...cgaBrands, brand]);
    }
    setNewCgaBrand('');
    setShowAddCgaModal(false);
  };

  // Reset PIN user by SI
  const handleResetUserPinByAdmin = (userName: string) => {
    if (confirm(`Reset PIN untuk ${userName} kembali ke PIN default?`)) {
      const pin = resetUserPin(userName);
      setUsersList(getStoredUsers());
      setUserActionMessage(`✅ PIN untuk ${userName} berhasil direset ke [${pin}]`);
      setTimeout(() => setUserActionMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-4 font-sans">

      {/* Top Banner */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Panel Khusus SI / QC Supervisor (Admin)</span>
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Pengaturan Master Data Pabrik
          </h2>
          <p className="text-xs text-slate-500">
            Kelola target dry formulasi semen, standar mutu lab, master CGA, serta reset PIN akun analis.
          </p>
        </div>

        {/* Global Save Indicator */}
        {saveSuccess && (
          <div className="px-3 py-1.5 bg-green-100 border border-green-400 text-green-900 font-bold text-xs rounded-lg flex items-center gap-1.5 animate-pulse">
            <Check className="w-4 h-4" />
            <span>Perubahan Master Tersimpan!</span>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation inside Master Data (Solid buttons) */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200 border-2 border-slate-400 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveSubTab('targets')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            activeSubTab === 'targets'
              ? 'bg-[#E31E24] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>1. Target Dry Proporsi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('quality')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            activeSubTab === 'quality'
              ? 'bg-[#0284C7] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          <Beaker className="w-4 h-4" />
          <span>2. Tabel Target Quality</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cga')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            activeSubTab === 'cga'
              ? 'bg-[#16A34A] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. Master CGA (Grinding Aid)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            activeSubTab === 'users'
              ? 'bg-[#334155] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. Akun & Manajemen PIN Analis</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: TARGET DRY PROPORSI + TAMBAH PRODUK BARU */}
      {/* ============================================================== */}
      {activeSubTab === 'targets' && (
        <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
            {/* Mill Switcher */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMill('Vertical Roller Mill (VRM)')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeMill === 'Vertical Roller Mill (VRM)'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                VRM (Mill 2)
              </button>
              <button
                type="button"
                onClick={() => setActiveMill('Tube Mill (TM)')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeMill === 'Tube Mill (TM)'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                TM (Mill 1)
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddProductModal(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Produk Baru</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTargets}
                className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Target Dry</span>
              </button>
            </div>
          </div>

          {/* Target Dry Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-700 text-white font-bold border-b border-slate-500">
                  <th className="py-2.5 px-3 border-r border-slate-500 w-36 font-sans">PRODUK</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">CLINKER (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">GYPSUM (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">LIMESTONE (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">TRASS (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">FLY ASH (%)</th>
                  <th className="py-2.5 px-3 text-right w-24">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {productList.map((prod) => {
                  const p = targets[activeMill]?.[prod] || { clinker: 72, gypsum: 4, limestone: 14, trass: 5, flyAsh: 5 };
                  const total = p.clinker + p.gypsum + p.limestone + p.trass + p.flyAsh;
                  const isValid = Math.abs(total - 100.0) < 0.1;

                  return (
                    <tr key={prod} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-300 font-sans font-bold text-slate-900 bg-slate-50">
                        {prod}
                      </td>
                      {(['clinker', 'gypsum', 'limestone', 'trass', 'flyAsh'] as const).map(mat => (
                        <td key={mat} className="p-0 border-r border-slate-300">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            value={p[mat]}
                            onChange={(e) => handleTargetChange(activeMill, prod, mat, e.target.value)}
                            className="w-full px-2 py-2 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                          />
                        </td>
                      ))}
                      <td className={`py-2 px-3 text-right font-bold ${isValid ? 'text-[#16A34A] bg-green-50' : 'text-[#E31E24] bg-red-50'}`}>
                        {total.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: TABEL TARGET QUALITY (MIN / MAX / STD) */}
      {/* ============================================================== */}
      {activeSubTab === 'quality' && (
        <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Standar Spesifikasi Kualitas Produk Semen
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Batas kendali Min, Max, dan Target Standard untuk Blaine, R45, H2O, SO3, dan F-CaO.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveQualitySpecs}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Target Quality</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-700 text-white font-bold border-b border-slate-500">
                  <th className="py-2.5 px-3 border-r border-slate-500 w-36 font-sans">PRODUK</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={3}>BLAINE (cm²/gr)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={3}>R45 (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={2}>H2O (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={3}>SO3 (%)</th>
                  <th className="py-2.5 px-3 text-center" colSpan={2}>F-CaO (%)</th>
                </tr>
                <tr className="bg-slate-600 text-white font-semibold border-b border-slate-500 text-[10px]">
                  <th className="border-r border-slate-500"></th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">MIN</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">STD</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">MAX</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">MIN</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">STD</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">MAX</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">STD</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">MAX</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">MIN</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">STD</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">MAX</th>
                  <th className="py-1 px-2 border-r border-slate-500 text-right">STD</th>
                  <th className="py-1 px-2 text-right">MAX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {qualitySpecs.map((spec) => (
                  <tr key={spec.productType} className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-300 font-sans font-bold text-slate-900 bg-slate-50">
                      {spec.productType}
                    </td>

                    {/* Blaine */}
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="10"
                        value={spec.blaine.min ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'blaine', 'min', e.target.value)}
                        className="w-16 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-300 bg-amber-50/20">
                      <input
                        type="number"
                        step="10"
                        value={spec.blaine.std ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'blaine', 'std', e.target.value)}
                        className="w-16 px-1.5 py-1.5 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="10"
                        value={spec.blaine.max ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'blaine', 'max', e.target.value)}
                        className="w-16 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* R45 */}
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="0.1"
                        value={spec.residuR45.min ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'residuR45', 'min', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-300 bg-amber-50/20">
                      <input
                        type="number"
                        step="0.1"
                        value={spec.residuR45.std ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'residuR45', 'std', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="0.1"
                        value={spec.residuR45.max ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'residuR45', 'max', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* H2O */}
                    <td className="p-0 border-r border-slate-300 bg-blue-50/20">
                      <input
                        type="number"
                        step="0.01"
                        value={spec.moistureH2O.std ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'moistureH2O', 'std', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="0.01"
                        value={spec.moistureH2O.max ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'moistureH2O', 'max', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* SO3 */}
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="0.05"
                        value={spec.so3.min ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'so3', 'min', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-300 bg-sky-50/20">
                      <input
                        type="number"
                        step="0.05"
                        value={spec.so3.std ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'so3', 'std', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono font-bold text-[#0284C7] bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="0.05"
                        value={spec.so3.max ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'so3', 'max', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* F-CaO */}
                    <td className="p-0 border-r border-slate-300 bg-amber-50/20">
                      <input
                        type="number"
                        step="0.05"
                        value={spec.freelimeFCaO.std ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'freelimeFCaO', 'std', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono font-bold text-amber-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        type="number"
                        step="0.05"
                        value={spec.freelimeFCaO.max ?? ''}
                        onChange={(e) => handleQualitySpecChange(spec.productType, 'freelimeFCaO', 'max', e.target.value)}
                        className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: MASTER CGA (CEMENT GRINDING AID) */}
      {/* ============================================================== */}
      {activeSubTab === 'cga' && (
        <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pengaturan Master CGA (Cement Grinding Aid)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Merek default: SIKA, CONCH, GCP · Dosis PPM standar tiap jenis produk semen.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddCgaModal(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Jenis CGA</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCga}
                className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Master CGA</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-700 text-white font-bold border-b border-slate-500">
                  <th className="py-2.5 px-3 border-r border-slate-500 w-44 font-sans">PRODUK SEMEN</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 w-44">MEREK / JENIS CGA</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 w-32 text-right">DOSIS STANDAR (PPM)</th>
                  <th className="py-2.5 px-3 font-sans">KETERANGAN TEKNIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {cgaSettings.map((cga) => (
                  <tr key={cga.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-300 font-sans font-bold text-slate-900 bg-slate-50">
                      {cga.productType}
                    </td>

                    <td className="p-0 border-r border-slate-300">
                      <select
                        value={cga.cgaBrand}
                        onChange={(e) => handleCgaChange(cga.id, 'cgaBrand', e.target.value)}
                        className="w-full p-2 bg-transparent border-0 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                      >
                        {cgaBrands.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </td>

                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="10"
                        value={cga.dosagePpm}
                        onChange={(e) => handleCgaChange(cga.id, 'dosagePpm', e.target.value)}
                        className="w-full px-2 py-2 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    <td className="p-0 font-sans">
                      <input
                        type="text"
                        value={cga.notes || ''}
                        onChange={(e) => handleCgaChange(cga.id, 'notes', e.target.value)}
                        placeholder="Catatan fungsi..."
                        className="w-full px-2.5 py-2 text-slate-800 bg-transparent border-0 excel-cell-input focus:bg-white text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 4: MANAJEMEN AKUN & RESET PIN ANALIS */}
      {/* ============================================================== */}
      {activeSubTab === 'users' && (
        <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Manajemen Akun & PIN Keamanan 6 Digit
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Sebagai SI (Admin), Anda dapat melihat dan mereset PIN analis bila ada yang lupa PIN.
              </p>
            </div>
          </div>

          {userActionMessage && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-900 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>{userActionMessage}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-700 text-white font-bold border-b border-slate-500">
                  <th className="py-2.5 px-3 border-r border-slate-500 w-44 font-sans">NAMA PENGGUNA</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 w-28">ROLE</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 w-32 text-center">PIN AKTIF</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 w-48">TERAKHIR DIUBAH</th>
                  <th className="py-2.5 px-3 w-36 text-center font-sans">AKSI SI (ADMIN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {usersList.map((user) => {
                  const isSI = user.role === 'supervisor';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 border-r border-slate-300 font-sans font-bold text-slate-900">
                        {user.name}
                      </td>

                      <td className="py-2.5 px-3 border-r border-slate-300">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSI ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {isSI ? 'SUPERVISOR (SI)' : 'ANALIS SHIFT'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 border-r border-slate-300 text-center font-bold font-mono tracking-widest text-slate-900">
                        {user.pin}
                      </td>

                      <td className="py-2.5 px-3 border-r border-slate-300 text-slate-500 text-[11px]">
                        {user.updatedAt ? new Date(user.updatedAt).toLocaleString('id-ID') : 'Default Awal'}
                      </td>

                      <td className="py-2 px-3 text-center">
                        {!isSI ? (
                          <button
                            type="button"
                            onClick={() => handleResetUserPinByAdmin(user.name)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] shadow-2xs flex items-center justify-center gap-1 mx-auto"
                            title="Reset PIN kembali ke default 456789"
                          >
                            <Key className="w-3 h-3" />
                            <span>Reset PIN (456789)</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Akun SI Utama</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Modal: Tambah Produk Baru */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="px-5 py-4 bg-slate-800 text-white border-b-2 border-slate-600 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#E31E24]" />
                <span>+ Tambah Jenis Produk Semen Baru</span>
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-300 hover:text-white p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Nama Produk Baru (Contoh: PCC TIPE II atau CEM II B-M)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ketik nama produk..."
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border-2 border-slate-400 rounded-lg font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  Standar Formulasi Target Dry (%) — Wajib Total Tepat 100.0%:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-100 p-3 rounded-lg border-2 border-slate-300">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Clinker (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newProdClk}
                      onChange={(e) => setNewProdClk(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-mono font-bold text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Gypsum (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newProdGyp}
                      onChange={(e) => setNewProdGyp(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-mono font-bold text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Limestone (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newProdLst}
                      onChange={(e) => setNewProdLst(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-mono font-bold text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Trass (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newProdTrass}
                      onChange={(e) => setNewProdTrass(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-mono font-bold text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Fly Ash (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newProdFa}
                      onChange={(e) => setNewProdFa(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-white border border-slate-400 rounded font-mono font-bold text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-800 font-bold mb-0.5">Total (%)</label>
                    <div className={`p-1.5 font-mono font-bold text-right rounded ${
                      Math.abs(newProdClk + newProdGyp + newProdLst + newProdTrass + newProdFa - 100.0) < 0.1 
                        ? 'bg-green-100 text-green-800 border border-green-400' 
                        : 'bg-red-100 text-red-800 border border-red-400'
                    }`}>
                      {(newProdClk + newProdGyp + newProdLst + newProdTrass + newProdFa).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 text-white bg-[#334155] hover:bg-slate-800 rounded-lg font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-sm"
                >
                  Simpan Produk Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Jenis CGA Baru */}
      {showAddCgaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="px-5 py-4 bg-slate-800 text-white border-b-2 border-slate-600 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#0284C7]" />
                <span>+ Tambah Jenis / Merek CGA Baru</span>
              </h3>
              <button onClick={() => setShowAddCgaModal(false)} className="text-slate-300 hover:text-white p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCgaBrand} className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Nama Merek CGA (Contoh: MAPEI atau BASF)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ketik merek CGA..."
                  value={newCgaBrand}
                  onChange={(e) => setNewCgaBrand(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border-2 border-slate-400 rounded-lg font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCgaModal(false)}
                  className="px-4 py-2 text-white bg-[#334155] hover:bg-slate-800 rounded-lg font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  Tambah Merek CGA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { MasterTargetDryMap, MillType, UserAccount, ProductQualitySpec, CgaMasterSetting } from '../../types/qc';
import { 
  saveStoredMasterTargets, 
  getStoredUsers, 
  resetUserPin, 
  getStoredProductList, 
  saveStoredProductList,
  addNewProductType,
  getStoredQualitySpecs,
  saveStoredQualitySpecs,
  getStoredCgaSettings,
  saveStoredCgaSettings,
  syncQualitySpecsWithTargets,
  syncCgaSettingsWithTargets
} from '../../services/qcStorage';
import { 
  saveCloudMasterTargets, 
  saveCloudQualitySpecs, 
  saveCloudCgaSettings, 
  saveCloudProductList,
  fetchCloudQualitySpecs,
  fetchCloudCgaSettings,
  fetchCloudProductList
} from '../../services/qcApi';
import { ShieldCheck, Save, Check, Plus, Trash2, Key, Beaker, Sliders, Users, Layers, X, Edit3, AlertTriangle, Factory, Link2 } from 'lucide-react';

interface MasterDataPageProps {
  masterTargets: MasterTargetDryMap;
  onUpdateMasterTargets: (targets: MasterTargetDryMap) => void;
  onResetFactoryData: () => void;
}

export const MasterDataPage: React.FC<MasterDataPageProps> = ({
  masterTargets,
  onUpdateMasterTargets,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'targets' | 'quality' | 'cga' | 'users'>('targets');
  const [activeMill, setActiveMill] = useState<MillType>('Tube Mill (TM)');
  const [activeQualityMill, setActiveQualityMill] = useState<'TM' | 'VRM'>('TM');
  const [activeCgaMill, setActiveCgaMill] = useState<'TM' | 'VRM'>('TM');
  
  // Targets state (Master Reference)
  const [targets, setTargets] = useState<MasterTargetDryMap>(masterTargets);
  const [productList, setProductList] = useState<string[]>(() => getStoredProductList());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmSaveTargetsModal, setShowConfirmSaveTargetsModal] = useState(false);
  const [targetDrySuccessMessage, setTargetDrySuccessMessage] = useState<string | null>(null);

  // Quality Specs state (Referenced from Master Target Dry)
  const [qualitySpecs, setQualitySpecs] = useState<ProductQualitySpec[]>(() =>
    syncQualitySpecsWithTargets(masterTargets, getStoredQualitySpecs())
  );
  
  // CGA Master state (Referenced from Master Target Dry)
  const [cgaSettings, setCgaSettings] = useState<CgaMasterSetting[]>(() =>
    syncCgaSettingsWithTargets(masterTargets, getStoredCgaSettings())
  );
  const [cgaBrands, setCgaBrands] = useState<string[]>(['SIKA', 'CONCH', 'GCP']);

  // Users state
  const [usersList, setUsersList] = useState<UserAccount[]>(() => getStoredUsers());
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);

  // Setiap kali Master Target Dry berubah, pastikan tabel Target Quality & Master CGA selalu sinkron memiliki produk yang sama
  useEffect(() => {
    setTargets(masterTargets);
    setQualitySpecs((prev) => {
      const synced = syncQualitySpecsWithTargets(masterTargets, prev);
      saveStoredQualitySpecs(synced);
      return synced;
    });
    setCgaSettings((prev) => {
      const synced = syncCgaSettingsWithTargets(masterTargets, prev);
      saveStoredCgaSettings(synced);
      return synced;
    });
  }, [masterTargets]);

  useEffect(() => {
    fetchCloudQualitySpecs().then((specs) => {
      const baseSpecs = specs || getStoredQualitySpecs();
      const syncedSpecs = syncQualitySpecsWithTargets(masterTargets, baseSpecs);
      setQualitySpecs(syncedSpecs);
      saveStoredQualitySpecs(syncedSpecs);
      if (!specs || specs.length !== syncedSpecs.length || specs.some((s: any) => !s.millType)) {
        saveCloudQualitySpecs(syncedSpecs);
      }
    });
    fetchCloudCgaSettings().then((settings) => {
      const baseCga = settings || getStoredCgaSettings();
      const syncedCga = syncCgaSettingsWithTargets(masterTargets, baseCga);
      setCgaSettings(syncedCga);
      saveStoredCgaSettings(syncedCga);
      if (!settings || settings.length !== syncedCga.length || settings.some((c: any) => !c.millType)) {
        saveCloudCgaSettings(syncedCga);
      }
    });
    fetchCloudProductList().then((products) => {
      const tmProds = Object.keys(masterTargets?.['Tube Mill (TM)'] || {});
      const vrmProds = Object.keys(masterTargets?.['Vertical Roller Mill (VRM)'] || {});
      const mergedProds = Array.from(new Set([...(products || []), ...tmProds, ...vrmProds]));
      if (mergedProds.length > 0) {
        setProductList(mergedProds);
        saveStoredProductList(mergedProds);
      }
    });
  }, []);

  // Modal: Add New Product (Target Dry)
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdClk, setNewProdClk] = useState(72.0);
  const [newProdGyp, setNewProdGyp] = useState(4.0);
  const [newProdLst, setNewProdLst] = useState(14.0);
  const [newProdTrass, setNewProdTrass] = useState(5.0);
  const [newProdFa, setNewProdFa] = useState(5.0);

  // Modal: Add New Product (Target Quality Spec)
  const [showAddQualityProductModal, setShowAddQualityProductModal] = useState(false);
  const [newQProdName, setNewQProdName] = useState('');
  const [newQMill, setNewQMill] = useState<'TM' | 'VRM' | 'BOTH'>('BOTH');
  const [newQBlaineMin, setNewQBlaineMin] = useState<number>(3800);
  const [newQBlaineStd, setNewQBlaineStd] = useState<number>(4000);
  const [newQBlaineMax, setNewQBlaineMax] = useState<number>(4200);
  const [newQR45Min, setNewQR45Min] = useState<number>(8.0);
  const [newQR45Std, setNewQR45Std] = useState<number>(11.0);
  const [newQR45Max, setNewQR45Max] = useState<number>(14.0);
  const [newQH2oStd, setNewQH2oStd] = useState<number>(0.15);
  const [newQH2oMax, setNewQH2oMax] = useState<number>(0.30);
  const [newQSo3Min, setNewQSo3Min] = useState<number>(1.90);
  const [newQSo3Std, setNewQSo3Std] = useState<number>(2.10);
  const [newQSo3Max, setNewQSo3Max] = useState<number>(2.30);
  const [newQFCaoStd, setNewQFCaoStd] = useState<number>(1.00);
  const [newQFCaoMax, setNewQFCaoMax] = useState<number>(1.50);

  // Modal: Add New CGA Brand
  const [showAddCgaModal, setShowAddCgaModal] = useState(false);
  const [newCgaBrand, setNewCgaBrand] = useState('');

  // Modal: Edit Target Dry state (Poin 3)
  const [editingDryProduct, setEditingDryProduct] = useState<{
    product: string;
    mill: MillType;
    clinker: number;
    gypsum: number;
    limestone: number;
    trass: number;
    flyAsh: number;
  } | null>(null);

  // Modal: Delete Target Dry state (Poin 3)
  const [deletingDryProduct, setDeletingDryProduct] = useState<{
    product: string;
    mill: MillType;
  } | null>(null);

  // Modal: Edit Target Quality state (Poin 3)
  const [editingQualitySpec, setEditingQualitySpec] = useState<ProductQualitySpec | null>(null);

  // Modal: Delete Target Quality state (Poin 3)
  const [deletingQualitySpec, setDeletingQualitySpec] = useState<ProductQualitySpec | null>(null);

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
      for (const prod of Object.keys(targets[mill] || {})) {
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

    // Tampilkan pop-up dialog konfirmasi sebelum menyimpan
    setShowConfirmSaveTargetsModal(true);
  };

  const handleConfirmExecuteSaveTargets = async () => {
    saveStoredMasterTargets(targets);
    await saveCloudMasterTargets(targets);
    onUpdateMasterTargets(targets);

    // Pastikan Quality Specs & CGA Settings tersinkronisasi penuh dengan Master Target Dry
    const syncedQuality = syncQualitySpecsWithTargets(targets, qualitySpecs);
    setQualitySpecs(syncedQuality);
    saveStoredQualitySpecs(syncedQuality);
    await saveCloudQualitySpecs(syncedQuality);

    const syncedCga = syncCgaSettingsWithTargets(targets, cgaSettings);
    setCgaSettings(syncedCga);
    saveStoredCgaSettings(syncedCga);
    await saveCloudCgaSettings(syncedCga);

    setShowConfirmSaveTargetsModal(false);
    setSaveSuccess(true);
    setTargetDrySuccessMessage('✅ Master Target Dry berhasil disimpan dan disinkronkan ke Quality & CGA!');
    setTimeout(() => {
      setTargetDrySuccessMessage(null);
      setSaveSuccess(false);
    }, 4500);
  };

  // Open Edit Modal for Target Dry
  const handleOpenEditDry = (prod: string) => {
    const p = targets[activeMill]?.[prod] || { clinker: 72, gypsum: 4, limestone: 14, trass: 5, flyAsh: 5 };
    setEditingDryProduct({
      product: prod,
      mill: activeMill,
      clinker: p.clinker,
      gypsum: p.gypsum,
      limestone: p.limestone,
      trass: p.trass,
      flyAsh: p.flyAsh,
    });
  };

  const handleSaveEditDryModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDryProduct) return;
    const { product, mill, clinker, gypsum, limestone, trass, flyAsh } = editingDryProduct;
    const total = clinker + gypsum + limestone + trass + flyAsh;
    if (Math.abs(total - 100.0) > 0.1) {
      alert(`Peringatan: Total persentase formulasi harus tepat 100.0% (Saat ini: ${total.toFixed(1)}%).`);
      return;
    }

    const updatedTargets: MasterTargetDryMap = {
      ...targets,
      [mill]: {
        ...targets[mill],
        [product]: { clinker, gypsum, limestone, trass, flyAsh },
      },
    };

    setTargets(updatedTargets);
    saveStoredMasterTargets(updatedTargets);
    saveCloudMasterTargets(updatedTargets);
    onUpdateMasterTargets(updatedTargets);
    setEditingDryProduct(null);
    setSaveSuccess(true);
    setTargetDrySuccessMessage('✅ Master Target Dry berhasil disimpan dan diperbarui!');
    setTimeout(() => {
      setTargetDrySuccessMessage(null);
      setSaveSuccess(false);
    }, 4500);
  };

  // Permanently delete product from master targets and product list
  const handleConfirmDeleteDry = async () => {
    if (!deletingDryProduct) return;
    const { product } = deletingDryProduct;

    // Remove from both mills
    const newTmMap = { ...targets['Tube Mill (TM)'] };
    delete newTmMap[product];
    const newVrmMap = { ...targets['Vertical Roller Mill (VRM)'] };
    delete newVrmMap[product];

    const updatedTargets: MasterTargetDryMap = {
      'Tube Mill (TM)': newTmMap,
      'Vertical Roller Mill (VRM)': newVrmMap,
    };

    // Remove from product list
    const newProductList = productList.filter(p => p !== product);
    setProductList(newProductList);
    saveStoredProductList(newProductList);
    await saveCloudProductList(newProductList);

    // Save master targets
    setTargets(updatedTargets);
    saveStoredMasterTargets(updatedTargets);
    await saveCloudMasterTargets(updatedTargets);
    onUpdateMasterTargets(updatedTargets);

    // Also remove from quality specs (sinkronisasi referensi)
    const updatedQuality = syncQualitySpecsWithTargets(updatedTargets, qualitySpecs.filter(s => s.productType !== product));
    setQualitySpecs(updatedQuality);
    saveStoredQualitySpecs(updatedQuality);
    await saveCloudQualitySpecs(updatedQuality);

    // Also remove from cga settings (sinkronisasi referensi)
    const updatedCga = syncCgaSettingsWithTargets(updatedTargets, cgaSettings.filter(c => c.productType !== product));
    setCgaSettings(updatedCga);
    saveStoredCgaSettings(updatedCga);
    await saveCloudCgaSettings(updatedCga);

    setDeletingDryProduct(null);
    setSaveSuccess(true);
    setTargetDrySuccessMessage(`✅ Produk [${product}] berhasil dihapus dari Target Dry, Quality, dan CGA!`);
    setTimeout(() => {
      setTargetDrySuccessMessage(null);
      setSaveSuccess(false);
    }, 4000);
  };

  // Open Edit Modal for Target Quality
  const handleOpenEditQuality = (spec: ProductQualitySpec) => {
    setEditingQualitySpec(JSON.parse(JSON.stringify(spec)));
  };

  const handleSaveEditQualityModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQualitySpec) return;

    const targetMill = editingQualitySpec.millType || activeQualityMill;
    const updated = qualitySpecs.map(s => {
      if ((s.millType || targetMill) === targetMill && s.productType === editingQualitySpec.productType) {
        return { ...editingQualitySpec, millType: targetMill };
      }
      return s;
    });

    setQualitySpecs(updated);
    saveStoredQualitySpecs(updated);
    await saveCloudQualitySpecs(updated);
    setEditingQualitySpec(null);
    setSaveSuccess(true);
    setTargetDrySuccessMessage(`✅ Target Quality ${targetMill} [${editingQualitySpec.productType}] berhasil diperbarui!`);
    setTimeout(() => {
      setTargetDrySuccessMessage(null);
      setSaveSuccess(false);
    }, 3500);
  };

  const handleConfirmDeleteQuality = async () => {
    if (!deletingQualitySpec) return;
    setDeletingQualitySpec(null);
  };

  // Create new product for Target Quality
  const handleCreateQualityProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowAddQualityProductModal(false);
  };

  // Create new product in Master Target Dry (Otomatis menambahkan ke Target Quality & Master CGA untuk TM dan VRM)
  const handleCreateProduct = async (e: React.FormEvent) => {
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

    const updatedTargets: MasterTargetDryMap = {
      'Tube Mill (TM)': { ...targets['Tube Mill (TM)'], [name]: { ...targetObj } },
      'Vertical Roller Mill (VRM)': { ...targets['Vertical Roller Mill (VRM)'], [name]: { ...targetObj } },
    };

    addNewProductType(name, targetObj, targetObj);
    const updatedProdList = getStoredProductList();
    setProductList(updatedProdList);
    setTargets(updatedTargets);
    saveStoredMasterTargets(updatedTargets);
    onUpdateMasterTargets(updatedTargets);

    const syncedQuality = syncQualitySpecsWithTargets(updatedTargets, getStoredQualitySpecs());
    setQualitySpecs(syncedQuality);
    saveStoredQualitySpecs(syncedQuality);

    const syncedCga = syncCgaSettingsWithTargets(updatedTargets, getStoredCgaSettings());
    setCgaSettings(syncedCga);
    saveStoredCgaSettings(syncedCga);

    // Simpan semuanya ke Supabase Cloud DB
    await Promise.all([
      saveCloudProductList(updatedProdList),
      saveCloudMasterTargets(updatedTargets),
      saveCloudQualitySpecs(syncedQuality),
      saveCloudCgaSettings(syncedCga),
    ]);

    setNewProdName('');
    setShowAddProductModal(false);
    setSaveSuccess(true);
    setTargetDrySuccessMessage(`✅ Produk baru [${name}] berhasil didaftarkan ke Target Dry, Target Quality, dan Master CGA!`);
    setTimeout(() => {
      setTargetDrySuccessMessage(null);
      setSaveSuccess(false);
    }, 4500);
  };

  // Quality Spec change (spesifik untuk activeQualityMill & produk)
  const handleQualitySpecChange = (
    prod: string,
    param: keyof ProductQualitySpec,
    key: 'min' | 'max' | 'std',
    val: string
  ) => {
    const num = val === '' ? null : parseFloat(val);
    const updated = qualitySpecs.map(s => {
      if (s.millType === activeQualityMill && s.productType === prod) {
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

  const handleSaveQualitySpecs = async () => {
    const synced = syncQualitySpecsWithTargets(targets, qualitySpecs);
    setQualitySpecs(synced);
    saveStoredQualitySpecs(synced);
    await saveCloudQualitySpecs(synced);
    setSaveSuccess(true);
    setTargetDrySuccessMessage(`✅ Master Target Quality (${activeQualityMill}) berhasil disimpan ke Cloud DB!`);
    setTimeout(() => {
      setTargetDrySuccessMessage(null);
      setSaveSuccess(false);
    }, 3500);
  };

  // CGA settings change (spesifik untuk activeCgaMill & produk)
  const handleCgaChange = (id: string, field: 'cgaBrand' | 'dosagePpm' | 'notes', val: any) => {
    const updated = cgaSettings.map(c => {
      if (c.id === id) {
        return { ...c, [field]: field === 'dosagePpm' ? (parseInt(val) || 0) : val };
      }
      return c;
    });
    setCgaSettings(updated);
  };

  const handleSaveCga = async () => {
    const synced = syncCgaSettingsWithTargets(targets, cgaSettings);
    setCgaSettings(synced);
    saveStoredCgaSettings(synced);
    await saveCloudCgaSettings(synced);
    setSaveSuccess(true);
    setTargetDrySuccessMessage(`✅ Master CGA (${activeCgaMill}) berhasil disimpan ke Cloud DB!`);
    setTimeout(() => {
      setTargetDrySuccessMessage(null);
      setSaveSuccess(false);
    }, 3500);
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

  // Daftar produk referensi dari Master Target Dry untuk mesin yang dipilih pada Quality & CGA
  const qualityMillKey: MillType = activeQualityMill === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)';
  const referenceQualityProducts = Object.keys(targets[qualityMillKey] || {});

  const cgaMillKey: MillType = activeCgaMill === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)';
  const referenceCgaProducts = Object.keys(targets[cgaMillKey] || {});

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
            Tabel <strong>Master Target Dry Proporsi</strong> menjadi referensi utama produk untuk Tabel Target Quality & Master CGA.
          </p>
        </div>

        {/* Notifikasi Toast / Alert Hijau: Poin 5 */}
        {targetDrySuccessMessage ? (
          <div className="px-4 py-2 bg-emerald-100 border-2 border-emerald-500 text-emerald-900 font-bold text-xs sm:text-sm rounded-lg flex items-center gap-2 shadow-sm animate-pulse">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{targetDrySuccessMessage}</span>
          </div>
        ) : saveSuccess ? (
          <div className="px-3 py-1.5 bg-green-100 border border-green-400 text-green-900 font-bold text-xs rounded-lg flex items-center gap-1.5 animate-pulse">
            <Check className="w-4 h-4" />
            <span>Perubahan Master Tersimpan!</span>
          </div>
        ) : null}
      </div>

      {/* Sub-Tab Navigation inside Master Data (Solid buttons) */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200 border-2 border-slate-400 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveSubTab('targets')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'targets'
              ? 'bg-[#E31E24] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>1. Target Dry Proporsi (Master Referensi)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('quality')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
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
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
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
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
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
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
            {/* Elongated & Dynamic Sub-tabel Switcher: Master Target Dry TM vs VRM */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200 border-2 border-slate-400 rounded-xl w-full lg:w-auto lg:min-w-[460px] xl:min-w-[520px] shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setActiveMill('Tube Mill (TM)')}
                className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeMill === 'Tube Mill (TM)'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md border border-amber-700 scale-[1.01]'
                    : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
                }`}
              >
                <Factory className={`w-4 h-4 shrink-0 ${activeMill === 'Tube Mill (TM)' ? 'text-white' : 'text-amber-600'}`} />
                <span>MASTER DRY — TM</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMill('Vertical Roller Mill (VRM)')}
                className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeMill === 'Vertical Roller Mill (VRM)'
                    ? 'bg-gradient-to-r from-[#0284C7] to-sky-700 text-white shadow-md border border-sky-800 scale-[1.01]'
                    : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
                }`}
              >
                <Factory className={`w-4 h-4 shrink-0 ${activeMill === 'Vertical Roller Mill (VRM)' ? 'text-white' : 'text-[#0284C7]'}`} />
                <span>MASTER DRY — VRM</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddProductModal(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Produk Baru</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTargets}
                className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Target Dry</span>
              </button>
            </div>
          </div>

          {/* Target Dry Table - Terisolasi per mesin TM vs VRM */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-700 text-white font-bold border-b border-slate-500">
                  <th className="py-2.5 px-3 border-r border-slate-500 w-36 font-sans">PRODUK (REFERENSI UTAMA)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">CLINKER (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">GYPSUM (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">LIMESTONE (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">TRASS (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">FLY ASH (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-right w-24">TOTAL</th>
                  <th className="py-2.5 px-3 text-center w-36 font-sans">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {Object.keys(targets[activeMill] || {}).map((prod) => {
                  const p = targets[activeMill][prod] || { clinker: 72, gypsum: 4, limestone: 14, trass: 5, flyAsh: 5 };
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
                      <td className={`py-2 px-3 border-r border-slate-300 text-right font-bold ${isValid ? 'text-[#16A34A] bg-green-50' : 'text-[#E31E24] bg-red-50'}`}>
                        {total.toFixed(1)}%
                      </td>
                      <td className="py-1.5 px-2 text-center bg-slate-50">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDry(prod)}
                            className="px-2.5 py-1 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title={`Edit Target Dry untuk ${prod}`}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingDryProduct({ product: prod, mill: activeMill })}
                            className="px-2.5 py-1 bg-[#E31E24] hover:bg-red-700 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title={`Hapus Produk ${prod} dari seluruh Master Data`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
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
      {/* SUB-TAB 2: TABEL TARGET QUALITY (MENGACU PADA MASTER TARGET DRY) */}
      {/* ============================================================== */}
      {activeSubTab === 'quality' && (
        <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
            {/* Elongated & Dynamic Sub-tabel Switcher: Target Quality TM vs VRM */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200 border-2 border-slate-400 rounded-xl w-full lg:w-auto lg:min-w-[460px] xl:min-w-[520px] shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setActiveQualityMill('TM')}
                className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeQualityMill === 'TM'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md border border-amber-700 scale-[1.01]'
                    : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
                }`}
              >
                <Factory className={`w-4 h-4 shrink-0 ${activeQualityMill === 'TM' ? 'text-white' : 'text-amber-600'}`} />
                <span>TARGET QUALITY — TM</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveQualityMill('VRM')}
                className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeQualityMill === 'VRM'
                    ? 'bg-gradient-to-r from-[#0284C7] to-sky-700 text-white shadow-md border border-sky-800 scale-[1.01]'
                    : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
                }`}
              >
                <Factory className={`w-4 h-4 shrink-0 ${activeQualityMill === 'VRM' ? 'text-white' : 'text-[#0284C7]'}`} />
                <span>TARGET QUALITY — VRM</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-2 bg-sky-50 border border-sky-300 text-sky-900 text-[11px] font-bold rounded-lg flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Referensi Produk: Master Target Dry ({activeQualityMill})</span>
              </span>

              <button
                type="button"
                onClick={handleSaveQualitySpecs}
                className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Target Quality ({activeQualityMill})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-700 text-white font-bold border-b border-slate-500">
                  <th className="py-2.5 px-3 border-r border-slate-500 w-36 font-sans">PRODUK ({activeQualityMill})</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={3}>BLAINE (cm²/gr)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={3}>R45 (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={2}>H2O (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={3}>SO3 (%)</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 text-center" colSpan={2}>F-CaO (%)</th>
                  <th className="py-2.5 px-3 text-center w-28 font-sans" rowSpan={2}>AKSI</th>
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
                {referenceQualityProducts.map((prod) => {
                  const spec =
                    qualitySpecs.find(
                      (s) => s.millType === activeQualityMill && s.productType.toUpperCase().trim() === prod.toUpperCase().trim()
                    ) ||
                    qualitySpecs.find((s) => s.productType.toUpperCase().trim() === prod.toUpperCase().trim());

                  if (!spec) return null;

                  return (
                    <tr key={`${activeQualityMill}_${prod}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-300 font-sans font-bold text-slate-900 bg-slate-50">
                        {prod}
                      </td>

                      {/* Blaine */}
                      <td className="p-0 border-r border-slate-300">
                        <input
                          type="number"
                          step="10"
                          value={spec.blaine.min ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'blaine', 'min', e.target.value)}
                          className="w-16 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="p-0 border-r border-slate-300 bg-amber-50/20">
                        <input
                          type="number"
                          step="10"
                          value={spec.blaine.std ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'blaine', 'std', e.target.value)}
                          className="w-16 px-1.5 py-1.5 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="p-0 border-r border-slate-300">
                        <input
                          type="number"
                          step="10"
                          value={spec.blaine.max ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'blaine', 'max', e.target.value)}
                          className="w-16 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>

                      {/* R45 */}
                      <td className="p-0 border-r border-slate-300">
                        <input
                          type="number"
                          step="0.1"
                          value={spec.residuR45.min ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'residuR45', 'min', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="p-0 border-r border-slate-300 bg-amber-50/20">
                        <input
                          type="number"
                          step="0.1"
                          value={spec.residuR45.std ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'residuR45', 'std', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="p-0 border-r border-slate-300">
                        <input
                          type="number"
                          step="0.1"
                          value={spec.residuR45.max ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'residuR45', 'max', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>

                      {/* H2O */}
                      <td className="p-0 border-r border-slate-300 bg-blue-50/20">
                        <input
                          type="number"
                          step="0.01"
                          value={spec.moistureH2O.std ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'moistureH2O', 'std', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="p-0 border-r border-slate-300">
                        <input
                          type="number"
                          step="0.01"
                          value={spec.moistureH2O.max ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'moistureH2O', 'max', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>

                      {/* SO3 */}
                      <td className="p-0 border-r border-slate-300">
                        <input
                          type="number"
                          step="0.05"
                          value={spec.so3.min ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'so3', 'min', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="p-0 border-r border-slate-300 bg-sky-50/20">
                        <input
                          type="number"
                          step="0.05"
                          value={spec.so3.std ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'so3', 'std', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono font-bold text-[#0284C7] bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="p-0 border-r border-slate-300">
                        <input
                          type="number"
                          step="0.05"
                          value={spec.so3.max ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'so3', 'max', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>

                      {/* F-CaO */}
                      <td className="p-0 border-r border-slate-300 bg-amber-50/20">
                        <input
                          type="number"
                          step="0.05"
                          value={spec.freelimeFCaO.std ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'freelimeFCaO', 'std', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono font-bold text-amber-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="p-0 border-r border-slate-300">
                        <input
                          type="number"
                          step="0.05"
                          value={spec.freelimeFCaO.max ?? ''}
                          onChange={(e) => handleQualitySpecChange(prod, 'freelimeFCaO', 'max', e.target.value)}
                          className="w-14 px-1.5 py-1.5 text-right font-mono text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center bg-slate-50">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditQuality({ ...spec, millType: activeQualityMill, productType: prod })}
                            className="px-3 py-1 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title={`Edit Target Quality untuk ${prod} (${activeQualityMill})`}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>
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
      {/* SUB-TAB 3: MASTER CGA (MENGACU PADA MASTER TARGET DRY) */}
      {/* ============================================================== */}
      {activeSubTab === 'cga' && (
        <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
            {/* Elongated & Dynamic Sub-tabel Switcher: Master CGA TM vs VRM */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200 border-2 border-slate-400 rounded-xl w-full lg:w-auto lg:min-w-[460px] xl:min-w-[520px] shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setActiveCgaMill('TM')}
                className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeCgaMill === 'TM'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md border border-amber-700 scale-[1.01]'
                    : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
                }`}
              >
                <Factory className={`w-4 h-4 shrink-0 ${activeCgaMill === 'TM' ? 'text-white' : 'text-amber-600'}`} />
                <span>MASTER CGA — TM</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCgaMill('VRM')}
                className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeCgaMill === 'VRM'
                    ? 'bg-gradient-to-r from-[#0284C7] to-sky-700 text-white shadow-md border border-sky-800 scale-[1.01]'
                    : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
                }`}
              >
                <Factory className={`w-4 h-4 shrink-0 ${activeCgaMill === 'VRM' ? 'text-white' : 'text-[#0284C7]'}`} />
                <span>MASTER CGA — VRM</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-2 bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-bold rounded-lg flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Referensi Produk: Master Target Dry ({activeCgaMill})</span>
              </span>

              <button
                type="button"
                onClick={() => setShowAddCgaModal(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Jenis CGA</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCga}
                className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Master CGA ({activeCgaMill})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-700 text-white font-bold border-b border-slate-500">
                  <th className="py-2.5 px-3 border-r border-slate-500 w-44 font-sans">PRODUK SEMEN ({activeCgaMill})</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 w-44">MEREK / JENIS CGA</th>
                  <th className="py-2.5 px-3 border-r border-slate-500 w-32 text-right">DOSIS STANDAR (PPM)</th>
                  <th className="py-2.5 px-3 font-sans">KETERANGAN TEKNIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {referenceCgaProducts.map((prod) => {
                  const cga =
                    cgaSettings.find(
                      (c) => c.millType === activeCgaMill && c.productType.toUpperCase().trim() === prod.toUpperCase().trim()
                    ) ||
                    cgaSettings.find((c) => c.productType.toUpperCase().trim() === prod.toUpperCase().trim());

                  if (!cga) return null;

                  return (
                    <tr key={cga.id || `${activeCgaMill}_${prod}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-300 font-sans font-bold text-slate-900 bg-slate-50">
                        {prod}
                      </td>

                      <td className="p-0 border-r border-slate-300">
                        <select
                          value={cga.cgaBrand}
                          onChange={(e) => handleCgaChange(cga.id, 'cgaBrand', e.target.value)}
                          className="w-full p-2 bg-transparent border-0 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none cursor-pointer"
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
                  );
                })}
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

      {/* Modal: Edit Target Dry (Poin 3) */}
      {editingDryProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="px-5 py-4 bg-slate-800 text-white border-b-2 border-slate-600 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#0284C7]" />
                <span>Edit Target Dry: {editingDryProduct.product} ({editingDryProduct.mill === 'Tube Mill (TM)' ? 'TM' : 'VRM'})</span>
              </h3>
              <button onClick={() => setEditingDryProduct(null)} className="text-slate-300 hover:text-white p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDryModal} className="p-5 space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
                <div className="text-slate-800 font-bold mb-1">
                  Produk: <span className="text-[#0284C7] font-mono text-sm">{editingDryProduct.product}</span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Unit: {editingDryProduct.mill}
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  Sesuaikan Persentase Formulasi (% Dry Base):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-lg border-2 border-slate-300">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-bold mb-0.5">Clinker (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingDryProduct.clinker}
                      onChange={(e) => setEditingDryProduct({ ...editingDryProduct, clinker: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border-2 border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 font-bold mb-0.5">Gypsum (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingDryProduct.gypsum}
                      onChange={(e) => setEditingDryProduct({ ...editingDryProduct, gypsum: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border-2 border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 font-bold mb-0.5">Limestone (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingDryProduct.limestone}
                      onChange={(e) => setEditingDryProduct({ ...editingDryProduct, limestone: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border-2 border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 font-bold mb-0.5">Trass (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingDryProduct.trass}
                      onChange={(e) => setEditingDryProduct({ ...editingDryProduct, trass: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border-2 border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 font-bold mb-0.5">Fly Ash (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingDryProduct.flyAsh}
                      onChange={(e) => setEditingDryProduct({ ...editingDryProduct, flyAsh: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border-2 border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-800 font-bold mb-0.5">Total (%)</label>
                    {(() => {
                      const total = editingDryProduct.clinker + editingDryProduct.gypsum + editingDryProduct.limestone + editingDryProduct.trass + editingDryProduct.flyAsh;
                      const isValid = Math.abs(total - 100.0) < 0.1;
                      return (
                        <div className={`p-2 font-mono font-bold text-right rounded-lg text-xs ${
                          isValid 
                            ? 'bg-green-100 text-green-800 border-2 border-green-500' 
                            : 'bg-red-100 text-red-800 border-2 border-red-500'
                        }`}>
                          {total.toFixed(1)}% {isValid ? '✓' : '⚠️'}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDryProduct(null)}
                  className="px-4 py-2 text-white bg-[#334155] hover:bg-slate-800 rounded-lg font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  Simpan Perubahan Target Dry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Target Dry (Poin 3) */}
      {deletingDryProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="bg-slate-800 px-5 py-4 border-b-2 border-slate-600 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#E31E24]" />
                <h3 className="text-sm font-bold uppercase">Konfirmasi Hapus Target Dry</h3>
              </div>
              <button 
                onClick={() => setDeletingDryProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <p className="text-slate-700 leading-relaxed">
                Apakah Anda yakin ingin menghapus data Target Dry untuk produk <strong className="text-slate-900 font-mono">[{deletingDryProduct.product}]</strong> pada <strong className="text-slate-900 font-mono">[{deletingDryProduct.mill}]</strong>?
              </p>
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>Data proporsi standar untuk produk ini akan dihapus dari konfigurasi aktif penggilingan.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeletingDryProduct(null)}
                  className="px-4 py-2 bg-[#334155] hover:bg-slate-800 text-white font-bold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteDry}
                  className="px-4 py-2 bg-[#E31E24] hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Target Dry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Target Quality (Poin 3) */}
      {editingQualitySpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="px-5 py-4 bg-slate-800 text-white border-b-2 border-slate-600 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Beaker className="w-4 h-4 text-[#0284C7]" />
                <span>Edit Target Quality: {editingQualitySpec.productType}</span>
              </h3>
              <button onClick={() => setEditingQualitySpec(null)} className="text-slate-300 hover:text-white p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditQualityModal} className="p-5 space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
                <div className="text-slate-800 font-bold mb-0.5">
                  Produk: <span className="text-[#0284C7] font-mono text-sm">{editingQualitySpec.productType}</span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Atur batas Min, Target Standard (STD), dan Max untuk kendali mutu laboratorium.
                </div>
              </div>

              {/* Parameter 1: Blaine */}
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>BLAINE (cm²/gr)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Kehalusan</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MIN</label>
                    <input
                      type="number"
                      step="10"
                      value={editingQualitySpec.blaine.min ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        blaine: { ...editingQualitySpec.blaine, min: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right"
                      placeholder="Min"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-700 font-bold mb-0.5">STD (Target)</label>
                    <input
                      type="number"
                      step="10"
                      value={editingQualitySpec.blaine.std ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        blaine: { ...editingQualitySpec.blaine, std: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-amber-50 border-2 border-amber-400 rounded-lg font-mono font-bold text-right text-amber-900"
                      placeholder="Std"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                    <input
                      type="number"
                      step="10"
                      value={editingQualitySpec.blaine.max ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        blaine: { ...editingQualitySpec.blaine, max: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right"
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>

              {/* Parameter 2: R45 */}
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>RESIDU R45 (%)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Saringan 45 mikron</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MIN</label>
                    <input
                      type="number"
                      step="0.05"
                      value={editingQualitySpec.residuR45.min ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        residuR45: { ...editingQualitySpec.residuR45, min: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right"
                      placeholder="Min"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-700 font-bold mb-0.5">STD (Target)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={editingQualitySpec.residuR45.std ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        residuR45: { ...editingQualitySpec.residuR45, std: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-amber-50 border-2 border-amber-400 rounded-lg font-mono font-bold text-right text-amber-900"
                      placeholder="Std"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                    <input
                      type="number"
                      step="0.05"
                      value={editingQualitySpec.residuR45.max ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        residuR45: { ...editingQualitySpec.residuR45, max: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right"
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>

              {/* Parameter 3: H2O & SO3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* H2O */}
                <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 text-xs">
                    <span>H2O MOISTURE (%)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-blue-700 font-bold mb-0.5">STD</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingQualitySpec.moistureH2O.std ?? ''}
                        onChange={(e) => setEditingQualitySpec({
                          ...editingQualitySpec,
                          moistureH2O: { ...editingQualitySpec.moistureH2O, std: e.target.value === '' ? null : parseFloat(e.target.value) }
                        })}
                        className="w-full p-2 bg-blue-50 border-2 border-blue-400 rounded-lg font-mono font-bold text-right text-blue-900"
                        placeholder="Std"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingQualitySpec.moistureH2O.max ?? ''}
                        onChange={(e) => setEditingQualitySpec({
                          ...editingQualitySpec,
                          moistureH2O: { ...editingQualitySpec.moistureH2O, max: e.target.value === '' ? null : parseFloat(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>

                {/* F-CaO */}
                <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 text-xs">
                    <span>F-CaO FREELIME (%)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-amber-700 font-bold mb-0.5">STD</label>
                      <input
                        type="number"
                        step="0.05"
                        value={editingQualitySpec.freelimeFCaO.std ?? ''}
                        onChange={(e) => setEditingQualitySpec({
                          ...editingQualitySpec,
                          freelimeFCaO: { ...editingQualitySpec.freelimeFCaO, std: e.target.value === '' ? null : parseFloat(e.target.value) }
                        })}
                        className="w-full p-2 bg-amber-50 border-2 border-amber-400 rounded-lg font-mono font-bold text-right text-amber-900"
                        placeholder="Std"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                      <input
                        type="number"
                        step="0.05"
                        value={editingQualitySpec.freelimeFCaO.max ?? ''}
                        onChange={(e) => setEditingQualitySpec({
                          ...editingQualitySpec,
                          freelimeFCaO: { ...editingQualitySpec.freelimeFCaO, max: e.target.value === '' ? null : parseFloat(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameter 4: SO3 */}
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>SO3 (%)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Sulfur Trioksida</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MIN</label>
                    <input
                      type="number"
                      step="0.05"
                      value={editingQualitySpec.so3.min ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        so3: { ...editingQualitySpec.so3, min: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right"
                      placeholder="Min"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-sky-700 font-bold mb-0.5">STD (Target)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={editingQualitySpec.so3.std ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        so3: { ...editingQualitySpec.so3, std: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-sky-50 border-2 border-sky-400 rounded-lg font-mono font-bold text-right text-sky-900"
                      placeholder="Std"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                    <input
                      type="number"
                      step="0.05"
                      value={editingQualitySpec.so3.max ?? ''}
                      onChange={(e) => setEditingQualitySpec({
                        ...editingQualitySpec,
                        so3: { ...editingQualitySpec.so3, max: e.target.value === '' ? null : parseFloat(e.target.value) }
                      })}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right"
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQualitySpec(null)}
                  className="px-4 py-2 text-white bg-[#334155] hover:bg-slate-800 rounded-lg font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  Simpan Perubahan Target Quality
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Target Quality (Poin 3) */}
      {deletingQualitySpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="bg-slate-800 px-5 py-4 border-b-2 border-slate-600 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#E31E24]" />
                <h3 className="text-sm font-bold uppercase">Konfirmasi Hapus Target Quality</h3>
              </div>
              <button 
                onClick={() => setDeletingQualitySpec(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <p className="text-slate-700 leading-relaxed">
                Apakah Anda yakin ingin menghapus standar mutu kualitas untuk produk <strong className="text-slate-900 font-mono">[{deletingQualitySpec.productType}]</strong>?
              </p>
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>Batas standar kontrol Blaine, R45, H2O, SO3, dan F-CaO untuk produk ini akan dihapus dari sistem.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeletingQualitySpec(null)}
                  className="px-4 py-2 bg-[#334155] hover:bg-slate-800 text-white font-bold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteQuality}
                  className="px-4 py-2 bg-[#E31E24] hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Target Quality</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Produk Baru (Target Quality) */}
      {showAddQualityProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="px-5 py-4 bg-slate-800 text-white border-b-2 border-slate-600 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Beaker className="w-4 h-4 text-[#0284C7]" />
                <span>+ Tambah Produk Baru & Target Mutu (Quality)</span>
              </h3>
              <button 
                onClick={() => setShowAddQualityProductModal(false)} 
                className="text-slate-300 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQualityProduct} className="p-5 space-y-4 text-xs font-sans max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    Tipe Mesin (Mill) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newQMill}
                    onChange={(e) => {
                      const val = e.target.value as 'TM' | 'VRM' | 'BOTH';
                      setNewQMill(val);
                      setNewQProdName('');
                    }}
                    className="w-full p-2 bg-white border border-slate-400 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="TM">Tube Mill (TM)</option>
                    <option value="VRM">Vertical Roller Mill (VRM)</option>
                    <option value="BOTH">Keduanya (TM & VRM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    Pilih Produk Terdaftar di Target Dry ({newQMill}) <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newQProdName}
                    onChange={(e) => setNewQProdName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-400 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="">-- Pilih Produk Terdaftar di {newQMill} --</option>
                    {(() => {
                      const tmProds = Object.keys(targets['Tube Mill (TM)'] || {});
                      const vrmProds = Object.keys(targets['Vertical Roller Mill (VRM)'] || {});
                      const availableProds = newQMill === 'TM' 
                        ? tmProds 
                        : newQMill === 'VRM' 
                        ? vrmProds 
                        : Array.from(new Set([...tmProds, ...vrmProds]));
                      return availableProds.map(prod => (
                        <option key={prod} value={prod}>{prod}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              {/* Parameter 1: Blaine */}
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>BLAINE (cm²/gr)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Kehalusan Partikel</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MIN</label>
                    <input
                      type="number"
                      step="10"
                      required
                      value={newQBlaineMin}
                      onChange={(e) => setNewQBlaineMin(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-700 font-bold mb-0.5">STD (Target)</label>
                    <input
                      type="number"
                      step="10"
                      required
                      value={newQBlaineStd}
                      onChange={(e) => setNewQBlaineStd(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-amber-50 border-2 border-amber-400 rounded-lg font-mono font-bold text-right text-amber-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                    <input
                      type="number"
                      step="10"
                      required
                      value={newQBlaineMax}
                      onChange={(e) => setNewQBlaineMax(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Parameter 2: Residu 45um */}
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>RESIDU 45um (%)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Saringan Ayakan R45</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MIN</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newQR45Min}
                      onChange={(e) => setNewQR45Min(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-700 font-bold mb-0.5">STD (Target)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newQR45Std}
                      onChange={(e) => setNewQR45Std(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-amber-50 border-2 border-amber-400 rounded-lg font-mono font-bold text-right text-amber-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newQR45Max}
                      onChange={(e) => setNewQR45Max(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Parameter 3: H2O & F-CaO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* H2O */}
                <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 text-xs">
                    <span>H2O MOISTURE (%)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-blue-700 font-bold mb-0.5">STD</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newQH2oStd}
                        onChange={(e) => setNewQH2oStd(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-blue-50 border-2 border-blue-400 rounded-lg font-mono font-bold text-right text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newQH2oMax}
                        onChange={(e) => setNewQH2oMax(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* F-CaO */}
                <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 text-xs">
                    <span>F-CaO FREELIME (%)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-amber-700 font-bold mb-0.5">STD</label>
                      <input
                        type="number"
                        step="0.05"
                        required
                        value={newQFCaoStd}
                        onChange={(e) => setNewQFCaoStd(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-amber-50 border-2 border-amber-400 rounded-lg font-mono font-bold text-right text-amber-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                      <input
                        type="number"
                        step="0.05"
                        required
                        value={newQFCaoMax}
                        onChange={(e) => setNewQFCaoMax(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameter 4: SO3 */}
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>SO3 (%)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Sulfur Trioksida</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MIN</label>
                    <input
                      type="number"
                      step="0.05"
                      required
                      value={newQSo3Min}
                      onChange={(e) => setNewQSo3Min(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-sky-700 font-bold mb-0.5">STD (Target)</label>
                    <input
                      type="number"
                      step="0.05"
                      required
                      value={newQSo3Std}
                      onChange={(e) => setNewQSo3Std(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-sky-50 border-2 border-sky-400 rounded-lg font-mono font-bold text-right text-sky-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">MAX</label>
                    <input
                      type="number"
                      step="0.05"
                      required
                      value={newQSo3Max}
                      onChange={(e) => setNewQSo3Max(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-400 rounded-lg font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQualityProductModal(false)}
                  className="px-4 py-2 text-white bg-[#334155] hover:bg-slate-800 rounded-lg font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan Produk Baru ke Master Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Modal: Pop-up Dialog Konfirmasi Simpan Master Target Dry (Poin 5) */}
      {showConfirmSaveTargetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="bg-slate-800 px-5 py-4 border-b-2 border-slate-600 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Konfirmasi Simpan Target Dry</h3>
              </div>
              <button 
                onClick={() => setShowConfirmSaveTargetsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold leading-relaxed">
                  Apakah Anda yakin ingin memperbarui Master Target Dry ini?
                </p>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                Pembaruan ini akan disimpan ke database master pabrik dan otomatis menjadi standar acuan formulasi baru bagi operator CCR di Tube Mill (TM) dan Vertical Roller Mill (VRM).
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConfirmSaveTargetsModal(false)}
                  className="px-4 py-2 bg-[#334155] hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExecuteSaveTargets}
                  className="px-5 py-2 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Ya, Simpan Master Target Dry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Top-Right Toast Alert (Poin 5) */}
      {targetDrySuccessMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xl border-2 border-white flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0" />
          <span>{targetDrySuccessMessage}</span>
        </div>
      )}

    </div>
  );
};

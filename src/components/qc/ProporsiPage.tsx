import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShiftSession, 
  MillType, 
  ProductType, 
  ProporsiConfig, 
  MasterTargetDryMap,
  MillSessionData,
  DEFAULT_SILO_OPTIONS
} from '../../types/qc';
import { calculateWetBase, checkOpcLimestoneWarning, formatIndonesianDateTitleCase } from '../../utils/qcCalculations';
import { renderCcrImage, dataUrlToBlob } from '../../utils/ccrCanvasRenderer';
import { getStoredProductList, getStoredCgaSettings, getStoredQualitySpecs, saveStoredCgaSettings, saveStoredQualitySpecs } from '../../services/qcStorage';
import { saveCloudSession, fetchCloudCgaSettings, fetchCloudQualitySpecs } from '../../services/qcApi';
import { 
  Camera, 
  Save, 
  RotateCcw, 
  Copy, 
  Download, 
  Clock, 
  Calendar,
  Factory, 
  Check, 
  X,
  Sliders,
  AlertCircle,
  Lock
} from 'lucide-react';

interface ProporsiPageProps {
  session: ShiftSession;
  masterTargets: MasterTargetDryMap;
  initialMill?: 'TM' | 'VRM';
  onUpdateSession: (updated: ShiftSession) => void;
  onSwitchTab: (tab: any) => void;
}

interface MillFormState {
  productType: ProductType;
  siloName: string;
  tphCapacity: number;
  admixtureName: string;
  admixturePpm: number;
  bufferMaterial: 'trass' | 'clinker' | 'limestone';
  appliedHour: string;
  dryValues: {
    clinker: number | '';
    gypsum: number | '';
    limestone: number | '';
    trass: number | '';
    flyAsh: number | '';
  };
  h2oValues: {
    clinker: number | '';
    gypsum: number | '';
    limestone: number | '';
    trass: number | '';
    flyAsh: number | '';
  };
  isUserCustomized: boolean;
}

function findCgaForMillAndProduct(millCode: 'TM' | 'VRM', prod: string): { cgaBrand: string; dosagePpm: number } {
  try {
    const cgaSettings = getStoredCgaSettings();
    const targetProd = (prod || '').toUpperCase().trim();
    // 1. Cari yang spesifik sesuai millType ('TM' atau 'VRM')
    const exactMatch = cgaSettings.find(
      (c) => c.millType === millCode && c.productType.toUpperCase().trim() === targetProd
    );
    if (exactMatch) {
      return { cgaBrand: exactMatch.cgaBrand, dosagePpm: exactMatch.dosagePpm };
    }
    // 2. Fallback ke entri produk yang belum memiliki millType spesifik
    const fallbackMatch = cgaSettings.find(
      (c) => (!c.millType || c.millType === millCode) && c.productType.toUpperCase().trim() === targetProd
    );
    if (fallbackMatch) {
      return { cgaBrand: fallbackMatch.cgaBrand, dosagePpm: fallbackMatch.dosagePpm };
    }
  } catch (e) {
    console.error('Error finding CGA setting:', e);
  }
  return { cgaBrand: 'SIKA', dosagePpm: 400 };
}

function getSiStandardDry(
  masterTargets: MasterTargetDryMap,
  millCode: 'TM' | 'VRM',
  productType: string
): { clinker: number; gypsum: number; limestone: number; trass: number; flyAsh: number } {
  const millType: MillType = millCode === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)';
  const millMap = masterTargets?.[millType] || {};
  const exact = millMap[productType];
  if (exact) return { ...exact };

  const caseInsensitiveKey = Object.keys(millMap).find(
    (k) => k.toUpperCase().trim() === (productType || '').toUpperCase().trim()
  );
  if (caseInsensitiveKey && millMap[caseInsensitiveKey]) {
    return { ...millMap[caseInsensitiveKey] };
  }

  const firstKey = Object.keys(millMap)[0];
  if (firstKey && millMap[firstKey]) {
    return { ...millMap[firstKey] };
  }

  return millCode === 'TM'
    ? { clinker: 57.8, gypsum: 3.4, limestone: 18.8, trass: 15.0, flyAsh: 5.0 }
    : { clinker: 57.8, gypsum: 2.8, limestone: 8.0, trass: 26.4, flyAsh: 5.0 };
}

function buildInitialMillFormState(
  millCode: 'TM' | 'VRM',
  session: ShiftSession,
  masterTargets: MasterTargetDryMap
): MillFormState {
  const millType: MillType = millCode === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)';
  const millData: MillSessionData = millCode === 'TM' ? session.tm : session.vrm;
  const startHour = millData?.hourlyRows?.[0]?.hour || '08:00';

  // 1. Cek apakah analis sudah pernah mengaktifkan proporsi pada shift ini
  const validHistory = (millData?.proporsiHistory || []).filter(
    (p) => p && p.id && !p.id.startsWith('prop_tm_init') && !p.id.startsWith('prop_vrm_init')
  );
  const latestProp = validHistory.length > 0 ? validHistory[validHistory.length - 1] : null;

  if (latestProp) {
    const cga = findCgaForMillAndProduct(millCode, latestProp.productType);
    const bufferMat: 'trass' | 'clinker' | 'limestone' =
      latestProp.materials.trass.dry === 0 && latestProp.materials.limestone.dry > 0 ? 'limestone' : 'trass';

    return {
      productType: latestProp.productType,
      siloName: latestProp.siloName || (millCode === 'TM' ? 'SILO 5' : 'SILO 4'),
      tphCapacity: latestProp.tphFeeding || millData.tphFeeding || 100.0,
      admixtureName: latestProp.admixtureName || cga.cgaBrand,
      admixturePpm: latestProp.admixturePpm ?? cga.dosagePpm,
      bufferMaterial: bufferMat,
      appliedHour: latestProp.appliedAtHour || startHour,
      dryValues: {
        clinker: latestProp.materials.clinker.dry,
        gypsum: latestProp.materials.gypsum.dry,
        limestone: latestProp.materials.limestone.dry,
        trass: latestProp.materials.trass.dry,
        flyAsh: latestProp.materials.flyAsh.dry,
      },
      h2oValues: {
        clinker: latestProp.materials.clinker.h2o ?? 0.0,
        gypsum: session.moistureWf?.gypsum ?? latestProp.materials.gypsum.h2o ?? 2.8,
        limestone: session.moistureWf?.limestone ?? latestProp.materials.limestone.h2o ?? 7.2,
        trass: session.moistureWf?.trass ?? latestProp.materials.trass.h2o ?? 4.8,
        flyAsh: latestProp.materials.flyAsh.h2o ?? 0.0,
      },
      isUserCustomized: true,
    };
  }

  // 2. Cek apakah ada draft form yang sedang diedit analis pada shift ini di localStorage
  const draftKey = `qc_proporsi_draft_${session.date}_${session.shiftName}_${millCode}`;
  try {
    const rawDraft = localStorage.getItem(draftKey);
    if (rawDraft) {
      const parsedDraft = JSON.parse(rawDraft) as MillFormState;
      if (parsedDraft && parsedDraft.isUserCustomized && parsedDraft.productType) {
        return parsedDraft;
      }
    }
  } catch (e) {}

  // 3. Jika belum ada proporsi aktif & belum diedit user, ambil 100% dari Master Data SI
  const millProducts = Object.keys(masterTargets?.[millType] || {});
  const defaultProduct =
    millData?.productType && masterTargets?.[millType]?.[millData.productType]
      ? millData.productType
      : millProducts[0] || 'PCC Plus FA';

  const siDry = getSiStandardDry(masterTargets, millCode, defaultProduct);
  const cga = findCgaForMillAndProduct(millCode, defaultProduct);
  const defaultBuffer: 'trass' | 'clinker' | 'limestone' =
    siDry.trass === 0 && siDry.limestone > 0 ? 'limestone' : 'trass';

  return {
    productType: defaultProduct,
    siloName: millData?.siloName || (millCode === 'TM' ? 'SILO 5' : 'SILO 4'),
    tphCapacity: millData?.tphFeeding && millData.tphFeeding > 0 ? millData.tphFeeding : 100.0,
    admixtureName: cga.cgaBrand,
    admixturePpm: cga.dosagePpm,
    bufferMaterial: defaultBuffer,
    appliedHour: startHour,
    dryValues: { ...siDry },
    h2oValues: {
      clinker: 0.0,
      gypsum: session.moistureWf?.gypsum || 2.8,
      limestone: session.moistureWf?.limestone || 7.2,
      trass: session.moistureWf?.trass || 4.8,
      flyAsh: 0.0,
    },
    isUserCustomized: false,
  };
}

export const ProporsiPage: React.FC<ProporsiPageProps> = ({
  session,
  masterTargets,
  initialMill = 'TM',
  onUpdateSession,
}) => {
  const [selectedMillCode, setSelectedMillCode] = useState<'TM' | 'VRM'>(initialMill);

  // State terisolasi penuh antara TM dan VRM agar berpindah tab/mesin tidak pernah mereset nilai!
  const [formStateTM, setFormStateTM] = useState<MillFormState>(() =>
    buildInitialMillFormState('TM', session, masterTargets)
  );
  const [formStateVRM, setFormStateVRM] = useState<MillFormState>(() =>
    buildInitialMillFormState('VRM', session, masterTargets)
  );

  // Simpan draft ke localStorage setiap kali ada perubahan yang dilakukan user
  useEffect(() => {
    try {
      const keyTM = `qc_proporsi_draft_${session.date}_${session.shiftName}_TM`;
      localStorage.setItem(keyTM, JSON.stringify(formStateTM));
    } catch (e) {}
  }, [formStateTM, session.date, session.shiftName]);

  useEffect(() => {
    try {
      const keyVRM = `qc_proporsi_draft_${session.date}_${session.shiftName}_VRM`;
      localStorage.setItem(keyVRM, JSON.stringify(formStateVRM));
    } catch (e) {}
  }, [formStateVRM, session.date, session.shiftName]);

  // Sinkronisasi otomatis apabila Master Data SI dari Supabase baru selesai dimuat dan form belum diubah manual oleh user
  useEffect(() => {
    const validTmHistory = (session.tm?.proporsiHistory || []).filter(
      (p) => p && p.id && !p.id.startsWith('prop_tm_init') && !p.id.startsWith('prop_vrm_init')
    );
    if (!formStateTM.isUserCustomized && validTmHistory.length === 0) {
      const siDryTM = getSiStandardDry(masterTargets, 'TM', formStateTM.productType);
      const cgaTM = findCgaForMillAndProduct('TM', formStateTM.productType);
      setFormStateTM((prev) => ({
        ...prev,
        dryValues: { ...siDryTM },
        admixtureName: cgaTM.cgaBrand,
        admixturePpm: cgaTM.dosagePpm,
        bufferMaterial: siDryTM.trass === 0 && siDryTM.limestone > 0 ? 'limestone' : 'trass',
      }));
    }

    const validVrmHistory = (session.vrm?.proporsiHistory || []).filter(
      (p) => p && p.id && !p.id.startsWith('prop_tm_init') && !p.id.startsWith('prop_vrm_init')
    );
    if (!formStateVRM.isUserCustomized && validVrmHistory.length === 0) {
      const siDryVRM = getSiStandardDry(masterTargets, 'VRM', formStateVRM.productType);
      const cgaVRM = findCgaForMillAndProduct('VRM', formStateVRM.productType);
      setFormStateVRM((prev) => ({
        ...prev,
        dryValues: { ...siDryVRM },
        admixtureName: cgaVRM.cgaBrand,
        admixturePpm: cgaVRM.dosagePpm,
        bufferMaterial: siDryVRM.trass === 0 && siDryVRM.limestone > 0 ? 'limestone' : 'trass',
      }));
    }
  }, [masterTargets]);

  // Sync CGA & Quality Specs dari Supabase saat halaman dibuka
  useEffect(() => {
    fetchCloudCgaSettings().then((settings) => {
      if (settings) {
        saveStoredCgaSettings(settings);
        const cgaTM = findCgaForMillAndProduct('TM', formStateTM.productType);
        const cgaVRM = findCgaForMillAndProduct('VRM', formStateVRM.productType);
        setFormStateTM((prev) => ({ ...prev, admixtureName: cgaTM.cgaBrand, admixturePpm: cgaTM.dosagePpm }));
        setFormStateVRM((prev) => ({ ...prev, admixtureName: cgaVRM.cgaBrand, admixturePpm: cgaVRM.dosagePpm }));
      }
    });
    fetchCloudQualitySpecs().then((specs) => {
      if (specs) saveStoredQualitySpecs(specs);
    });
  }, []);

  const millType: MillType = selectedMillCode === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)';
  const currentMillData: MillSessionData = selectedMillCode === 'TM' ? session.tm : session.vrm;
  const activeForm: MillFormState = selectedMillCode === 'TM' ? formStateTM : formStateVRM;

  const updateActiveForm = (updater: (prev: MillFormState) => MillFormState) => {
    if (selectedMillCode === 'TM') {
      setFormStateTM(updater);
    } else {
      setFormStateVRM(updater);
    }
  };

  // Daftar produk mengikuti Master Target Dry SI pada mesin yang dipilih
  const availableProducts = useMemo(() => {
    const millTargetKeys = Object.keys(masterTargets?.[millType] || {});
    if (millTargetKeys.length > 0) {
      return millTargetKeys;
    }
    return getStoredProductList();
  }, [masterTargets, millType]);

  const defaultStandard = useMemo(
    () => getSiStandardDry(masterTargets, selectedMillCode, activeForm.productType),
    [masterTargets, selectedMillCode, activeForm.productType]
  );

  // Real-time Clock for Header and CCR Card
  const [currentClock, setCurrentClock] = useState(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    return `${formatIndonesianDateTitleCase(session.date)}, ${timeStr} WIB`;
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
      setCurrentClock(`${formatIndonesianDateTitleCase(session.date)}, ${timeStr} WIB`);
    };
    const timer = setInterval(updateTime, 5000);
    return () => clearInterval(timer);
  }, [session.date]);

  // Share CCR Image States
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const {
    productType,
    siloName,
    tphCapacity,
    admixtureName,
    admixturePpm,
    bufferMaterial,
    appliedHour,
    dryValues,
    h2oValues,
  } = activeForm;

  // Live calculation of Wet Base
  const calculation = calculateWetBase(
    {
      clinker: {
        dry: typeof dryValues.clinker === 'number' ? dryValues.clinker : 0,
        h2o: typeof h2oValues.clinker === 'number' ? h2oValues.clinker : 0,
      },
      gypsum: {
        dry: typeof dryValues.gypsum === 'number' ? dryValues.gypsum : 0,
        h2o: typeof h2oValues.gypsum === 'number' ? h2oValues.gypsum : 0,
      },
      limestone: {
        dry: typeof dryValues.limestone === 'number' ? dryValues.limestone : 0,
        h2o: typeof h2oValues.limestone === 'number' ? h2oValues.limestone : 0,
      },
      trass: {
        dry: typeof dryValues.trass === 'number' ? dryValues.trass : 0,
        h2o: typeof h2oValues.trass === 'number' ? h2oValues.trass : 0,
      },
      flyAsh: {
        dry: typeof dryValues.flyAsh === 'number' ? dryValues.flyAsh : 0,
        h2o: typeof h2oValues.flyAsh === 'number' ? h2oValues.flyAsh : 0,
      },
    },
    bufferMaterial,
    productType
  );

  const opcLimestoneDry = typeof dryValues.limestone === 'number' ? dryValues.limestone : 0;
  const opcWarning = checkOpcLimestoneWarning(productType, opcLimestoneDry);

  const scaleFactor = tphCapacity > 0 ? tphCapacity / 100.0 : 1.0;

  const materialsList = [
    { key: 'clinker' as const, label: 'CLINKER', item: calculation.clinker, isBuffer: bufferMaterial === 'clinker' },
    { key: 'gypsum' as const, label: 'GYPSUM', item: calculation.gypsum },
    {
      key: 'limestone' as const,
      label: 'LIMESTONE',
      item: calculation.limestone,
      isBuffer: calculation.limestone.dry > 0 && (calculation.trass.dry === 0 || bufferMaterial === 'limestone'),
    },
    {
      key: 'trass' as const,
      label: 'TRASS',
      item: calculation.trass,
      isBuffer: calculation.trass.dry > 0 && bufferMaterial === 'trass',
    },
    { key: 'flyAsh' as const, label: 'FLY ASH', item: calculation.flyAsh },
  ];

  const itemsWithWBasah = materialsList.map((m) => {
    const rawW = m.item.wBasah ?? 0;
    const wBasahScaled = Number((rawW * scaleFactor).toFixed(1));
    return {
      ...m,
      wBasah: wBasahScaled,
    };
  });

  const totalWBasahFormatted = (calculation.totalMassaBasah * scaleFactor).toFixed(1);
  const airMenguapFormatted = (calculation.airMenguap * scaleFactor).toFixed(1);

  const isOverride =
    dryValues.clinker !== defaultStandard.clinker ||
    dryValues.gypsum !== defaultStandard.gypsum ||
    dryValues.limestone !== defaultStandard.limestone ||
    dryValues.trass !== defaultStandard.trass ||
    dryValues.flyAsh !== defaultStandard.flyAsh;

  // Saat analis mengganti Jenis Produk pada mesin aktif, tarik standar %Dry & CGA dari Master SI untuk mesin tsb
  const handleProductChange = (newProd: ProductType) => {
    const siDry = getSiStandardDry(masterTargets, selectedMillCode, newProd);
    const cga = findCgaForMillAndProduct(selectedMillCode, newProd);
    const nextBuffer: 'trass' | 'clinker' | 'limestone' =
      siDry.trass === 0 && siDry.limestone > 0 ? 'limestone' : 'trass';

    updateActiveForm((prev) => ({
      ...prev,
      productType: newProd,
      admixtureName: cga.cgaBrand,
      admixturePpm: cga.dosagePpm,
      bufferMaterial: nextBuffer,
      dryValues: { ...siDry },
      isUserCustomized: true,
    }));
  };

  const handleResetToStandard = () => {
    const siDry = getSiStandardDry(masterTargets, selectedMillCode, productType);
    const cga = findCgaForMillAndProduct(selectedMillCode, productType);
    updateActiveForm((prev) => ({
      ...prev,
      dryValues: { ...siDry },
      admixtureName: cga.cgaBrand,
      admixturePpm: cga.dosagePpm,
      bufferMaterial: siDry.trass === 0 && siDry.limestone > 0 ? 'limestone' : 'trass',
      isUserCustomized: false,
    }));
  };

  const handleDryChange = (key: 'clinker' | 'gypsum' | 'limestone' | 'trass' | 'flyAsh', val: string) => {
    updateActiveForm((prev) => {
      if (val === '') {
        return {
          ...prev,
          dryValues: { ...prev.dryValues, [key]: '' },
          isUserCustomized: true,
        };
      }
      const num = parseFloat(val);
      return {
        ...prev,
        dryValues: { ...prev.dryValues, [key]: isNaN(num) ? '' : num },
        isUserCustomized: true,
      };
    });
  };

  const handleH2oChange = (key: 'clinker' | 'gypsum' | 'limestone' | 'trass' | 'flyAsh', val: string) => {
    updateActiveForm((prev) => {
      if (val === '') {
        return {
          ...prev,
          h2oValues: { ...prev.h2oValues, [key]: '' },
          isUserCustomized: true,
        };
      }
      const num = parseFloat(val);
      return {
        ...prev,
        h2oValues: { ...prev.h2oValues, [key]: isNaN(num) ? '' : num },
        isUserCustomized: true,
      };
    });
  };

  // Simpan & Aktifkan khusus pada mesin yang sedang dipilih (TM atau VRM)
  const handleSaveAndActivate = () => {
    if (!calculation.isValidDry || !calculation.isValidWet) {
      alert('Total Proporsi Dry dan Wet wajib tepat 100.0% sebelum dapat disimpan.');
      return;
    }

    const existingValidHistory = (currentMillData.proporsiHistory || []).filter(
      (p) => p && p.id && !p.id.startsWith('prop_tm_init') && !p.id.startsWith('prop_vrm_init')
    );

    const appliedIndex = currentMillData.hourlyRows.findIndex((r) => r.hour === appliedHour);
    const startIdx = appliedIndex !== -1 ? appliedIndex : 0;
    const prevHourLabel =
      startIdx > 0 ? currentMillData.hourlyRows[startIdx - 1]?.hour || appliedHour : appliedHour;
    const lastHourLabel = currentMillData.hourlyRows[currentMillData.hourlyRows.length - 1]?.hour || 'Selesai';

    // Pertahankan riwayat proporsi yang berlaku pada jam sebelum appliedHour (jika analis mengganti di jam yang sama, perbarui entri jam tersebut)
    const priorHistory = existingValidHistory.filter((p) => {
      const pIdx = currentMillData.hourlyRows.findIndex((r) => r.hour === p.appliedAtHour);
      return pIdx !== -1 && pIdx < startIdx;
    });

    const versionNum = priorHistory.length + 1;
    const newPropId = `prop_${selectedMillCode.toLowerCase()}_v${versionNum}_${Date.now()}`;
    const newPropLabel = `Proporsi ${versionNum} (${appliedHour} - ${lastHourLabel})`;

    const updatedHistory = priorHistory.map((p, idx) => {
      if (idx === priorHistory.length - 1) {
        const updatedEnd = prevHourLabel;
        return {
          ...p,
          versionNumber: idx + 1,
          endAtHour: updatedEnd,
          label: `Proporsi ${idx + 1} (${p.appliedAtHour} - ${updatedEnd})`,
        };
      }
      return {
        ...p,
        versionNumber: idx + 1,
      };
    });

    const newProp: ProporsiConfig = {
      id: newPropId,
      versionNumber: versionNum,
      label: newPropLabel,
      appliedAtHour: appliedHour,
      endAtHour: lastHourLabel,
      millType,
      productType,
      siloName,
      tphFeeding: tphCapacity,
      admixtureName,
      admixturePpm,
      materials: {
        clinker: calculation.clinker,
        gypsum: calculation.gypsum,
        limestone: calculation.limestone,
        trass: calculation.trass,
        flyAsh: calculation.flyAsh,
      },
      dryTotal: calculation.dryTotal,
      wetTotal: calculation.wetTotal,
      isSessionOverride: isOverride,
      savedAt: new Date().toISOString(),
    };

    updatedHistory.push(newProp);

    const propSummaryParts: string[] = [];
    if (calculation.clinker.dry > 0) propSummaryParts.push(`${calculation.clinker.dry}% Clk`);
    if (calculation.gypsum.dry > 0) propSummaryParts.push(`${calculation.gypsum.dry}% Gyp`);
    if (calculation.limestone.dry > 0) propSummaryParts.push(`${calculation.limestone.dry}% Lst`);
    if (calculation.trass.dry > 0) propSummaryParts.push(`${calculation.trass.dry}% Trass`);
    if (calculation.flyAsh.dry > 0) propSummaryParts.push(`${calculation.flyAsh.dry}% FA`);
    const propSummary = propSummaryParts.join(' | ');
    const admSummary = `${admixtureName} ${admixturePpm} PPM`;

    const updatedRows = currentMillData.hourlyRows.map((row, idx) => {
      if (idx >= startIdx) {
        return {
          ...row,
          productType,
          proporsiVersionId: newPropId,
          proporsiDisplay: propSummary,
          admixtureDisplay: admSummary,
          tph: row.tph ?? tphCapacity,
        };
      }
      return row;
    });

    const updatedMillData: MillSessionData = {
      ...currentMillData,
      productType,
      siloName,
      tphFeeding: tphCapacity,
      admixtureName,
      admixturePpm,
      hourlyRows: updatedRows,
      proporsiHistory: updatedHistory,
    };

    const updatedSession: ShiftSession = {
      ...session,
      [selectedMillCode === 'TM' ? 'tm' : 'vrm']: updatedMillData,
    };

    updateActiveForm((prev) => ({ ...prev, isUserCustomized: true }));
    onUpdateSession(updatedSession);
    saveCloudSession(updatedSession);

    alert(`✅ Proporsi untuk ${selectedMillCode} [${newPropLabel}] (${productType}) berhasil disimpan & diaktifkan mulai jam ${appliedHour}!`);
  };

  // Generate CCR Image via HTML5 Canvas renderer
  const handleGenerateCcrImage = async () => {
    setIsGeneratingImage(true);
    setShowShareModal(true);

    try {
      const specs = getStoredQualitySpecs();
      const spec =
        specs.find(
          (s) =>
            (s.millType === selectedMillCode || !s.millType) &&
            s.productType.toUpperCase().trim() === productType.toUpperCase().trim()
        ) ||
        specs.find((s) => s.productType.toUpperCase().trim() === productType.toUpperCase().trim());

      const targetQualitySummary = spec
        ? `Target: Blaine ${spec.blaine.min}-${spec.blaine.max} | R45 Max ${spec.residuR45.max}% | SO3 ${spec.so3.min}-${spec.so3.max}%`
        : undefined;

      const dataUrl = await renderCcrImage({
        date: session.date,
        shiftName: session.shiftName,
        appliedHour,
        millCode: selectedMillCode,
        millType,
        productType,
        siloName,
        admixtureName,
        admixturePpm,
        analystName: session.analystName,
        materials: calculation,
        dryTotal: calculation.dryTotal,
        wetTotal: calculation.wetTotal,
        totalMassaBasah: Number((calculation.totalMassaBasah * scaleFactor).toFixed(1)),
        airMenguap: Number((calculation.airMenguap * scaleFactor).toFixed(1)),
        opcWarning: opcWarning.hasWarning ? opcWarning.message : undefined,
        targetQualitySummary,
      });

      setGeneratedImageUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate CCR image:', err);
      alert('Gagal merender gambar CCR.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyImageToClipboard = async () => {
    if (!generatedImageUrl) return;
    try {
      const blob = dataUrlToBlob(generatedImageUrl);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      handleDownloadImage();
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    const a = document.createElement('a');
    a.href = generatedImageUrl;
    a.download = `Proporsi_CCR_${selectedMillCode}_${productType}_${session.date}.png`;
    a.click();
  };

  const validMillHistory = useMemo(() => {
    return (currentMillData.proporsiHistory || []).filter(
      (p) => p && p.id && !p.id.startsWith('prop_tm_init') && !p.id.startsWith('prop_vrm_init')
    );
  }, [currentMillData.proporsiHistory]);

  return (
    <div className="space-y-4 font-sans">

      {/* Target Mill & Product Controls Bar */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm space-y-3">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-800 text-white font-mono font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Tanggal & Jam Berlaku: <strong className="text-amber-300 font-bold">{currentClock}</strong></span>
            </span>
          </div>
          <div className="text-slate-600 text-xs font-mono flex items-center gap-2">
            <span>Shift: <strong className="text-slate-900">{session.shiftName}</strong></span>
            <span>•</span>
            <span>Analis: <strong className="text-slate-900">{session.analystName || 'Analis'}</strong></span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Elongated & Dynamic Dual-Mill Switcher for Setting Proporsi */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200 border-2 border-slate-400 rounded-xl w-full lg:w-auto lg:min-w-[440px] xl:min-w-[500px] shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => setSelectedMillCode('TM')}
              className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                selectedMillCode === 'TM'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md border border-amber-700 scale-[1.01]'
                  : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
              }`}
            >
              <Factory className={`w-4 h-4 shrink-0 ${selectedMillCode === 'TM' ? 'text-white' : 'text-amber-600'}`} />
              <span>TUBE MILL (TM)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMillCode('VRM')}
              className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                selectedMillCode === 'VRM'
                  ? 'bg-gradient-to-r from-[#0284C7] to-sky-700 text-white shadow-md border border-sky-800 scale-[1.01]'
                  : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
              }`}
            >
              <Factory className={`w-4 h-4 shrink-0 ${selectedMillCode === 'VRM' ? 'text-white' : 'text-[#0284C7]'}`} />
              <span>VERTICAL MILL (VRM)</span>
            </button>
          </div>

          {/* Product, Silo, Buffer, TPH Feeding & Reset */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Dynamic Product Dropdown from SI Master Data */}
            <select
              value={productType}
              onChange={(e) => handleProductChange(e.target.value as ProductType)}
              className="px-3 py-2 font-bold bg-slate-50 border-2 border-slate-400 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
            >
              {availableProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Default Silo Dropdown */}
            <select
              value={siloName}
              onChange={(e) =>
                updateActiveForm((prev) => ({
                  ...prev,
                  siloName: e.target.value,
                  isUserCustomized: true,
                }))
              }
              className="px-3 py-2 font-bold bg-slate-50 border-2 border-slate-400 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
            >
              {DEFAULT_SILO_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* TPH / Feeding CCR Input */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border-2 border-slate-400 rounded-lg text-slate-800">
              <span className="font-bold text-[11px] text-slate-600">TPH:</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                value={tphCapacity}
                onChange={(e) =>
                  updateActiveForm((prev) => ({
                    ...prev,
                    tphCapacity: parseFloat(e.target.value) || 0,
                    isUserCustomized: true,
                  }))
                }
                placeholder="100"
                className="w-14 bg-transparent font-mono font-bold text-xs text-slate-900 text-right focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono">t/h</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-400 rounded-lg text-slate-700">
              <span className="text-[11px] font-bold text-slate-600">Buffer:</span>
              <select
                value={bufferMaterial}
                onChange={(e) =>
                  updateActiveForm((prev) => ({
                    ...prev,
                    bufferMaterial: e.target.value as 'trass' | 'clinker' | 'limestone',
                    isUserCustomized: true,
                  }))
                }
                className="bg-transparent font-bold text-xs focus:outline-none text-slate-900 cursor-pointer"
              >
                <option value="trass">Trass</option>
                <option value="limestone">Limestone</option>
                <option value="clinker">Clinker</option>
              </select>
            </div>

            {isOverride ? (
              <button
                type="button"
                onClick={handleResetToStandard}
                className="px-2.5 py-2 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-400 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Kembalikan target ke standar Master SI"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Standar SI</span>
              </button>
            ) : (
              <span className="text-[11px] text-emerald-800 font-bold px-2.5 py-1.5 bg-emerald-50 rounded border border-emerald-300">
                Sesuai Master SI ({selectedMillCode})
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Quality Warning for OPC: Kandungan Limestone > 5.0% */}
      {opcWarning.hasWarning && (
        <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 flex items-start gap-2.5 text-xs font-semibold shadow-xs">
          <AlertCircle className="w-4 h-4 text-[#E31E24] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-red-700">Peringatan Komposisi OPC:</span> {opcWarning.message}
          </div>
        </div>
      )}

      {/* Main Calculation & Setpoint Feeder Card */}
      <div className="bg-white border-2 border-slate-500 rounded-xl shadow-sm overflow-hidden">
        
        {/* Card Header */}
        <div className="p-4 bg-slate-100 border-b-2 border-slate-400 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#E31E24]" />
              <span>HASIL SETPOINT FEEDER — {selectedMillCode}</span>
            </h2>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Input manual nilai %Wet ke feeder CCR · Basis Feeding {tphCapacity} ton/jam
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-200 border border-slate-400 text-slate-800 font-mono font-bold text-xs rounded-md shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>{currentClock}</span>
            </span>
            <span className="px-3 py-1 bg-red-100 border border-red-300 text-[#E31E24] font-bold text-xs rounded-md uppercase tracking-wider">
              WET BASE
            </span>
          </div>
        </div>

        {/* 5-Column Calculation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-600 text-white font-bold border-b-2 border-slate-500 select-none">
                <th className="py-2.5 px-3 w-40 border-r border-slate-500 font-sans">
                  MATERIAL
                </th>
                <th className="py-2.5 px-3 w-32 text-right border-r border-slate-500 bg-slate-700 text-amber-300">
                  %DRY
                </th>
                <th className="py-2.5 px-3 w-32 text-right border-r border-slate-500 bg-slate-700 text-sky-300">
                  MOIST (%)
                </th>
                <th className="py-2.5 px-3 w-32 text-right border-r border-slate-500">
                  W BASAH (t/h)
                </th>
                <th className="py-2.5 px-3 w-36 text-center bg-red-900/40 text-red-100 font-bold">
                  %WET (CCR)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {itemsWithWBasah.map((m) => (
                <tr key={m.key} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 border-r border-slate-300 font-sans font-bold text-slate-900">
                    <div className="flex items-center justify-between">
                      <span>{m.label}</span>
                      {m.isBuffer && (
                        <span className="text-[10px] font-sans font-medium text-[#0284C7] bg-sky-50 px-1 py-0.2 rounded border border-sky-300">
                          buffer
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-0 border-r border-slate-300 bg-amber-50/20">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="0.0"
                      value={dryValues[m.key] !== undefined && dryValues[m.key] !== null ? dryValues[m.key] : ''}
                      onChange={(e) => handleDryChange(m.key, e.target.value)}
                      className="w-full px-2.5 py-2 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                    />
                  </td>

                  <td className="p-0 border-r border-slate-300 bg-blue-50/20">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="0.0"
                      value={h2oValues[m.key] !== undefined && h2oValues[m.key] !== null ? h2oValues[m.key] : ''}
                      onChange={(e) => handleH2oChange(m.key, e.target.value)}
                      className="w-full px-2.5 py-2 text-right font-mono font-medium text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                    />
                  </td>

                  <td className="py-2 px-3 border-r border-slate-300 text-right font-bold text-slate-900">
                    {m.wBasah.toFixed(1)}
                  </td>

                  <td className="py-1.5 px-3 text-center">
                    <span className="inline-block px-3 py-1 bg-red-100 border border-red-300 text-[#E31E24] font-bold text-xs rounded font-mono shadow-2xs">
                      {m.item.wet.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}

              {/* Baris TOTAL */}
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                <td className="py-2.5 px-3 border-r border-slate-300 font-sans">
                  TOTAL
                </td>
                <td className="py-2.5 px-3 border-r border-slate-300 text-right font-bold text-[#16A34A]">
                  {calculation.dryTotal.toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 border-r border-slate-300 text-right text-slate-400 font-normal">
                  —
                </td>
                <td className="py-2.5 px-3 border-r border-slate-300 text-right font-bold text-slate-900">
                  {totalWBasahFormatted} t/h
                </td>
                <td className="py-1.5 px-3 text-center">
                  <span className="inline-block px-3 py-1 bg-red-200 border border-red-400 text-[#E31E24] font-bold text-xs rounded font-mono shadow-2xs">
                    {calculation.wetTotal.toFixed(1)}%
                  </span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* 2 Kotak Summary Bersanding: Total Massa Basah & Air Menguap (Mill) */}
        <div className="p-4 bg-slate-50 border-t-2 border-slate-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="bg-white border-2 border-slate-400 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Total Massa Basah (Input Feeder)
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 block mt-0.5">
                {totalWBasahFormatted} ton/jam
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Feeding mill actual
              </span>
            </div>

            <div className="bg-white border-2 border-slate-400 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Air Menguap (Mill)
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 block mt-0.5">
                {airMenguapFormatted} ton/jam
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Uap air cerobong
              </span>
            </div>

          </div>
        </div>

        {/* Admixture & Hour Controls Bar */}
        <div className="p-3.5 bg-slate-100 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-bold">Admixture (CGA)</label>
              <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 font-medium inline-flex items-center gap-1 font-mono">
                <Lock className="w-3 h-3 text-slate-500" />
                Terkunci Master SI
              </span>
            </div>
            <input
              type="text"
              readOnly
              value={admixtureName}
              placeholder="SIKA"
              className="w-full px-2.5 py-1.5 font-semibold bg-slate-100 border border-slate-300 rounded-lg text-slate-700 cursor-not-allowed select-none focus:outline-none"
              title="Jenis CGA terkunci otomatis sesuai Master CGA SI"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-bold">Dosis (PPM)</label>
              <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 font-medium inline-flex items-center gap-1 font-mono">
                <Lock className="w-3 h-3 text-slate-500" />
                Terkunci Master SI
              </span>
            </div>
            <input
              type="number"
              readOnly
              value={admixturePpm}
              placeholder="400"
              className="w-full px-2.5 py-1.5 font-mono font-semibold bg-slate-100 border border-slate-300 rounded-lg text-slate-700 cursor-not-allowed select-none focus:outline-none"
              title="Dosis PPM terkunci otomatis sesuai Master CGA SI"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Berlaku Mulai Jam</label>
            <select
              value={appliedHour}
              onChange={(e) =>
                updateActiveForm((prev) => ({
                  ...prev,
                  appliedHour: e.target.value,
                  isUserCustomized: true,
                }))
              }
              className="w-full px-2.5 py-1.5 font-mono font-bold bg-white border border-slate-400 rounded-lg focus:outline-none"
            >
              {currentMillData.hourlyRows.map((r) => (
                <option key={r.hour} value={r.hour}>
                  Jam {r.hour}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Solid Actions Bar */}
        <div className="p-3.5 bg-white border-t-2 border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-mono text-slate-700">
            Target Mill: <strong>{selectedMillCode}</strong> ·{' '}
            {calculation.isValidWet && calculation.isValidDry ? (
              <span className="text-[#16A34A] font-bold">100.0% Valid</span>
            ) : (
              <span className="text-[#E31E24] font-bold">Belum 100.0%</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateCcrImage}
              disabled={!calculation.isValidDry || !calculation.isValidWet}
              className="px-4 py-2 font-bold text-white bg-[#0284C7] hover:bg-sky-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Share ke CCR (Gambar)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndActivate}
              disabled={!calculation.isValidDry || !calculation.isValidWet}
              className="px-5 py-2 font-bold text-white bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan & Aktifkan ({selectedMillCode})</span>
            </button>
          </div>
        </div>

      </div>

      {/* Riwayat Proporsi Khusus Mill Ini */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pb-2 border-b border-slate-300">
          <Clock className="w-4 h-4 text-slate-600" />
          <span>Riwayat Proporsi {selectedMillCode} Shift Ini</span>
        </h3>

        {validMillHistory.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500 italic">
            Belum ada proporsi yang diaktifkan untuk {selectedMillCode} pada shift ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {validMillHistory.map((prop, idx) => {
              const m = prop.materials;
              const isLatest = idx === validMillHistory.length - 1;

              return (
                <div key={prop.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{prop.label}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-200 rounded font-mono">
                        {prop.productType} · {prop.siloName}
                      </span>
                      {isLatest && (
                        <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-[#16A34A] rounded">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-slate-700 text-[11px] mt-0.5">
                      Target Dry:{' '}
                      {[
                        m.clinker.dry > 0 && `${m.clinker.dry}% Clk`,
                        m.gypsum.dry > 0 && `${m.gypsum.dry}% Gyp`,
                        m.limestone.dry > 0 && `${m.limestone.dry}% Lst`,
                        m.trass.dry > 0 && `${m.trass.dry}% Trass`,
                        m.flyAsh.dry > 0 && `${m.flyAsh.dry}% FA`,
                      ]
                        .filter(Boolean)
                        .join(' | ')}
                    </div>
                    <div className="font-mono text-slate-500 text-[10px]">
                      Wet Base CCR:{' '}
                      {[
                        m.clinker.dry > 0 && `${m.clinker.wet}% Clk`,
                        m.gypsum.dry > 0 && `${m.gypsum.wet}% Gyp`,
                        m.limestone.dry > 0 && `${m.limestone.wet}% Lst`,
                        m.trass.dry > 0 && `${m.trass.wet}% Trass`,
                        m.flyAsh.dry > 0 && `${m.flyAsh.wet}% FA`,
                      ]
                        .filter(Boolean)
                        .join(' | ')}
                    </div>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    {prop.admixtureName} {prop.admixturePpm} PPM · {prop.tphFeeding || 100} t/h
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share to CCR Modal with Rendered PNG Preview */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border-2 border-slate-500 overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 text-white border-b-2 border-slate-600 flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#0284C7]" />
                <span>Gambar Setpoint Feeder CCR ({selectedMillCode})</span>
              </h3>
              <button 
                onClick={() => setShowShareModal(false)} 
                className="text-slate-300 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {isGeneratingImage ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <div className="animate-spin w-7 h-7 border-2 border-[#0284C7] border-t-transparent rounded-full mx-auto mb-2.5" />
                  Merender gambar CCR standar Semen Merah Putih...
                </div>
              ) : generatedImageUrl ? (
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-100 flex justify-center p-2 shadow-inner">
                  <img 
                    src={generatedImageUrl} 
                    alt="Proporsi CCR" 
                    className="max-h-80 w-auto object-contain rounded shadow-xs" 
                  />
                </div>
              ) : null}
            </div>

            <div className="px-4 py-3 bg-slate-100 border-t-2 border-slate-300 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-3 py-1.5 font-bold text-white bg-[#334155] hover:bg-slate-800 rounded-lg"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!generatedImageUrl}
                  className="px-3.5 py-1.5 font-bold text-white bg-[#0284C7] hover:bg-sky-700 disabled:opacity-40 rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  disabled={!generatedImageUrl}
                  className="px-4 py-1.5 font-bold text-white bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-40 rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin ke Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Gambar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

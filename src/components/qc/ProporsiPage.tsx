import React, { useState, useRef, useEffect } from 'react';
import { 
  ShiftSession, 
  MillType, 
  ProductType, 
  ProporsiConfig, 
  MasterTargetDryMap,
  MillSessionData
} from '../../types/qc';
import { calculateWetBase, formatIndonesianDate } from '../../utils/qcCalculations';
import { renderCcrImage, dataUrlToBlob } from '../../utils/ccrCanvasRenderer';
import { 
  CheckCircle, 
  AlertTriangle, 
  Camera, 
  Save, 
  RotateCcw, 
  Copy, 
  Download, 
  Clock, 
  Factory, 
  Check, 
  X,
  ArrowRight
} from 'lucide-react';

interface ProporsiPageProps {
  session: ShiftSession;
  masterTargets: MasterTargetDryMap;
  initialMill?: 'TM' | 'VRM';
  onUpdateSession: (updated: ShiftSession) => void;
  onSwitchTab: (tab: any) => void;
}

export const ProporsiPage: React.FC<ProporsiPageProps> = ({
  session,
  masterTargets,
  initialMill = 'TM',
  onUpdateSession,
  onSwitchTab,
}) => {
  // Mill Selection: TM (Mill 1) or VRM (Mill 2)
  const [selectedMillCode, setSelectedMillCode] = useState<'TM' | 'VRM'>(initialMill);

  const millType: MillType = selectedMillCode === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)';
  const currentMillData: MillSessionData = selectedMillCode === 'TM' ? session.tm : session.vrm;

  const [productType, setProductType] = useState<ProductType>(currentMillData.productType);
  const [siloName, setSiloName] = useState<string>(currentMillData.siloName);
  const [admixtureName, setAdmixtureName] = useState<string>(currentMillData.admixtureName);
  const [admixturePpm, setAdmixturePpm] = useState<number>(currentMillData.admixturePpm);
  const [bufferMaterial, setBufferMaterial] = useState<'trass' | 'clinker'>('trass');

  // Applied starting hour
  const [appliedHour, setAppliedHour] = useState<string>(() => {
    return currentMillData.hourlyRows[0]?.hour || '08:00';
  });

  // Keep state synced when switching between TM and VRM toggle
  useEffect(() => {
    const mill = selectedMillCode === 'TM' ? session.tm : session.vrm;
    setProductType(mill.productType);
    setSiloName(mill.siloName);
    setAdmixtureName(mill.admixtureName);
    setAdmixturePpm(mill.admixturePpm);

    const latestProp = mill.proporsiHistory[mill.proporsiHistory.length - 1];
    if (latestProp && latestProp.productType === mill.productType) {
      setDryValues({
        clinker: latestProp.materials.clinker.dry,
        gypsum: latestProp.materials.gypsum.dry,
        limestone: latestProp.materials.limestone.dry,
        trass: latestProp.materials.trass.dry,
        flyAsh: latestProp.materials.flyAsh.dry,
      });
      setH2oValues({
        clinker: latestProp.materials.clinker.h2o,
        gypsum: latestProp.materials.gypsum.h2o,
        limestone: latestProp.materials.limestone.h2o,
        trass: latestProp.materials.trass.h2o,
        flyAsh: latestProp.materials.flyAsh.h2o,
      });
    } else {
      const std = masterTargets[selectedMillCode === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)'][mill.productType];
      setDryValues({ ...std });
    }
  }, [selectedMillCode]);

  const defaultStandard = masterTargets[millType]?.[productType] || {
    clinker: 72.0, gypsum: 4.0, limestone: 14.0, trass: 5.0, flyAsh: 5.0
  };

  const [dryValues, setDryValues] = useState<{
    clinker: number;
    gypsum: number;
    limestone: number;
    trass: number;
    flyAsh: number;
  }>(() => {
    const latestProp = currentMillData.proporsiHistory[currentMillData.proporsiHistory.length - 1];
    if (latestProp && latestProp.productType === currentMillData.productType) {
      return {
        clinker: latestProp.materials.clinker.dry,
        gypsum: latestProp.materials.gypsum.dry,
        limestone: latestProp.materials.limestone.dry,
        trass: latestProp.materials.trass.dry,
        flyAsh: latestProp.materials.flyAsh.dry,
      };
    }
    return { ...defaultStandard };
  });

  const [h2oValues, setH2oValues] = useState<{
    clinker: number;
    gypsum: number;
    limestone: number;
    trass: number;
    flyAsh: number;
  }>({
    clinker: session.clinkerWf.h2o || 0.12,
    gypsum: session.moistureWf.gypsum || 4.25,
    limestone: session.moistureWf.limestone || 1.85,
    trass: session.moistureWf.trass || 4.80,
    flyAsh: 0.30,
  });

  // Share CCR Image States
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Live calculation of Wet Base
  const calculation = calculateWetBase({
    clinker: { dry: dryValues.clinker, h2o: h2oValues.clinker },
    gypsum: { dry: dryValues.gypsum, h2o: h2oValues.gypsum },
    limestone: { dry: dryValues.limestone, h2o: h2oValues.limestone },
    trass: { dry: dryValues.trass, h2o: h2oValues.trass },
    flyAsh: { dry: dryValues.flyAsh, h2o: h2oValues.flyAsh },
  }, bufferMaterial);

  const isOverride = 
    dryValues.clinker !== defaultStandard.clinker ||
    dryValues.gypsum !== defaultStandard.gypsum ||
    dryValues.limestone !== defaultStandard.limestone ||
    dryValues.trass !== defaultStandard.trass ||
    dryValues.flyAsh !== defaultStandard.flyAsh;

  const handleProductChange = (newProd: ProductType) => {
    setProductType(newProd);
    const standard = masterTargets[millType]?.[newProd] || {
      clinker: 72.0, gypsum: 4.0, limestone: 14.0, trass: 5.0, flyAsh: 5.0
    };
    setDryValues({ ...standard });
  };

  const handleResetToStandard = () => {
    const standard = masterTargets[millType]?.[productType];
    if (standard) {
      setDryValues({ ...standard });
    }
  };

  const handleDryChange = (key: 'clinker' | 'gypsum' | 'limestone' | 'trass' | 'flyAsh', val: string) => {
    const num = parseFloat(val);
    setDryValues(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  const handleH2oChange = (key: 'clinker' | 'gypsum' | 'limestone' | 'trass' | 'flyAsh', val: string) => {
    const num = parseFloat(val);
    setH2oValues(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  // Save & Activate specifically to the selected mill without touching the other mill
  const handleSaveAndActivate = () => {
    if (!calculation.isValidDry || !calculation.isValidWet) {
      alert('Total Proporsi Dry dan Wet wajib tepat 100.0% sebelum dapat disimpan.');
      return;
    }

    const versionNum = currentMillData.proporsiHistory.length + 1;
    const newPropId = `prop_${selectedMillCode.toLowerCase()}_v${versionNum}_${Date.now()}`;
    const newPropLabel = `Proporsi ${versionNum} (${appliedHour} - ${currentMillData.hourlyRows[currentMillData.hourlyRows.length - 1]?.hour || 'Selesai'})`;

    // Close previous proporsi end hour for this mill
    const updatedHistory = currentMillData.proporsiHistory.map((p, idx) => {
      if (idx === currentMillData.proporsiHistory.length - 1) {
        return { ...p, endAtHour: appliedHour };
      }
      return p;
    });

    const newProp: ProporsiConfig = {
      id: newPropId,
      versionNumber: versionNum,
      label: newPropLabel,
      appliedAtHour: appliedHour,
      endAtHour: currentMillData.hourlyRows[currentMillData.hourlyRows.length - 1]?.hour || 'Selesai',
      millType,
      productType,
      siloName,
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

    // Update hourly rows for this mill from appliedHour onwards
    const appliedIndex = currentMillData.hourlyRows.findIndex(r => r.hour === appliedHour);
    const startIdx = appliedIndex !== -1 ? appliedIndex : 0;

    const propSummary = `${calculation.clinker.wet}% Clk | ${calculation.gypsum.wet}% Gyp | ${calculation.limestone.wet}% Lst | ${calculation.trass.wet}% Trass | ${calculation.flyAsh.wet}% FA`;
    const admSummary = `${admixtureName} ${admixturePpm} PPM`;

    const updatedRows = currentMillData.hourlyRows.map((row, idx) => {
      if (idx >= startIdx) {
        return {
          ...row,
          proporsiVersionId: newPropId,
          proporsiDisplay: propSummary,
          admixtureDisplay: admSummary,
        };
      }
      return row;
    });

    const updatedMillData: MillSessionData = {
      ...currentMillData,
      productType,
      siloName,
      admixtureName,
      admixturePpm,
      hourlyRows: updatedRows,
      proporsiHistory: updatedHistory,
    };

    onUpdateSession({
      ...session,
      [selectedMillCode === 'TM' ? 'tm' : 'vrm']: updatedMillData,
    });

    alert(`✅ Proporsi baru untuk ${selectedMillCode} [${newPropLabel}] berhasil diaktifkan mulai jam ${appliedHour}!`);
  };

  // Generate CCR Image via high-resolution HTML5 Canvas renderer
  const handleGenerateCcrImage = async () => {
    setIsGeneratingImage(true);
    setShowShareModal(true);

    try {
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

  return (
    <div className="space-y-4">

      {/* Target Mill & Product Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Dual-Mill Switcher for Setting Proporsi */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setSelectedMillCode('TM')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${
                selectedMillCode === 'TM'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Factory className="w-4 h-4 text-amber-600" />
              <span>Mill 1: TM</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMillCode('VRM')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${
                selectedMillCode === 'VRM'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Factory className="w-4 h-4 text-[#0284C7]" />
              <span>Mill 2: VRM</span>
            </button>
          </div>

          {/* Product, Silo & Override Status */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={productType}
              onChange={(e) => handleProductChange(e.target.value as ProductType)}
              className="px-3 py-1.5 font-bold bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none"
            >
              <option value="PCC Plus FA">PCC Plus FA</option>
              <option value="PCC NON FA">PCC NON FA</option>
              <option value="PCC WS">PCC WS</option>
              <option value="SPK">SPK</option>
              <option value="OPC G">OPC G</option>
              <option value="OPC P">OPC P</option>
            </select>

            <input
              type="text"
              value={siloName}
              onChange={(e) => setSiloName(e.target.value)}
              placeholder="Silo"
              className="w-24 px-2.5 py-1.5 font-bold bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none"
            />

            {isOverride ? (
              <button
                onClick={handleResetToStandard}
                className="px-2.5 py-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-1"
                title="Kembalikan target ke standar supervisor"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Standar</span>
              </button>
            ) : (
              <span className="text-[11px] text-gray-500 font-medium px-2 py-1 bg-gray-50 rounded border border-gray-200">
                Standar Master
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Main Calculation Grid */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
          <div className="font-bold text-gray-800">
            Kalkulasi Wet Base {selectedMillCode} · {productType}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Buffer:</span>
            <select
              value={bufferMaterial}
              onChange={(e) => setBufferMaterial(e.target.value as 'trass' | 'clinker')}
              className="px-2 py-0.5 text-xs font-semibold bg-white border border-gray-300 rounded focus:outline-none"
            >
              <option value="trass">Trass</option>
              <option value="clinker">Clinker</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-gray-100/80 text-gray-700 border-b border-gray-200 font-bold select-none">
                <th className="py-2 px-3 w-36 border-r border-gray-200 font-sans">Material</th>
                <th className="py-2 px-3 w-32 text-right border-r border-gray-200 bg-amber-50/40">Target Dry (%)</th>
                <th className="py-2 px-3 w-32 text-right border-r border-gray-200 bg-blue-50/40">Moisture H2O (%)</th>
                <th className="py-2 px-3 w-32 text-right border-r border-gray-200 text-gray-600">Wet Factor</th>
                <th className="py-2 px-3 w-36 text-right bg-green-50/50 text-[#16A34A] font-bold">SET PROPORSI WET (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              
              {/* Clinker */}
              <tr className="hover:bg-gray-50">
                <td className="py-1.5 px-3 border-r border-gray-200 font-sans font-bold text-gray-900">Clinker</td>
                <td className="p-0 border-r border-gray-200 bg-amber-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={dryValues.clinker}
                    onChange={(e) => handleDryChange('clinker', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="p-0 border-r border-gray-200 bg-blue-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={h2oValues.clinker}
                    onChange={(e) => handleH2oChange('clinker', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-medium text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="py-1.5 px-3 border-r border-gray-200 text-right text-gray-600">
                  {calculation.clinker.wetFactor.toFixed(4)}
                </td>
                <td className="py-1.5 px-3 text-right bg-green-50/30 text-gray-900 font-bold text-sm">
                  {calculation.clinker.wet.toFixed(1)}%
                </td>
              </tr>

              {/* Gypsum */}
              <tr className="hover:bg-gray-50">
                <td className="py-1.5 px-3 border-r border-gray-200 font-sans font-bold text-gray-900">Gypsum</td>
                <td className="p-0 border-r border-gray-200 bg-amber-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={dryValues.gypsum}
                    onChange={(e) => handleDryChange('gypsum', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="p-0 border-r border-gray-200 bg-blue-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={h2oValues.gypsum}
                    onChange={(e) => handleH2oChange('gypsum', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-medium text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="py-1.5 px-3 border-r border-gray-200 text-right text-gray-600">
                  {calculation.gypsum.wetFactor.toFixed(4)}
                </td>
                <td className="py-1.5 px-3 text-right bg-green-50/30 text-gray-900 font-bold text-sm">
                  {calculation.gypsum.wet.toFixed(1)}%
                </td>
              </tr>

              {/* Limestone */}
              <tr className="hover:bg-gray-50">
                <td className="py-1.5 px-3 border-r border-gray-200 font-sans font-bold text-gray-900">Limestone</td>
                <td className="p-0 border-r border-gray-200 bg-amber-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={dryValues.limestone}
                    onChange={(e) => handleDryChange('limestone', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="p-0 border-r border-gray-200 bg-blue-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={h2oValues.limestone}
                    onChange={(e) => handleH2oChange('limestone', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-medium text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="py-1.5 px-3 border-r border-gray-200 text-right text-gray-600">
                  {calculation.limestone.wetFactor.toFixed(4)}
                </td>
                <td className="py-1.5 px-3 text-right bg-green-50/30 text-gray-900 font-bold text-sm">
                  {calculation.limestone.wet.toFixed(1)}%
                </td>
              </tr>

              {/* Trass */}
              <tr className="hover:bg-gray-50">
                <td className="py-1.5 px-3 border-r border-gray-200 font-sans font-bold text-gray-900 flex items-center justify-between">
                  <span>Trass</span>
                  {bufferMaterial === 'trass' && (
                    <span className="text-[10px] font-sans text-[#0284C7] bg-sky-50 px-1 rounded">buffer</span>
                  )}
                </td>
                <td className="p-0 border-r border-gray-200 bg-amber-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={dryValues.trass}
                    onChange={(e) => handleDryChange('trass', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="p-0 border-r border-gray-200 bg-blue-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={h2oValues.trass}
                    onChange={(e) => handleH2oChange('trass', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-medium text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="py-1.5 px-3 border-r border-gray-200 text-right text-gray-600">
                  {calculation.trass.wetFactor.toFixed(4)}
                </td>
                <td className="py-1.5 px-3 text-right bg-green-50/30 text-gray-900 font-bold text-sm">
                  {calculation.trass.wet.toFixed(1)}%
                </td>
              </tr>

              {/* Fly Ash */}
              <tr className="hover:bg-gray-50">
                <td className="py-1.5 px-3 border-r border-gray-200 font-sans font-bold text-gray-900">Fly Ash</td>
                <td className="p-0 border-r border-gray-200 bg-amber-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={dryValues.flyAsh}
                    onChange={(e) => handleDryChange('flyAsh', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-bold text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="p-0 border-r border-gray-200 bg-blue-50/20">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={h2oValues.flyAsh}
                    onChange={(e) => handleH2oChange('flyAsh', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-right font-mono font-medium text-gray-900 bg-transparent border-0 excel-cell-input"
                  />
                </td>
                <td className="py-1.5 px-3 border-r border-gray-200 text-right text-gray-600">
                  {calculation.flyAsh.wetFactor.toFixed(4)}
                </td>
                <td className="py-1.5 px-3 text-right bg-green-50/30 text-gray-900 font-bold text-sm">
                  {calculation.flyAsh.wet.toFixed(1)}%
                </td>
              </tr>

              {/* Total Row */}
              <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                <td className="py-2 px-3 border-r border-gray-200 font-sans">TOTAL</td>
                <td className={`py-2 px-3 border-r border-gray-200 text-right ${
                  calculation.isValidDry ? 'text-[#16A34A]' : 'text-[#E31E24]'
                }`}>
                  {calculation.dryTotal.toFixed(1)}%
                </td>
                <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-400">-</td>
                <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-500">
                  {(
                    calculation.clinker.wetFactor +
                    calculation.gypsum.wetFactor +
                    calculation.limestone.wetFactor +
                    calculation.trass.wetFactor +
                    calculation.flyAsh.wetFactor
                  ).toFixed(4)}
                </td>
                <td className={`py-2 px-3 text-right text-base ${
                  calculation.isValidWet ? 'text-[#16A34A] bg-green-100/60' : 'text-[#E31E24] bg-red-100/60'
                }`}>
                  {calculation.wetTotal.toFixed(1)}%
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Admixture & Hour Controls */}
        <div className="p-3 bg-gray-50/60 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-gray-700 font-bold mb-1">Admixture</label>
            <input
              type="text"
              value={admixtureName}
              onChange={(e) => setAdmixtureName(e.target.value)}
              placeholder="CGA Sika"
              className="w-full px-2.5 py-1.5 font-semibold bg-white border border-gray-300 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">Dosis (PPM)</label>
            <input
              type="number"
              value={admixturePpm}
              onChange={(e) => setAdmixturePpm(parseInt(e.target.value) || 0)}
              placeholder="400"
              className="w-full px-2.5 py-1.5 font-mono font-semibold bg-white border border-gray-300 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">Berlaku Mulai Jam</label>
            <select
              value={appliedHour}
              onChange={(e) => setAppliedHour(e.target.value)}
              className="w-full px-2.5 py-1.5 font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none"
            >
              {currentMillData.hourlyRows.map(r => (
                <option key={r.hour} value={r.hour}>
                  Jam {r.hour}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="p-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-mono text-gray-600">
            Target Mill: <strong>{selectedMillCode}</strong> · {calculation.isValidWet && calculation.isValidDry ? (
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
              className="px-3.5 py-1.5 font-bold text-[#0284C7] bg-sky-50 hover:bg-sky-100 disabled:opacity-40 border border-sky-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Share ke CCR (Gambar)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndActivate}
              disabled={!calculation.isValidDry || !calculation.isValidWet}
              className="px-4 py-1.5 font-bold text-white bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-40 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan & Aktifkan ({selectedMillCode})</span>
            </button>
          </div>
        </div>

      </div>

      {/* Riwayat Proporsi Khusus Mill Ini */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span>Riwayat Proporsi {selectedMillCode} Shift Ini</span>
        </h3>

        <div className="divide-y divide-gray-100">
          {currentMillData.proporsiHistory.map((prop, idx) => {
            const m = prop.materials;
            const isLatest = idx === currentMillData.proporsiHistory.length - 1;

            return (
              <div key={prop.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{prop.label}</span>
                    {isLatest && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold text-white bg-[#16A34A] rounded">
                        Aktif
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-gray-600 text-[11px] mt-0.5">
                    {m.clinker.wet}% Clk | {m.gypsum.wet}% Gyp | {m.limestone.wet}% Lst | {m.trass.wet}% Trass | {m.flyAsh.wet}% FA
                  </div>
                </div>
                <div className="text-gray-500 font-mono text-[11px]">
                  {prop.admixtureName} {prop.admixturePpm} PPM
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Share to CCR Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900">
                Gambar Proporsi CCR ({selectedMillCode})
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {isGeneratingImage ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-[#0284C7] border-t-transparent rounded-full mx-auto mb-2" />
                  Merender gambar CCR...
                </div>
              ) : generatedImageUrl ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100 flex justify-center p-2">
                  <img src={generatedImageUrl} alt="Proporsi CCR" className="max-h-72 w-auto object-contain rounded" />
                </div>
              ) : null}
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-gray-600 hover:text-gray-800 font-semibold"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!generatedImageUrl}
                  className="px-3 py-1.5 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  disabled={!generatedImageUrl}
                  className="px-3.5 py-1.5 font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
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

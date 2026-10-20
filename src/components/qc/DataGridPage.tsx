import React, { useState, useMemo, useEffect } from 'react';
import { ShiftSession, HourlyAnalysisRow, MillSessionData, ShiftName, DEFAULT_SILO_OPTIONS } from '../../types/qc';
import { Factory, Power, ArrowRight, Download, Clock, Calculator } from 'lucide-react';
import { upsertCloudCell } from '../../services/qcApi';
import { exportShiftToExcel } from '../../utils/qcExcelExport';
import { SHIFT_DEFINITIONS } from '../../utils/qcCalculations';

interface DataGridPageProps {
  session: ShiftSession;
  onUpdateSession: (updated: ShiftSession) => void;
  onNavigateToProporsi: (targetMill?: 'TM' | 'VRM') => void;
}

export const DataGridPage: React.FC<DataGridPageProps> = ({
  session,
  onUpdateSession,
  onNavigateToProporsi,
}) => {
  // Dual-Mill Sub-Tab Switcher: TM (Mill 1) is first priority, then VRM (Mill 2)
  const [activeMillTab, setActiveMillTab] = useState<'TM' | 'VRM'>('TM');

  // Indikator loading jika session asinkron dari cloud/localStorage belum siap
  if (!session) {
    return (
      <div className="bg-white border-2 border-slate-500 rounded-xl p-12 text-center shadow-sm">
        <div className="animate-spin w-8 h-8 border-3 border-[#0284C7] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="font-bold text-slate-800 text-sm">Memuat Data Shift & Grid Laboratorium...</p>
        <p className="text-xs text-slate-500 mt-1">Mengambil data dari penyimpanan lokal dan sinkronisasi server...</p>
      </div>
    );
  }

  // Jam operasional shift aktif (fallback Shift 2: 08:00 - 15:00 jika session.shiftName belum terisi)
  const activeShiftName: ShiftName = session.shiftName || 'SHIFT 2';
  const shiftDef = SHIFT_DEFINITIONS[activeShiftName] || SHIFT_DEFINITIONS['SHIFT 2'];
  const shiftHours: string[] = (shiftDef && Array.isArray(shiftDef.hours) && shiftDef.hours.length > 0)
    ? shiftDef.hours
    : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

  // Generator baris fallback terstruktur
  const generateFallbackRows = (hours: string[]): HourlyAnalysisRow[] => {
    return hours.map((hour) => ({
      hour,
      blaine: null,
      residuR45: null,
      moistureH2O: null,
      so3: null,
      freelimeFCaO: null,
      tph: null,
      proporsiDisplay: '',
      admixtureDisplay: '',
      notes: undefined,
    }));
  };

  // Pastikan activeMillData selalu memiliki struktur valid
  const rawMillData: MillSessionData | undefined = activeMillTab === 'TM' ? session.tm : session.vrm;
  const activeMillData: MillSessionData = rawMillData || {
    millType: activeMillTab === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)',
    millCode: activeMillTab,
    millNumber: activeMillTab === 'TM' ? 1 : 2,
    isRunning: true,
    productType: activeMillTab === 'TM' ? 'PCC Plus FA' : 'OPC G',
    siloName: 'SILO 4',
    tphFeeding: 100.0,
    admixtureName: 'CGA Sika',
    admixturePpm: 400,
    hourlyRows: generateFallbackRows(shiftHours),
    proporsiHistory: [],
  };

  // Pastikan baris tabel selalu terisi (fallback array lengkap berdasarkan jam shift aktif)
  const effectiveRows: HourlyAnalysisRow[] = useMemo(() => {
    const rawRows = activeMillData.hourlyRows;
    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return generateFallbackRows(shiftHours);
    }

    // Map setiap jam pada shift aktif untuk menjamin tabel tidak pernah kosong
    return shiftHours.map((hour) => {
      const existing = rawRows.find((r) => r.hour === hour);
      if (existing) return existing;
      return {
        hour,
        blaine: null,
        residuR45: null,
        moistureH2O: null,
        so3: null,
        freelimeFCaO: null,
        tph: null,
        proporsiDisplay: '',
        admixtureDisplay: '',
        notes: undefined,
      };
    });
  }, [activeMillData.hourlyRows, shiftHours]);

  // Self-healing: sinkronisasi state kembali ke session jika hourlyRows di data lokal sebelumnya kosong / undefined
  useEffect(() => {
    if (!activeMillData.hourlyRows || activeMillData.hourlyRows.length !== effectiveRows.length) {
      const updatedMill: MillSessionData = {
        ...activeMillData,
        hourlyRows: effectiveRows,
      };
      onUpdateSession({
        ...session,
        [activeMillTab === 'TM' ? 'tm' : 'vrm']: updatedMill,
      });
    }
  }, [activeMillTab, activeMillData.hourlyRows?.length, effectiveRows.length]);

  // Toggle Mill Running / Standby state
  const handleToggleRunning = () => {
    const updatedMill: MillSessionData = {
      ...activeMillData,
      isRunning: !activeMillData.isRunning,
    };

    onUpdateSession({
      ...session,
      [activeMillTab === 'TM' ? 'tm' : 'vrm']: updatedMill,
    });
  };

  // Cell edit in hourly grid with real-time Cloud UPSERT
  const handleCellChange = (
    index: number,
    field: keyof HourlyAnalysisRow,
    value: string
  ) => {
    const updatedRows = [...effectiveRows];
    const currentRow = { ...updatedRows[index] };

    if (field === 'notes' || field === 'proporsiDisplay' || field === 'admixtureDisplay') {
      (currentRow[field] as any) = value;
    } else {
      if (value === '' || value === null || value === undefined) {
        (currentRow[field] as any) = null;
      } else {
        const parsed = parseFloat(value);
        (currentRow[field] as any) = isNaN(parsed) ? null : parsed;
      }
    }

    updatedRows[index] = currentRow;
    const updatedMill: MillSessionData = {
      ...activeMillData,
      hourlyRows: updatedRows,
    };

    const updatedSession = {
      ...session,
      [activeMillTab === 'TM' ? 'tm' : 'vrm']: updatedMill,
    };

    onUpdateSession(updatedSession);

    // Operasi UPSERT ke database dengan composite key { tanggal, shift, mill_type, jam_analisa }
    upsertCloudCell(
      session.date,
      session.shiftName,
      activeMillTab,
      currentRow.hour,
      field,
      (currentRow[field] as any)
    );
  };

  // Keyboard navigation (Enter moves to next row in same column)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    fieldKey: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(
        `input[data-row="${rowIndex + 1}"][data-col="${fieldKey}"][data-mill="${activeMillTab}"]`
      ) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // Change Mill Product / Silo
  const handleMillSpecChange = (field: 'productType' | 'siloName', val: string) => {
    const updatedMill: MillSessionData = {
      ...activeMillData,
      [field]: val,
    };
    onUpdateSession({
      ...session,
      [activeMillTab === 'TM' ? 'tm' : 'vrm']: updatedMill,
    });
  };

  // Kalkulasi rata-rata (Averages) untuk footer tabel
  const averages = useMemo(() => {
    const validBlaine = effectiveRows.map(r => r.blaine).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validR45 = effectiveRows.map(r => r.residuR45).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validH2O = effectiveRows.map(r => r.moistureH2O).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validSO3 = effectiveRows.map(r => r.so3).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validFCaO = effectiveRows.map(r => r.freelimeFCaO).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validTph = effectiveRows.map(r => r.tph).filter((v): v is number => typeof v === 'number' && !isNaN(v));

    return {
      blaine: validBlaine.length > 0 ? Math.round(validBlaine.reduce((a, b) => a + b, 0) / validBlaine.length).toString() : '—',
      residuR45: validR45.length > 0 ? (validR45.reduce((a, b) => a + b, 0) / validR45.length).toFixed(2) : '—',
      moistureH2O: validH2O.length > 0 ? (validH2O.reduce((a, b) => a + b, 0) / validH2O.length).toFixed(2) : '—',
      so3: validSO3.length > 0 ? (validSO3.reduce((a, b) => a + b, 0) / validSO3.length).toFixed(2) : '—',
      freelimeFCaO: validFCaO.length > 0 ? (validFCaO.reduce((a, b) => a + b, 0) / validFCaO.length).toFixed(2) : '—',
      tph: validTph.length > 0 ? (validTph.reduce((a, b) => a + b, 0) / validTph.length).toFixed(1) : '—',
    };
  }, [effectiveRows]);

  return (
    <div className="space-y-4 font-sans">

      {/* Dual-Mill Switcher Bar & Mill Status Controls */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Sub-Tab Switcher: TM (Mill 1) first, VRM (Mill 2) second */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200 border-2 border-slate-400 rounded-lg shrink-0">
            <button
              onClick={() => setActiveMillTab('TM')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-bold transition-all ${
                activeMillTab === 'TM'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-400'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Factory className="w-4 h-4 text-amber-600" />
              <span>Mill 1: TM</span>
              <span className={`w-2.5 h-2.5 rounded-full ${session.tm.isRunning ? 'bg-[#16A34A]' : 'bg-slate-400'}`} />
            </button>

            <button
              onClick={() => setActiveMillTab('VRM')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-bold transition-all ${
                activeMillTab === 'VRM'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-400'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Factory className="w-4 h-4 text-[#0284C7]" />
              <span>Mill 2: VRM</span>
              <span className={`w-2.5 h-2.5 rounded-full ${session.vrm.isRunning ? 'bg-[#16A34A]' : 'bg-slate-400'}`} />
            </button>
          </div>

          {/* Right Status Controls: Running/Stop Toggle, Product spec, Silo & Ekspor Excel */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Running / Standby */}
            <button
              type="button"
              onClick={handleToggleRunning}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
                activeMillData.isRunning
                  ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 hover:bg-emerald-200'
                  : 'bg-slate-200 text-slate-700 border-2 border-slate-400 hover:bg-slate-300'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${activeMillData.isRunning ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>{activeMillData.isRunning ? 'STATUS: RUNNING' : 'STATUS: STANDBY'}</span>
            </button>

            {/* Product Type Input/Dropdown */}
            <input
              type="text"
              value={activeMillData.productType}
              onChange={(e) => handleMillSpecChange('productType', e.target.value)}
              placeholder="Jenis Produk..."
              className="px-3 py-2 font-bold bg-slate-50 border-2 border-slate-400 rounded-lg text-slate-900 text-xs w-36 focus:bg-white"
            />

            {/* Default Silo Dropdown */}
            <select
              value={activeMillData.siloName}
              onChange={(e) => handleMillSpecChange('siloName', e.target.value)}
              className="px-3 py-2 font-bold bg-slate-50 border-2 border-slate-400 rounded-lg text-slate-900 text-xs focus:bg-white"
            >
              {DEFAULT_SILO_OPTIONS.map((silo) => (
                <option key={silo} value={silo}>
                  {silo}
                </option>
              ))}
            </select>

            {/* Button: Ekspor Excel (.xlsx) */}
            <button
              type="button"
              onClick={() => exportShiftToExcel(session)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Unduh seluruh data shift ini ke format Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Excel-like Data Grid with Solid Header & TPH Feeding */}
      <div className="bg-white border-2 border-slate-500 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Header Kolom Wajib Laboratorium */}
              <tr className="bg-slate-700 text-white font-bold border-b-2 border-slate-500 select-none">
                {/* 1. Kolom Waktu / Jam (Sticky) */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-20 text-center font-mono sticky left-0 bg-slate-800 z-10">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>JAM</span>
                  </div>
                </th>
                {/* 2. Kolom Blaine */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right bg-slate-700">
                  BLAINE
                </th>
                {/* 3. Kolom Residu (R45) */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right bg-slate-700">
                  RESIDU (R45)
                </th>
                {/* 4. Kolom H2O (Moisture) */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right bg-slate-700">
                  H2O (MOIST)
                </th>
                {/* 5. Kolom SO3 (XRF) */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right bg-slate-700">
                  SO3 (XRF)
                </th>
                {/* 6. Kolom FCaO (Freelime) */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right bg-slate-700">
                  FCaO (FREELIME)
                </th>
                {/* 7. Kolom TPH / Feeding CCR */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-28 text-right bg-slate-800 text-amber-300">
                  TPH FEEDING
                </th>
                {/* 8. Proporsi Aktif */}
                <th className="py-2.5 px-3 border-r border-slate-500 min-w-44 text-left">
                  PROPORSI AKTIF
                </th>
                {/* 9. Admixture */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-36 text-left">
                  ADMIXTURE
                </th>
                {/* 10. Catatan */}
                <th className="py-2.5 px-3 min-w-36 text-left">
                  CATATAN
                </th>
              </tr>
            </thead>
            <tbody className="font-mono divide-y divide-slate-300">
              {effectiveRows.map((row, idx) => {
                return (
                  <tr 
                    key={row.hour}
                    className="hover:bg-amber-50/50 transition-colors"
                  >
                    {/* Waktu / Jam (Sticky) */}
                    <td className="py-1 px-2 border-r border-slate-300 text-center font-bold text-slate-900 bg-slate-100 sticky left-0 z-10 shadow-[1px_0_0_0_#94a3b8]">
                      {row.hour}
                    </td>

                    {/* Blaine */}
                    <td className="p-0 border-r border-slate-300 bg-red-50/15">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="1"
                        placeholder="cm²/gr"
                        data-row={idx}
                        data-col="blaine"
                        data-mill={activeMillTab}
                        value={row.blaine !== null && row.blaine !== undefined ? row.blaine : ''}
                        onChange={(e) => handleCellChange(idx, 'blaine', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'blaine')}
                        className="w-full px-2 py-2 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* Residu R45 */}
                    <td className="p-0 border-r border-slate-300 bg-red-50/15">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="%"
                        data-row={idx}
                        data-col="residuR45"
                        data-mill={activeMillTab}
                        value={row.residuR45 !== null && row.residuR45 !== undefined ? row.residuR45 : ''}
                        onChange={(e) => handleCellChange(idx, 'residuR45', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'residuR45')}
                        className="w-full px-2 py-2 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* Moisture H2O */}
                    <td className="p-0 border-r border-slate-300 bg-blue-50/15">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="%"
                        data-row={idx}
                        data-col="moistureH2O"
                        data-mill={activeMillTab}
                        value={row.moistureH2O !== null && row.moistureH2O !== undefined ? row.moistureH2O : ''}
                        onChange={(e) => handleCellChange(idx, 'moistureH2O', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'moistureH2O')}
                        className="w-full px-2 py-2 text-right font-mono font-semibold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* SO3 (XRF) */}
                    <td className="p-0 border-r border-slate-300 bg-sky-50/20">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="%"
                        data-row={idx}
                        data-col="so3"
                        data-mill={activeMillTab}
                        value={row.so3 !== null && row.so3 !== undefined ? row.so3 : ''}
                        onChange={(e) => handleCellChange(idx, 'so3', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'so3')}
                        className="w-full px-2 py-2 text-right font-mono font-bold text-[#0284C7] bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* Freelime F-CaO */}
                    <td className="p-0 border-r border-slate-300 bg-amber-50/15">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="%"
                        data-row={idx}
                        data-col="freelimeFCaO"
                        data-mill={activeMillTab}
                        value={row.freelimeFCaO !== null && row.freelimeFCaO !== undefined ? row.freelimeFCaO : ''}
                        onChange={(e) => handleCellChange(idx, 'freelimeFCaO', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'freelimeFCaO')}
                        className="w-full px-2 py-2 text-right font-mono font-bold text-amber-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* TPH / FEEDING Input */}
                    <td className="p-0 border-r border-slate-300 bg-amber-50/20">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="t/h"
                        data-row={idx}
                        data-col="tph"
                        data-mill={activeMillTab}
                        value={row.tph !== null && row.tph !== undefined ? row.tph : ''}
                        onChange={(e) => handleCellChange(idx, 'tph', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'tph')}
                        className="w-full px-2 py-2 text-right font-mono font-bold text-slate-900 bg-transparent border-0 excel-cell-input focus:bg-white"
                      />
                    </td>

                    {/* Proporsi Aktif Display */}
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-700 text-[11px] truncate max-w-xs">
                      {row.proporsiDisplay || `${activeMillData.proporsiHistory[0]?.materials.clinker.dry ?? 72}% Clk | ...`}
                    </td>

                    {/* Admixture Display */}
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-700 text-[11px] truncate">
                      {row.admixtureDisplay || `${activeMillData.admixtureName} ${activeMillData.admixturePpm} PPM`}
                    </td>

                    {/* Notes */}
                    <td className="p-0 font-sans">
                      <input
                        type="text"
                        placeholder="Catatan..."
                        value={row.notes || ''}
                        onChange={(e) => handleCellChange(idx, 'notes', e.target.value)}
                        className="w-full px-2.5 py-2 text-slate-800 bg-transparent border-0 excel-cell-input focus:bg-white text-xs"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer Summary Baris Rata-rata (Averages) */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400 select-none">
                <td className="py-2 px-2 border-r border-slate-300 text-center bg-slate-200 sticky left-0 z-10 font-sans text-xs">
                  <div className="flex items-center justify-center gap-1 font-bold">
                    <Calculator className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>RATA-RATA</span>
                  </div>
                </td>
                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-xs text-slate-900">
                  {averages.blaine}
                </td>
                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-xs text-slate-900">
                  {averages.residuR45}
                </td>
                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-xs text-slate-900">
                  {averages.moistureH2O}
                </td>
                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-xs text-[#0284C7]">
                  {averages.so3}
                </td>
                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-xs text-amber-900">
                  {averages.freelimeFCaO}
                </td>
                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-xs text-slate-900 bg-amber-50/40">
                  {averages.tph}
                </td>
                <td colSpan={3} className="py-2 px-3 text-slate-500 font-sans text-[11px] font-normal italic">
                  *Rata-rata kalkulasi otomatis berdasarkan baris jam terisi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Clean Bottom Bar: Quick links to other specialized panels */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-600 font-mono">
          Data input jam operasi {activeMillData.millCode} ({activeShiftName}) tersimpan otomatis ke sistem.
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToProporsi(activeMillTab)}
            className="px-3 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <span>Kalkulasi Proporsi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};

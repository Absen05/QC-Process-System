import React, { useState } from 'react';
import { ShiftSession, HourlyAnalysisRow, MillSessionData, DEFAULT_SILO_OPTIONS } from '../../types/qc';
import { Factory, Power, ArrowRight } from 'lucide-react';

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

  const activeMillData: MillSessionData = activeMillTab === 'TM' ? session.tm : session.vrm;

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

  // Cell edit in hourly grid
  const handleCellChange = (
    index: number,
    field: keyof HourlyAnalysisRow,
    value: string
  ) => {
    const updatedRows = [...activeMillData.hourlyRows];
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

    onUpdateSession({
      ...session,
      [activeMillTab === 'TM' ? 'tm' : 'vrm']: updatedMill,
    });
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

  // Clinker WF handlers
  const handleClinkerWfChange = (field: 'c3s' | 'fcao' | 'c3a' | 'h2o', val: string) => {
    const parsed = val === '' ? null : parseFloat(val);
    onUpdateSession({
      ...session,
      clinkerWf: {
        ...session.clinkerWf,
        [field]: isNaN(parsed as number) ? null : parsed,
      },
    });
  };

  // Moisture WF handlers
  const handleMoistureWfChange = (field: 'gypsum' | 'limestone' | 'trass' | 'bbKonsumsi', val: string) => {
    const parsed = val === '' ? null : parseFloat(val);
    onUpdateSession({
      ...session,
      moistureWf: {
        ...session.moistureWf,
        [field]: isNaN(parsed as number) ? null : parsed,
      },
    });
  };

  // CP Shift handlers
  const handleCpShiftChange = (field: 'siloName' | 'blaine' | 'r45' | 'h2o' | 'so3', val: string) => {
    onUpdateSession({
      ...session,
      cpShiftSilo: {
        ...session.cpShiftSilo,
        [field]: field === 'siloName' ? val : (val === '' ? null : (isNaN(parseFloat(val)) ? null : parseFloat(val))),
      },
    });
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

          {/* Active Mill Settings & Solid Action Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Running Status Toggle (Solid button) */}
            <button
              type="button"
              onClick={handleToggleRunning}
              className={`px-3.5 py-2 rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1.5 ${
                activeMillData.isRunning
                  ? 'bg-[#16A34A] text-white hover:bg-emerald-700'
                  : 'bg-[#334155] text-white hover:bg-slate-800'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{activeMillData.isRunning ? 'Mill: RUNNING' : 'Mill: STANDBY / OFF'}</span>
            </button>

            {/* Product Selector for Active Mill */}
            <select
              value={activeMillData.productType}
              onChange={(e) => handleMillSpecChange('productType', e.target.value)}
              className="px-3 py-2 font-bold bg-slate-50 border-2 border-slate-400 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="PCC Plus FA">PCC Plus FA</option>
              <option value="PCC NON FA">PCC NON FA</option>
              <option value="PCC WS">PCC WS</option>
              <option value="SPK">SPK</option>
              <option value="OPC G">OPC G</option>
              <option value="OPC P">OPC P</option>
            </select>

            {/* Default Silo Dropdown (Poin 4: SILO 1-6 & SILO 4+6) */}
            <select
              value={activeMillData.siloName}
              onChange={(e) => handleMillSpecChange('siloName', e.target.value)}
              className="px-3 py-2 font-bold bg-slate-50 border-2 border-slate-400 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
            >
              {DEFAULT_SILO_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Solid Button: Quick Link to Proporsi */}
            <button
              onClick={() => onNavigateToProporsi(activeMillTab)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-lg shadow-xs transition-colors flex items-center gap-1 ml-auto sm:ml-0"
            >
              <span>Set Proporsi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Excel-like Data Grid with Solid Header & TPH Feeding */}
      <div className="bg-white border-2 border-slate-500 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Clean Header Row without (1 Jam), (2 Jam), XRF, etc. Solid dark slate header! */}
              <tr className="bg-slate-600 text-white font-bold border-b-2 border-slate-500 select-none">
                {/* Sticky Left Column for Jam */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-16 text-center font-mono sticky left-0 bg-slate-700 z-10">
                  JAM
                </th>
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right">
                  BLAINE
                </th>
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right">
                  R45
                </th>
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right">
                  H2O
                </th>
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right">
                  SO3
                </th>
                <th className="py-2.5 px-3 border-r border-slate-500 w-24 text-right">
                  F-CaO
                </th>
                {/* TPH / FEEDING CCR column (Poin 4) */}
                <th className="py-2.5 px-3 border-r border-slate-500 w-28 text-right bg-slate-700 text-amber-300">
                  TPH / FEEDING
                </th>
                <th className="py-2.5 px-3 border-r border-slate-500 min-w-44 text-left">
                  PROPORSI AKTIF
                </th>
                <th className="py-2.5 px-3 border-r border-slate-500 w-36 text-left">
                  ADMIXTURE
                </th>
                <th className="py-2.5 px-3 min-w-36 text-left">
                  CATATAN
                </th>
              </tr>
            </thead>
            <tbody className="font-mono divide-y divide-slate-300">
              {activeMillData.hourlyRows.map((row, idx) => {
                return (
                  <tr 
                    key={row.hour}
                    className="hover:bg-amber-50/50 transition-colors"
                  >
                    {/* Sticky Hour Cell */}
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

                    {/* SO3 */}
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

                    {/* TPH / FEEDING Input (Poin 4) */}
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
                      {row.proporsiDisplay || `${activeMillData.proporsiHistory[0]?.materials.clinker.dry}% Clk | ...`}
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
          </table>
        </div>
      </div>

      {/* Integrated Extra Sections (Clinker WF, Moisture WF, CP Shift Silo) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Clinker WF */}
        <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              ⚖️ B. Clinker WF
            </span>
            <span className="text-[10px] text-slate-400 font-mono">%</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">C3S (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="%"
                value={session.clinkerWf.c3s !== null ? session.clinkerWf.c3s : ''}
                onChange={(e) => handleClinkerWfChange('c3s', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">F-CaO (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="%"
                value={session.clinkerWf.fcao !== null ? session.clinkerWf.fcao : ''}
                onChange={(e) => handleClinkerWfChange('fcao', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">C3A (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="%"
                value={session.clinkerWf.c3a !== null ? session.clinkerWf.c3a : ''}
                onChange={(e) => handleClinkerWfChange('c3a', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">H2O (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="%"
                value={session.clinkerWf.h2o !== null ? session.clinkerWf.h2o : ''}
                onChange={(e) => handleClinkerWfChange('h2o', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Moisture Raw Material WF */}
        <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              💧 C. Moisture Raw Material WF
            </span>
            <span className="text-[10px] text-slate-400 font-mono">%</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">Gypsum (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="%"
                value={session.moistureWf.gypsum !== null ? session.moistureWf.gypsum : ''}
                onChange={(e) => handleMoistureWfChange('gypsum', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">Limestone (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="%"
                value={session.moistureWf.limestone !== null ? session.moistureWf.limestone : ''}
                onChange={(e) => handleMoistureWfChange('limestone', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">Trass (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="%"
                value={session.moistureWf.trass !== null ? session.moistureWf.trass : ''}
                onChange={(e) => handleMoistureWfChange('trass', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">BB Konsumsi (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="%"
                value={session.moistureWf.bbKonsumsi !== null ? session.moistureWf.bbKonsumsi : ''}
                onChange={(e) => handleMoistureWfChange('bbKonsumsi', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* CP Shift Silo (Poin 4: Dropdown Silo 1-6 & 4+6) */}
        <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              📦 D. CP Shift ({session.shiftName})
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px]">Pilihan Silo</label>
              <select
                value={session.cpShiftSilo.siloName}
                onChange={(e) => handleCpShiftChange('siloName', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono text-xs font-bold focus:bg-white focus:outline-none"
              >
                {DEFAULT_SILO_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-0.5 text-[11px]">Blaine (cm²/gr)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  placeholder="Blaine"
                  value={session.cpShiftSilo.blaine !== null ? session.cpShiftSilo.blaine : ''}
                  onChange={(e) => handleCpShiftChange('blaine', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5 text-[11px]">R45 (%)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="R45"
                  value={session.cpShiftSilo.r45 !== null ? session.cpShiftSilo.r45 : ''}
                  onChange={(e) => handleCpShiftChange('r45', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-0.5 text-[11px]">H2O (%)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="H2O"
                  value={session.cpShiftSilo.h2o !== null ? session.cpShiftSilo.h2o : ''}
                  onChange={(e) => handleCpShiftChange('h2o', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5 text-[11px]">SO3 (%)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="SO3"
                  value={session.cpShiftSilo.so3 !== null ? session.cpShiftSilo.so3 : ''}
                  onChange={(e) => handleCpShiftChange('so3', e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-400 rounded font-mono font-semibold focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

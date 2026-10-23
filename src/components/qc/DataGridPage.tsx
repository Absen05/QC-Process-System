import React, { useState, useMemo, useEffect } from 'react';
import { ShiftSession, HourlyAnalysisRow, MillSessionData, ShiftName } from '../../types/qc';
import { Factory, ArrowRight, Download, Calculator, CheckCircle2, CircleDashed, AlertCircle } from 'lucide-react';
import { upsertCloudCell } from '../../services/qcApi';
import { exportShiftToExcel } from '../../utils/qcExcelExport';
import { SHIFT_DEFINITIONS } from '../../utils/qcCalculations';
import { getStoredQualitySpecs } from '../../services/qcStorage';

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
  const [activeMillTab, setActiveMillTab] = useState<'TM' | 'VRM'>('TM');

  if (!session) {
    return (
      <div className="bg-white border-2 border-slate-500 rounded-xl p-12 text-center shadow-sm">
        <div className="animate-spin w-8 h-8 border-3 border-[#0284C7] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="font-bold text-slate-800 text-sm">Memuat Data Shift & Grid Laboratorium...</p>
        <p className="text-xs text-slate-500 mt-1">Mengambil data dari penyimpanan lokal dan sinkronisasi server...</p>
      </div>
    );
  }

  const activeShiftName: ShiftName = session.shiftName || 'SHIFT 2';
  const shiftDef = SHIFT_DEFINITIONS[activeShiftName] || SHIFT_DEFINITIONS['SHIFT 2'];
  const shiftHours: string[] = (shiftDef && Array.isArray(shiftDef.hours) && shiftDef.hours.length > 0)
    ? shiftDef.hours
    : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

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

  const rawMillData: MillSessionData | undefined = activeMillTab === 'TM' ? session.tm : session.vrm;
  const activeMillData: MillSessionData = rawMillData || {
    millType: activeMillTab === 'TM' ? 'Tube Mill (TM)' : 'Vertical Roller Mill (VRM)',
    millCode: activeMillTab,
    millNumber: activeMillTab === 'TM' ? 1 : 2,
    isRunning: false,
    productType: '',
    siloName: '',
    tphFeeding: 0,
    admixtureName: '',
    admixturePpm: 0,
    hourlyRows: generateFallbackRows(shiftHours),
    proporsiHistory: [],
  };

  // Cek apakah proporsi benar-benar sudah diaktifkan oleh analis di shift ini (bukan dummy init)
  const validProporsiHistory = useMemo(() => {
    return (activeMillData.proporsiHistory || []).filter(
      (p) => p && p.id && !p.id.startsWith('prop_tm_init') && !p.id.startsWith('prop_vrm_init')
    );
  }, [activeMillData.proporsiHistory]);

  const isProportionActive = validProporsiHistory.length > 0;
  const latestActiveProp = isProportionActive ? validProporsiHistory[validProporsiHistory.length - 1] : null;
  const lockedProductType = latestActiveProp?.productType || (isProportionActive ? activeMillData.productType : '');
  const lockedSiloName = latestActiveProp?.siloName || (isProportionActive ? activeMillData.siloName : '');

  const effectiveRows: HourlyAnalysisRow[] = useMemo(() => {
    const rawRows = activeMillData.hourlyRows;
    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return generateFallbackRows(shiftHours);
    }

    return shiftHours.map((hour) => {
      const existing = rawRows.find((r) => r.hour === hour);
      if (existing) {
        if (!isProportionActive) {
          return {
            ...existing,
            productType: undefined,
            proporsiVersionId: undefined,
            proporsiDisplay: '',
            admixtureDisplay: '',
          };
        }
        const matchedProp = existing.proporsiVersionId
          ? validProporsiHistory.find((p) => p.id === existing.proporsiVersionId)
          : undefined;
        const resolvedProduct =
          existing.productType ||
          matchedProp?.productType ||
          (existing.proporsiDisplay ? lockedProductType : undefined);

        return {
          ...existing,
          productType: resolvedProduct,
        };
      }
      return {
        hour,
        productType: undefined,
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
  }, [activeMillData.hourlyRows, shiftHours, isProportionActive, validProporsiHistory, lockedProductType]);

  const isMillRunningAuto = useMemo(() => {
    return (
      isProportionActive ||
      effectiveRows.some(
        (r) =>
          (r.blaine !== null && r.blaine !== undefined) ||
          (r.residuR45 !== null && r.residuR45 !== undefined) ||
          (r.moistureH2O !== null && r.moistureH2O !== undefined) ||
          (r.so3 !== null && r.so3 !== undefined) ||
          (r.freelimeFCaO !== null && r.freelimeFCaO !== undefined) ||
          (r.tph !== null && r.tph !== undefined)
      )
    );
  }, [effectiveRows, isProportionActive]);

  // Sub-Header Target Quality otomatis dari Master Data (HANYA tampil jika proporsi sudah aktif)
  const qualityTargetText = useMemo(() => {
    if (!isProportionActive || !lockedProductType) {
      return {
        blaine: 'Target: —',
        residuR45: 'Target: —',
        moistureH2O: 'Target: —',
        so3: 'Target: —',
        freelimeFCaO: 'Target: —',
      };
    }

    const specs = getStoredQualitySpecs();
    const currentProd = lockedProductType.toLowerCase().trim();
    const spec =
      specs.find(
        (s) =>
          (s.millType === activeMillTab || !s.millType) &&
          s.productType.toLowerCase().trim() === currentProd
      ) ||
      specs.find((s) => s.productType.toLowerCase().trim() === currentProd);

    if (!spec) {
      return {
        blaine: 'Target: —',
        residuR45: 'Target: —',
        moistureH2O: 'Target: —',
        so3: 'Target: —',
        freelimeFCaO: 'Target: —',
      };
    }

    const fmtBlaine =
      spec.blaine.min && spec.blaine.max
        ? `Target: ${spec.blaine.min} - ${spec.blaine.max}`
        : spec.blaine.std
        ? `Target: ${spec.blaine.std}`
        : 'Target: —';

    const fmtR45 =
      spec.residuR45.max && !spec.residuR45.min
        ? `Target: Max ${spec.residuR45.max}%`
        : spec.residuR45.min && spec.residuR45.max
        ? `Target: ${spec.residuR45.min} - ${spec.residuR45.max}%`
        : spec.residuR45.std
        ? `Target: ${spec.residuR45.std}%`
        : 'Target: —';

    const fmtH2O = spec.moistureH2O.max
      ? `Target: Max ${spec.moistureH2O.max}%`
      : spec.moistureH2O.std
      ? `Target: Std ${spec.moistureH2O.std}%`
      : 'Target: —';

    const fmtSO3 =
      spec.so3.min && spec.so3.max
        ? `Target: ${spec.so3.min} - ${spec.so3.max}%`
        : spec.so3.std
        ? `Target: ${spec.so3.std}%`
        : 'Target: —';

    const fmtFCaO = spec.freelimeFCaO.max
      ? `Target: Max ${spec.freelimeFCaO.max}%`
      : spec.freelimeFCaO.min && spec.freelimeFCaO.max
      ? `Target: ${spec.freelimeFCaO.min} - ${spec.freelimeFCaO.max}%`
      : spec.freelimeFCaO.std
      ? `Target: ${spec.freelimeFCaO.std}%`
      : 'Target: —';

    return {
      blaine: fmtBlaine,
      residuR45: fmtR45,
      moistureH2O: fmtH2O,
      so3: fmtSO3,
      freelimeFCaO: fmtFCaO,
    };
  }, [isProportionActive, lockedProductType, activeMillTab]);

  // Cell edit in hourly grid with real-time Cloud UPSERT
  const handleCellChange = (
    index: number,
    field: keyof HourlyAnalysisRow,
    value: string
  ) => {
    const updatedRows = [...effectiveRows];
    const currentRow = { ...updatedRows[index] };

    if (field === 'notes' || field === 'proporsiDisplay' || field === 'admixtureDisplay' || field === 'productType') {
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

    const hasDataNow = updatedRows.some(
      (r) =>
        r.blaine !== null ||
        r.residuR45 !== null ||
        r.moistureH2O !== null ||
        r.so3 !== null ||
        r.freelimeFCaO !== null ||
        r.tph !== null
    );

    const updatedMill: MillSessionData = {
      ...activeMillData,
      hourlyRows: updatedRows,
      isRunning: isProportionActive || hasDataNow,
    };

    const updatedSession = {
      ...session,
      [activeMillTab === 'TM' ? 'tm' : 'vrm']: updatedMill,
    };

    onUpdateSession(updatedSession);
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

  // Kalkulasi rata-rata (Averages) untuk footer tabel
  const averages = useMemo(() => {
    const validBlaine = effectiveRows.map((r) => r.blaine).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validR45 = effectiveRows.map((r) => r.residuR45).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validH2O = effectiveRows.map((r) => r.moistureH2O).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validSO3 = effectiveRows.map((r) => r.so3).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validFCaO = effectiveRows.map((r) => r.freelimeFCaO).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const validTph = effectiveRows.map((r) => r.tph).filter((v): v is number => typeof v === 'number' && !isNaN(v));

    return {
      blaine: validBlaine.length > 0 ? Math.round(validBlaine.reduce((a, b) => a + b, 0) / validBlaine.length).toString() : '—',
      residuR45: validR45.length > 0 ? (validR45.reduce((a, b) => a + b, 0) / validR45.length).toFixed(2) : '—',
      moistureH2O: validH2O.length > 0 ? (validH2O.reduce((a, b) => a + b, 0) / validH2O.length).toFixed(2) : '—',
      so3: validSO3.length > 0 ? (validSO3.reduce((a, b) => a + b, 0) / validSO3.length).toFixed(2) : '—',
      freelimeFCaO: validFCaO.length > 0 ? (validFCaO.reduce((a, b) => a + b, 0) / validFCaO.length).toFixed(2) : '—',
      tph: validTph.length > 0 ? (validTph.reduce((a, b) => a + b, 0) / validTph.length).toFixed(1) : '—',
    };
  }, [effectiveRows]);

  // Excel-Like Multi-Cell Copy-Paste Event Handler
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;

    const rows = clipboardData.trim().split(/\r?\n/);
    if (rows.length === 0) return;

    const activeEl = document.activeElement as HTMLInputElement | null;
    let startRow = 0;
    let startColKey = 'blaine';

    if (activeEl && activeEl.dataset && activeEl.dataset.row !== undefined) {
      startRow = parseInt(activeEl.dataset.row, 10) || 0;
      startColKey = activeEl.dataset.col || 'blaine';
    }

    const columnKeys: (keyof HourlyAnalysisRow)[] = [
      'blaine',
      'residuR45',
      'moistureH2O',
      'so3',
      'freelimeFCaO',
      'tph',
      'notes'
    ];

    const startColIndex = Math.max(0, columnKeys.indexOf(startColKey as any));
    const updatedRows = [...effectiveRows];

    rows.forEach((rowText, rIdx) => {
      const targetRowIdx = startRow + rIdx;
      if (targetRowIdx >= updatedRows.length) return;

      const cells = rowText.split('\t');
      const rowData = { ...updatedRows[targetRowIdx] };

      cells.forEach((cellVal, cIdx) => {
        const targetColIdx = startColIndex + cIdx;
        if (targetColIdx >= columnKeys.length) return;

        const colKey = columnKeys[targetColIdx];
        const trimmed = cellVal.trim();

        if (colKey === 'notes') {
          rowData.notes = trimmed || undefined;
        } else if (colKey === 'proporsiDisplay' || colKey === 'admixtureDisplay' || colKey === 'productType' || colKey === 'hour') {
          // skip read-only display fields
        } else {
          if (trimmed === '') {
            (rowData as any)[colKey] = null;
          } else {
            const parsed = parseFloat(trimmed.replace(',', '.'));
            const finalVal = isNaN(parsed) ? null : parsed;
            (rowData as any)[colKey] = finalVal;
          }
        }
      });

      updatedRows[targetRowIdx] = rowData;
    });

    const hasDataNow = updatedRows.some(
      (r) =>
        r.blaine !== null ||
        r.residuR45 !== null ||
        r.moistureH2O !== null ||
        r.so3 !== null ||
        r.freelimeFCaO !== null ||
        r.tph !== null
    );

    const updatedMill: MillSessionData = {
      ...activeMillData,
      hourlyRows: updatedRows,
      isRunning: isProportionActive || hasDataNow,
    };

    onUpdateSession({
      ...session,
      [activeMillTab === 'TM' ? 'tm' : 'vrm']: updatedMill,
    });
  };

  return (
    <div onPaste={handlePaste} className="space-y-4 font-sans">

      {/* Dual-Mill Switcher Bar & Mill Status Controls */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Elongated & Dynamic Sub-Tab Switcher: TM & VRM */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200 border-2 border-slate-400 rounded-xl w-full lg:w-auto lg:min-w-[440px] xl:min-w-[500px] shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => setActiveMillTab('TM')}
              className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                activeMillTab === 'TM'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md border border-amber-700 scale-[1.01]'
                  : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
              }`}
            >
              <Factory className={`w-4 h-4 shrink-0 ${activeMillTab === 'TM' ? 'text-white' : 'text-amber-600'}`} />
              <span>TUBE MILL (TM)</span>
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  session.tm.isRunning
                    ? 'bg-emerald-400 ring-2 ring-white animate-pulse'
                    : activeMillTab === 'TM'
                    ? 'bg-amber-200/70'
                    : 'bg-slate-400'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setActiveMillTab('VRM')}
              className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                activeMillTab === 'VRM'
                  ? 'bg-gradient-to-r from-[#0284C7] to-sky-700 text-white shadow-md border border-sky-800 scale-[1.01]'
                  : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-300'
              }`}
            >
              <Factory className={`w-4 h-4 shrink-0 ${activeMillTab === 'VRM' ? 'text-white' : 'text-[#0284C7]'}`} />
              <span>VERTICAL MILL (VRM)</span>
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  session.vrm.isRunning
                    ? 'bg-emerald-400 ring-2 ring-white animate-pulse'
                    : activeMillTab === 'VRM'
                    ? 'bg-sky-200/70'
                    : 'bg-slate-400'
                }`}
              />
            </button>
          </div>

          {/* Right Status Controls: Deteksi Running Otomatis, Read-only Silo Badge & Ekspor Excel */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs select-none ${
                isMillRunningAuto
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
              title={isMillRunningAuto ? 'Mill terdeteksi running otomatis dari keberadaan data' : 'Mill standby (belum ada data terinput)'}
            >
              {isMillRunningAuto ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>STATUS: RUNNING</span>
                </>
              ) : (
                <>
                  <CircleDashed className="w-3.5 h-3.5 text-slate-400" />
                  <span>STATUS: STANDBY</span>
                </>
              )}
            </div>

            {/* Read-Only Badge: Silo Paten */}
            <div className="px-3 py-1.5 font-bold bg-slate-100 border-2 border-slate-300 rounded-lg text-slate-800 text-xs flex items-center gap-1.5 select-none">
              <span className="text-slate-500 uppercase text-[10px]">Silo:</span>
              <span className={`font-mono font-bold ${isProportionActive && lockedSiloName ? 'text-[#0284C7]' : 'text-amber-700 italic'}`}>
                {isProportionActive && lockedSiloName ? lockedSiloName : 'BELUM AKTIF'}
              </span>
            </div>

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

      {/* Empty State Gatekeeper Banner */}
      {!isProportionActive && (
        <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">
              Proporsi belum aktif untuk shift ini. Silakan atur dan aktifkan proporsi pada menu Proporsi terlebih dahulu.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToProporsi(activeMillTab)}
            className="px-4 py-2 bg-[#0284C7] hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <span>Atur & Aktifkan Proporsi ({activeMillTab})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Excel-like Data Grid with Solid Header, Centered Text & Sub-Header Target Quality */}
      <div className="bg-white border-2 border-slate-500 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-700 text-white font-bold border-b-2 border-slate-500 select-none">
                <th className="py-2.5 px-3 border-r border-slate-500 w-20 text-center align-middle font-mono sticky left-0 bg-slate-800 z-10 text-white font-bold">
                  JAM
                </th>

                <th className="py-2.5 px-3 border-r border-slate-500 w-36 text-center align-middle bg-slate-800 text-amber-300 font-bold">
                  TYPE (PCC/OPC)
                </th>

                <th className="py-2 px-3 border-r border-slate-500 w-28 text-center align-middle bg-slate-700">
                  <div className="font-bold tracking-wide">BLAINE</div>
                  <div className="text-[10px] font-normal text-amber-300 font-sans mt-0.5 tracking-tight">
                    {qualityTargetText.blaine}
                  </div>
                </th>

                <th className="py-2 px-3 border-r border-slate-500 w-28 text-center align-middle bg-slate-700">
                  <div className="font-bold tracking-wide">RESIDU 45um</div>
                  <div className="text-[10px] font-normal text-amber-300 font-sans mt-0.5 tracking-tight">
                    {qualityTargetText.residuR45}
                  </div>
                </th>

                <th className="py-2 px-3 border-r border-slate-500 w-28 text-center align-middle bg-slate-700">
                  <div className="font-bold tracking-wide">H2O</div>
                  <div className="text-[10px] font-normal text-sky-300 font-sans mt-0.5 tracking-tight">
                    {qualityTargetText.moistureH2O}
                  </div>
                </th>

                <th className="py-2 px-3 border-r border-slate-500 w-28 text-center align-middle bg-slate-700">
                  <div className="font-bold tracking-wide">SO3</div>
                  <div className="text-[10px] font-normal text-sky-300 font-sans mt-0.5 tracking-tight">
                    {qualityTargetText.so3}
                  </div>
                </th>

                <th className="py-2 px-3 border-r border-slate-500 w-28 text-center align-middle bg-slate-700">
                  <div className="font-bold tracking-wide">FCaO</div>
                  <div className="text-[10px] font-normal text-amber-300 font-sans mt-0.5 tracking-tight">
                    {qualityTargetText.freelimeFCaO}
                  </div>
                </th>

                <th className="py-2.5 px-3 border-r border-slate-500 w-28 text-center align-middle bg-slate-800 text-amber-300 font-bold">
                  TPH FEEDING
                </th>

                <th className="py-2.5 px-3 border-r border-slate-500 min-w-44 text-center align-middle">
                  PROPORSI AKTIF
                </th>

                <th className="py-2.5 px-3 border-r border-slate-500 w-36 text-center align-middle">
                  ADMIXTURE
                </th>

                <th className="py-2.5 px-3 min-w-36 text-center align-middle">
                  CATATAN
                </th>
              </tr>
            </thead>
            <tbody className="font-mono divide-y divide-slate-300">
              {effectiveRows.map((row, idx) => {
                const rowType = isProportionActive && row.productType ? row.productType : '';
                const isOpcType = rowType.toUpperCase().includes('OPC');

                return (
                  <tr 
                    key={row.hour}
                    className="hover:bg-amber-50/50 transition-colors"
                  >
                    {/* Waktu / Jam (Sticky) */}
                    <td className="py-1 px-2 border-r border-slate-300 text-center font-bold text-slate-900 bg-slate-100 sticky left-0 z-10 shadow-[1px_0_0_0_#94a3b8]">
                      {row.hour}
                    </td>

                    {/* TYPE (PCC/OPC) Sesuai Proporsi yang Diaktifkan */}
                    <td className="py-1.5 px-2.5 border-r border-slate-300 text-center bg-slate-50/80 select-none">
                      {rowType ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] border ${
                            isOpcType
                              ? 'bg-amber-100 text-amber-900 border-amber-400'
                              : 'bg-sky-100 text-sky-900 border-sky-400'
                          }`}
                        >
                          {rowType}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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

                    {/* Residu 45um */}
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

                    {/* Proporsi Aktif Display — KOSONG jika proporsi belum diaktifkan */}
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-700 text-[11px] truncate max-w-xs">
                      {isProportionActive && row.proporsiDisplay ? row.proporsiDisplay : '—'}
                    </td>

                    {/* Admixture Display — KOSONG jika proporsi belum diaktifkan */}
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-700 text-[11px] truncate">
                      {isProportionActive && row.admixtureDisplay ? row.admixtureDisplay : '—'}
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
                <td className="py-2 px-2 border-r border-slate-300 text-center font-mono text-[11px] text-slate-700 bg-slate-100">
                  {isProportionActive && lockedProductType ? lockedProductType : '—'}
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

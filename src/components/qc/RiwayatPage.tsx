import React, { useState } from 'react';
import { ShiftName, ShiftSession } from '../../types/qc';
import { SHIFT_DEFINITIONS, generateWhatsAppReport, formatIndonesianDate } from '../../utils/qcCalculations';
import { getArchivedShift, getStoredArchives } from '../../services/qcStorage';
import { Search, Calendar, Clock, Copy, Check, FileText, Factory, Truck, Archive, Download, FileSpreadsheet } from 'lucide-react';
import { exportShiftToExcel, exportRekapitulasiToExcel } from '../../utils/qcExcelExport';

interface RiwayatPageProps {
  onLoadArchiveToActive?: (session: ShiftSession) => void;
}

export const RiwayatPage: React.FC<RiwayatPageProps> = ({ onLoadArchiveToActive }) => {
  const [queryDate, setQueryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [queryShift, setQueryShift] = useState<ShiftName>('SHIFT 2');
  const [searchedSession, setSearchedSession] = useState<ShiftSession | null>(() => {
    return getArchivedShift(new Date().toISOString().slice(0, 10), 'SHIFT 2');
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  const archives = getStoredArchives();
  const archiveKeys = Object.keys(archives);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
    const result = getArchivedShift(queryDate, queryShift);
    setSearchedSession(result);
  };

  const handleSelectArchiveKey = (key: string) => {
    const [d, ...sParts] = key.split('_');
    const s = sParts.join(' ') as ShiftName;
    setQueryDate(d);
    setQueryShift(s);
    setHasSearched(true);
    setSearchedSession(archives[key] || null);
  };

  const reportText = searchedSession ? generateWhatsAppReport(searchedSession) : '';

  const handleCopyReport = async () => {
    if (!reportText) return;
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      
      {/* Query Filter Header Card */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Tanggal Shift</span>
              </label>
              <input
                type="date"
                required
                value={queryDate}
                onChange={(e) => setQueryDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Shift Kerja</span>
              </label>
              <select
                value={queryShift}
                onChange={(e) => setQueryShift(e.target.value as ShiftName)}
                className="px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
              >
                {Object.keys(SHIFT_DEFINITIONS).map(s => (
                  <option key={s} value={s}>
                    {s} ({SHIFT_DEFINITIONS[s as ShiftName].timeRange})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Cari Arsip</span>
            </button>

            {archiveKeys.length > 0 && (
              <button
                type="button"
                onClick={() => exportRekapitulasiToExcel(archives)}
                className="px-4 py-2.5 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Ekspor seluruh arsip shift ke satu file rekapitulasi Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Rekapitulasi (.xlsx)</span>
              </button>
            )}
          </div>

        </form>

        {/* Quick archive list chips */}
        {archiveKeys.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
              <Archive className="w-3 h-3" />
              <span>Daftar Arsip Tersedia ({archiveKeys.length}):</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {archiveKeys.slice(-8).reverse().map(key => {
                const isSelected = searchedSession && `${searchedSession.date}_${searchedSession.shiftName}` === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectArchiveKey(key)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded border transition-colors ${
                      isSelected 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                    }`}
                  >
                    {key.replace('_', ' • ')}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Searched Result Display */}
      {searchedSession ? (
        <div className="space-y-4">
          
          {/* Shift Banner & Action */}
          <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#E31E24] text-white font-bold text-xs rounded">
                  ARSIP HISTORIS
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatIndonesianDate(searchedSession.date)} · {searchedSession.shiftName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Analis: <strong>{searchedSession.analystName}</strong> | Jam Operasi: {searchedSession.shiftHours}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportShiftToExcel(searchedSession)}
                className="px-3.5 py-2 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                title="Unduh seluruh data arsip shift ini ke format Excel (.xlsx)"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyReport}
                className="px-4 py-2 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin!' : 'Copy Laporan WA Shift Ini'}</span>
              </button>

              {onLoadArchiveToActive && (
                <button
                  type="button"
                  onClick={() => onLoadArchiveToActive(searchedSession)}
                  className="px-3.5 py-2 bg-[#334155] hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <span>Buka ke Layar Kerja</span>
                </button>
              )}
            </div>
          </div>

          {/* TM & VRM Data Tables */}
          {(['tm', 'vrm'] as const).map(millKey => {
            const mill = searchedSession[millKey];
            const isTM = millKey === 'tm';
            const filledRows = mill.hourlyRows.filter(r => r.blaine !== null || r.residuR45 !== null || r.tph !== null);

            return (
              <div key={millKey} className="bg-white border-2 border-slate-500 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-slate-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Factory className="w-4 h-4 text-amber-400" />
                    <span>{isTM ? 'Mill 1: Tube Mill (TM)' : 'Mill 2: Vertical Roller Mill (VRM)'}</span>
                    <span>— {mill.productType} ({mill.siloName})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    mill.isRunning ? 'bg-green-500 text-white' : 'bg-slate-500 text-slate-200'
                  }`}>
                    {mill.isRunning ? 'Running' : 'Standby / Off'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-600 text-white font-bold border-b border-slate-500">
                        <th className="py-2 px-3 border-r border-slate-500 w-16 text-center">JAM</th>
                        <th className="py-2 px-3 border-r border-slate-500 w-24 text-right">BLAINE</th>
                        <th className="py-2 px-3 border-r border-slate-500 w-24 text-right">R45 (%)</th>
                        <th className="py-2 px-3 border-r border-slate-500 w-24 text-right">H2O (%)</th>
                        <th className="py-2 px-3 border-r border-slate-500 w-24 text-right">SO3 (%)</th>
                        <th className="py-2 px-3 border-r border-slate-500 w-24 text-right">F-CaO (%)</th>
                        <th className="py-2 px-3 border-r border-slate-500 w-28 text-right bg-slate-700 text-amber-300">TPH FEEDING</th>
                        <th className="py-2 px-3 border-r border-slate-500 text-left">PROPORSI AKTIF</th>
                        <th className="py-2 px-3 text-left">CATATAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {mill.hourlyRows.map((row) => (
                        <tr key={row.hour} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 border-r border-slate-300 text-center font-bold bg-slate-100 text-slate-900">
                            {row.hour}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-right font-bold text-slate-900">
                            {row.blaine !== null ? row.blaine : '-'}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-right font-bold text-slate-900">
                            {row.residuR45 !== null ? row.residuR45.toFixed(2) : '-'}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-right text-slate-800">
                            {row.moistureH2O !== null ? row.moistureH2O.toFixed(2) : '-'}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-right font-bold text-[#0284C7]">
                            {row.so3 !== null ? row.so3.toFixed(2) : '-'}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-right text-amber-900">
                            {row.freelimeFCaO !== null ? row.freelimeFCaO.toFixed(2) : '-'}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-right font-bold text-slate-900 bg-amber-50/40">
                            {row.tph !== null ? `${row.tph.toFixed(1)} t/h` : '-'}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-slate-700 text-[11px] truncate max-w-xs">
                            {row.proporsiDisplay || '-'}
                          </td>
                          <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                            {row.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filledRows.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-400 italic bg-slate-50">
                    Tidak ada input data analisa selama shift ini untuk unit mill ini.
                  </div>
                )}
              </div>
            );
          })}

          {/* Plant-Wide Sections (Clinker WF, Moisture WF, CP Shift, Incoming) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Clinker WF */}
            <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
              <span className="font-bold text-slate-900 uppercase block pb-1 border-b border-slate-200 mb-2">
                ⚖️ Clinker WF
              </span>
              <div className="space-y-1 text-slate-800">
                <div>C3S   : <strong>{searchedSession.clinkerWf.c3s ?? '-'}%</strong></div>
                <div>F-CaO : <strong>{searchedSession.clinkerWf.fcao ?? '-'}%</strong></div>
                <div>C3A   : <strong>{searchedSession.clinkerWf.c3a ?? '-'}%</strong></div>
                <div>H2O   : <strong>{searchedSession.clinkerWf.h2o ?? '-'}%</strong></div>
              </div>
            </div>

            {/* Moisture WF */}
            <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
              <span className="font-bold text-slate-900 uppercase block pb-1 border-b border-slate-200 mb-2">
                💧 Moisture Raw Material WF
              </span>
              <div className="space-y-1 text-slate-800">
                <div>Gypsum    : <strong>{searchedSession.moistureWf.gypsum ?? '-'}%</strong></div>
                <div>Limestone : <strong>{searchedSession.moistureWf.limestone ?? '-'}%</strong></div>
                <div>Trass     : <strong>{searchedSession.moistureWf.trass ?? '-'}%</strong></div>
                <div>BB Kons   : <strong>{searchedSession.moistureWf.bbKonsumsi ?? '-'}%</strong></div>
              </div>
            </div>

            {/* CP Products */}
            <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
              <span className="font-bold text-slate-900 uppercase block pb-1 border-b border-slate-200 mb-2">
                📦 DATA CP ({searchedSession.cpProducts?.length || 1} Produk)
              </span>
              <div className="space-y-2 text-slate-800">
                {(searchedSession.cpProducts || (searchedSession.cpShiftSilo ? [
                  {
                    id: 'cp_1',
                    label: 'CP Produk 1',
                    productType: searchedSession.tm.productType || 'SEMEN',
                    siloName: searchedSession.cpShiftSilo.siloName,
                    blaine: searchedSession.cpShiftSilo.blaine,
                    r45: searchedSession.cpShiftSilo.r45,
                    h2o: searchedSession.cpShiftSilo.h2o,
                    so3: searchedSession.cpShiftSilo.so3,
                  }
                ] : [])).map((cp, idx) => (
                  <div key={cp.id || idx} className="text-[11px] pb-1.5 border-b border-slate-100 last:border-b-0">
                    <div className="font-bold text-slate-900">{cp.label || `CP ${idx + 1}`}: {cp.productType} ({cp.siloName})</div>
                    <div>Blaine: <strong>{cp.blaine ?? '-'}</strong> cm²/gr | R45: <strong>{cp.r45 ?? '-'}%</strong> | H2O: <strong>{cp.h2o ?? '-'}%</strong> | SO3: <strong>{cp.so3 ?? '-'}%</strong></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WhatsApp Text Report Preview */}
          <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Format Teks Laporan WhatsApp Riwayat Shift Ini:</span>
              </div>
              <button
                type="button"
                onClick={handleCopyReport}
                className="px-3.5 py-1.5 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Copy WA Report'}</span>
              </button>
            </div>

            <textarea
              readOnly
              rows={12}
              value={reportText}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px] text-slate-900 leading-relaxed resize-none focus:outline-none"
            />
          </div>

        </div>
      ) : hasSearched ? (
        <div className="bg-white border-2 border-slate-500 rounded-xl p-8 text-center text-xs text-slate-600 shadow-sm space-y-2">
          <Archive className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            Arsip Tidak Ditemukan
          </h3>
          <p>
            Belum ada arsip data yang tersimpan untuk Tanggal <strong>{queryDate}</strong> dan <strong>{queryShift}</strong>.
          </p>
          <p className="text-slate-400">
            Pilihlah salah satu arsip yang terdaftar di atas atau mulai shift baru dari menu konfigurasi.
          </p>
        </div>
      ) : null}

    </div>
  );
};

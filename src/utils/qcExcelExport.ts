import * as XLSX from 'xlsx';
import { ShiftSession, MillType } from '../types/qc';
import { formatIndonesianDate } from './qcCalculations';

/**
 * Utility untuk Ekspor Data Shift dan Rekapitulasi ke Excel (.xlsx)
 * Menjamin semua data shift terunduh rapi tanpa error blank / undefined.
 */

export function exportShiftToExcel(session: ShiftSession): void {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: DATA ANALISA MILL (TM & VRM)
  // ==========================================
  const millRows: any[] = [];

  // Header informasi shift
  millRows.push(['LAPORAN KONTROL KUALITAS MILL - QC PLANT CIWANDAN']);
  millRows.push(['Tanggal:', session.date, 'Shift:', session.shiftName, 'Analis:', session.analystName || '-']);
  millRows.push([]); // blank line

  // TM Section
  millRows.push(['MILL 1: TUBE MILL (TM)']);
  millRows.push([
    'Status:', session.tm.isRunning ? 'RUNNING' : 'STANDBY / OFF',
    'Produk:', session.tm.productType || '-',
    'Silo:', session.tm.siloName || '-',
    'Feeding (TPH):', session.tm.tphFeeding || '-',
    'Admixture:', `${session.tm.admixtureName || '-'} (${session.tm.admixturePpm || 0} PPM)`
  ]);
  millRows.push([
    'Jam',
    'Blaine (cm²/gr)',
    'R45 (%)',
    'H2O (%)',
    'SO3 (%)',
    'F-CaO (%)',
    'TPH Feeding',
    'Proporsi Aktif',
    'Catatan / Notes'
  ]);

  session.tm.hourlyRows.forEach(r => {
    millRows.push([
      r.hour,
      r.blaine !== null && r.blaine !== undefined ? r.blaine : '',
      r.residuR45 !== null && r.residuR45 !== undefined ? r.residuR45 : '',
      r.moistureH2O !== null && r.moistureH2O !== undefined ? r.moistureH2O : '',
      r.so3 !== null && r.so3 !== undefined ? r.so3 : '',
      r.freelimeFCaO !== null && r.freelimeFCaO !== undefined ? r.freelimeFCaO : '',
      r.tph !== null && r.tph !== undefined ? r.tph : '',
      r.proporsiDisplay || '',
      r.notes || ''
    ]);
  });

  millRows.push([]); // blank line

  // VRM Section
  millRows.push(['MILL 2: VERTICAL ROLLER MILL (VRM)']);
  millRows.push([
    'Status:', session.vrm.isRunning ? 'RUNNING' : 'STANDBY / OFF',
    'Produk:', session.vrm.productType || '-',
    'Silo:', session.vrm.siloName || '-',
    'Feeding (TPH):', session.vrm.tphFeeding || '-',
    'Admixture:', `${session.vrm.admixtureName || '-'} (${session.vrm.admixturePpm || 0} PPM)`
  ]);
  millRows.push([
    'Jam',
    'Blaine (cm²/gr)',
    'R45 (%)',
    'H2O (%)',
    'SO3 (%)',
    'F-CaO (%)',
    'TPH Feeding',
    'Proporsi Aktif',
    'Catatan / Notes'
  ]);

  session.vrm.hourlyRows.forEach(r => {
    millRows.push([
      r.hour,
      r.blaine !== null && r.blaine !== undefined ? r.blaine : '',
      r.residuR45 !== null && r.residuR45 !== undefined ? r.residuR45 : '',
      r.moistureH2O !== null && r.moistureH2O !== undefined ? r.moistureH2O : '',
      r.so3 !== null && r.so3 !== undefined ? r.so3 : '',
      r.freelimeFCaO !== null && r.freelimeFCaO !== undefined ? r.freelimeFCaO : '',
      r.tph !== null && r.tph !== undefined ? r.tph : '',
      r.proporsiDisplay || '',
      r.notes || ''
    ]);
  });

  const wsMill = XLSX.utils.aoa_to_sheet(millRows);
  XLSX.utils.book_append_sheet(wb, wsMill, 'Data Mill');

  // ==========================================
  // SHEET 2: DATA WF & DATA CP
  // ==========================================
  const labRows: any[] = [];
  labRows.push(['DATA WEIGH FEEDER & COMPOSITE PRODUCT (CP)']);
  labRows.push(['Tanggal:', session.date, 'Shift:', session.shiftName]);
  labRows.push([]);

  labRows.push(['1. CLINKER WEIGH FEEDER (WF)']);
  labRows.push(['Parameter', 'Nilai (%)']);
  labRows.push(['C3S', session.clinkerWf.c3s ?? '']);
  labRows.push(['F-CaO', session.clinkerWf.fcao ?? '']);
  labRows.push(['C3A', session.clinkerWf.c3a ?? '']);
  labRows.push(['H2O (Moisture)', session.clinkerWf.h2o ?? '']);
  labRows.push([]);

  labRows.push(['2. MOISTURE RAW MATERIAL WEIGH FEEDER (WF)']);
  labRows.push(['Material', 'Kadar Air (%)']);
  labRows.push(['Gypsum', session.moistureWf.gypsum ?? '']);
  labRows.push(['Limestone', session.moistureWf.limestone ?? '']);
  labRows.push(['Trass', session.moistureWf.trass ?? '']);
  labRows.push(['BB Konsumsi', session.moistureWf.bbKonsumsi ?? '']);
  labRows.push([]);

  labRows.push(['3. COMPOSITE PRODUCT (CP) SAMPLE SILO']);
  labRows.push(['Sample', 'Produk', 'Silo', 'Blaine (cm²/gr)', 'R45 (%)', 'H2O (%)', 'SO3 (%)']);
  
  const cpList: any[] = session.cpProducts || (session.cpShiftSilo ? [{
    id: 'cp_1',
    label: 'CP Produk 1',
    productType: session.tm.productType || 'PCC',
    siloName: session.cpShiftSilo.siloName,
    blaine: session.cpShiftSilo.blaine,
    r45: session.cpShiftSilo.r45,
    h2o: session.cpShiftSilo.h2o,
    so3: session.cpShiftSilo.so3,
  }] : []);

  cpList.forEach((cp, idx) => {
    labRows.push([
      cp.label || `CP Produk ${idx + 1}`,
      cp.productType || '',
      cp.siloName || '',
      cp.blaine ?? '',
      cp.r45 ?? '',
      cp.h2o ?? '',
      cp.so3 ?? '',
    ]);
  });

  const wsLab = XLSX.utils.aoa_to_sheet(labRows);
  XLSX.utils.book_append_sheet(wb, wsLab, 'Data WF & CP');

  // ==========================================
  // SHEET 3: PROPORSI CCR
  // ==========================================
  const propRows: any[] = [];
  propRows.push(['RIWAYAT PROPORSI CCR & KALKULASI WET BASE']);
  propRows.push(['Tanggal:', session.date, 'Shift:', session.shiftName]);
  propRows.push([]);

  const addMillProps = (title: string, mill: typeof session.tm) => {
    propRows.push([title]);
    propRows.push(['ID / Label', 'Mulai Jam', 'Selesai Jam', 'Produk', 'Silo', 'TPH', 'Clinker Dry', 'Gypsum Dry', 'Limestone Dry', 'Trass Dry', 'Fly Ash Dry', 'Clinker Wet', 'Gypsum Wet', 'Limestone Wet', 'Trass Wet', 'Fly Ash Wet', 'Admixture']);
    
    mill.proporsiHistory.forEach(p => {
      const m = p.materials;
      propRows.push([
        p.label,
        p.appliedAtHour,
        p.endAtHour || '-',
        p.productType,
        p.siloName,
        p.tphFeeding || 100,
        m.clinker.dry,
        m.gypsum.dry,
        m.limestone.dry,
        m.trass.dry,
        m.flyAsh.dry,
        m.clinker.wet,
        m.gypsum.wet,
        m.limestone.wet,
        m.trass.wet,
        m.flyAsh.wet,
        `${p.admixtureName || mill.admixtureName} ${p.admixturePpm || mill.admixturePpm} PPM`
      ]);
    });
    propRows.push([]);
  };

  addMillProps('1. PROPORSI TUBE MILL (TM)', session.tm);
  addMillProps('2. PROPORSI VERTICAL ROLLER MILL (VRM)', session.vrm);

  const wsProp = XLSX.utils.aoa_to_sheet(propRows);
  XLSX.utils.book_append_sheet(wb, wsProp, 'Proporsi CCR');

  // ==========================================
  // SHEET 4: INCOMING MATERIALS
  // ==========================================
  if (session.incomingMaterials && session.incomingMaterials.length > 0) {
    const incRows: any[] = [];
    incRows.push(['INCOMING RAW MATERIALS']);
    incRows.push(['Material', 'Parameter Terisi']);
    session.incomingMaterials.forEach(m => {
      const p = m.params;
      const details = [];
      if (p.valuePercent !== null && p.valuePercent !== undefined) details.push(`Nilai: ${p.valuePercent}%`);
      if (p.blaine !== null && p.blaine !== undefined) details.push(`Blaine: ${p.blaine}`);
      if (p.r45 !== null && p.r45 !== undefined) details.push(`R45: ${p.r45}%`);
      if (p.h2o !== null && p.h2o !== undefined) details.push(`H2O: ${p.h2o}%`);
      if (p.so3 !== null && p.so3 !== undefined) details.push(`SO3: ${p.so3}%`);
      if (p.c3s !== null && p.c3s !== undefined) details.push(`C3S: ${p.c3s}%`);
      if (p.statusText) details.push(`Status: ${p.statusText}`);
      incRows.push([m.name, details.join(', ') || '-']);
    });
    const wsInc = XLSX.utils.aoa_to_sheet(incRows);
    XLSX.utils.book_append_sheet(wb, wsInc, 'Incoming Materials');
  }

  // Trigger download
  const cleanDate = session.date.replace(/[^0-9-]/g, '');
  const cleanShift = session.shiftName.replace(/\s+/g, '_');
  const filename = `QC_Ciwandan_${cleanDate}_${cleanShift}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Ekspor Rekapitulasi Historis dari Arsip Shift
 */
export function exportRekapitulasiToExcel(sessionsMap: Record<string, ShiftSession>): void {
  const wb = XLSX.utils.book_new();
  const summaryRows: any[] = [];

  summaryRows.push(['REKAPITULASI DATA QC SHIFT - QC PLANT CIWANDAN']);
  summaryRows.push(['Waktu Ekspor:', new Date().toLocaleString('id-ID'), 'Total Arsip:', Object.keys(sessionsMap).length]);
  summaryRows.push([]);

  summaryRows.push([
    'Tanggal',
    'Shift',
    'Analis',
    'TM Status',
    'TM Produk',
    'TM Silo',
    'TM Rata2 Blaine',
    'TM Rata2 R45',
    'TM Rata2 SO3',
    'TM Rata2 TPH',
    'VRM Status',
    'VRM Produk',
    'VRM Silo',
    'VRM Rata2 Blaine',
    'VRM Rata2 R45',
    'VRM Rata2 SO3',
    'VRM Rata2 TPH',
    'CP 1 Produk',
    'CP 1 Silo',
    'CP 1 Blaine',
    'CP 2 Produk',
    'CP 2 Silo',
    'CP 2 Blaine'
  ]);

  const keys = Object.keys(sessionsMap).sort().reverse();
  keys.forEach(k => {
    const s = sessionsMap[k];
    if (!s) return;

    // Helper averages
    const calcAvg = (rows: any[], field: string, decimals = 1) => {
      const vals = rows.map(r => r[field]).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      if (vals.length === 0) return '';
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return Number(avg.toFixed(decimals));
    };

    const tmBlaine = calcAvg(s.tm.hourlyRows, 'blaine', 0);
    const tmR45 = calcAvg(s.tm.hourlyRows, 'residuR45', 2);
    const tmSO3 = calcAvg(s.tm.hourlyRows, 'so3', 2);
    const tmTPH = calcAvg(s.tm.hourlyRows, 'tph', 1);

    const vrmBlaine = calcAvg(s.vrm.hourlyRows, 'blaine', 0);
    const vrmR45 = calcAvg(s.vrm.hourlyRows, 'residuR45', 2);
    const vrmSO3 = calcAvg(s.vrm.hourlyRows, 'so3', 2);
    const vrmTPH = calcAvg(s.vrm.hourlyRows, 'tph', 1);

    const cp1 = s.cpProducts?.[0];
    const cp2 = s.cpProducts?.[1];

    summaryRows.push([
      s.date,
      s.shiftName,
      s.analystName || '',
      s.tm.isRunning ? 'RUNNING' : 'STANDBY',
      s.tm.productType || '',
      s.tm.siloName || '',
      tmBlaine,
      tmR45,
      tmSO3,
      tmTPH,
      s.vrm.isRunning ? 'RUNNING' : 'STANDBY',
      s.vrm.productType || '',
      s.vrm.siloName || '',
      vrmBlaine,
      vrmR45,
      vrmSO3,
      vrmTPH,
      cp1?.productType || '',
      cp1?.siloName || '',
      cp1?.blaine ?? '',
      cp2?.productType || '',
      cp2?.siloName || '',
      cp2?.blaine ?? '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Rekapitulasi_QC_Ciwandan_${today}.xlsx`);
}

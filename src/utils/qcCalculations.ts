import Decimal from 'decimal.js';
import { 
  ShiftName, 
  ShiftDefinition, 
  MaterialPropItem, 
  ShiftSession,
  MillSessionData,
  UnifiedIncomingMaterial
} from '../types/qc';

export const SHIFT_DEFINITIONS: Record<ShiftName, ShiftDefinition> = {
  'SHIFT 1': {
    name: 'SHIFT 1',
    label: 'Shift 1 (Malam / Pagi)',
    category: 'Normal (8 Jam)',
    timeRange: '00:00 - 08:00',
    hours: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'],
  },
  'SHIFT 2': {
    name: 'SHIFT 2',
    label: 'Shift 2 (Pagi / Siang)',
    category: 'Normal (8 Jam)',
    timeRange: '08:00 - 16:00',
    hours: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
  },
  'SHIFT 3': {
    name: 'SHIFT 3',
    label: 'Shift 3 (Sore / Malam)',
    category: 'Normal (8 Jam)',
    timeRange: '16:00 - 24:00',
    hours: ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
  },
  'AM 1': {
    name: 'AM 1',
    label: 'AM 1 (Lembur 12 Jam Siang)',
    category: 'Lembur V1 (12 Jam)',
    timeRange: '08:00 - 20:00',
    hours: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
  },
  'PM 1': {
    name: 'PM 1',
    label: 'PM 1 (Lembur 12 Jam Malam)',
    category: 'Lembur V1 (12 Jam)',
    timeRange: '20:00 - 08:00',
    hours: ['20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'],
  },
  'AM 2': {
    name: 'AM 2',
    label: 'AM 2 (Lembur 10 Jam Siang)',
    category: 'Lembur V2 (10 Jam)',
    timeRange: '08:00 - 18:00',
    hours: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
  },
  'PM 2': {
    name: 'PM 2',
    label: 'PM 2 (Lembur 10 Jam Malam)',
    category: 'Lembur V2 (10 Jam)',
    timeRange: '22:00 - 08:00',
    hours: ['22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'],
  },
};

export interface WetBaseResult {
  clinker: MaterialPropItem;
  gypsum: MaterialPropItem;
  limestone: MaterialPropItem;
  trass: MaterialPropItem;
  flyAsh: MaterialPropItem;
  dryTotal: number;
  wetTotal: number;
  totalMassaBasah: number;
  airMenguap: number;
  isValidDry: boolean;
  isValidWet: boolean;
}

/**
 * Standard Cement Plant Wet Base calculation (Excel FM-CWQC-27 & Balancer 100%)
 * Sesuai SOP QC Plant Ciwandan:
 * 1. Formula W Basah:
 *    W_Basah = %Dry / (1 - (Moist / 100))
 *    Total_W_Basah = SUM(W_Basah material aktif)
 *    %Wet_Kotor = (W_Basah / Total_W_Basah) * 100
 * 2. Sistem Balancer:
 *    - Produk PCC & SPK: %Wet untuk Clinker, Gypsum, Limestone, Fly Ash dibulatkan 1 desimal.
 *      TRASS bertindak sebagai balancer: %Wet_TRASS = 100.0 - SUM(%Wet Clinker + Gypsum + Limestone + Fly Ash).
 *    - Produk OPC (OPC G & OPC P): %Wet untuk Clinker & Gypsum dibulatkan 1 desimal.
 *      LIMESTONE bertindak sebagai balancer: %Wet_LIMESTONE = 100.0 - SUM(%Wet Clinker + Gypsum).
 *    - Footer %Wet terkunci mutlak di angka 100.0%.
 */
export function calculateWetBase(
  materials: {
    clinker: { dry: number; h2o: number };
    gypsum: { dry: number; h2o: number };
    limestone: { dry: number; h2o: number };
    trass: { dry: number; h2o: number };
    flyAsh: { dry: number; h2o: number };
  },
  bufferMaterial: 'trass' | 'clinker' | 'limestone' = 'trass',
  productType?: string
): WetBaseResult {
  const keys = ['clinker', 'gypsum', 'limestone', 'trass', 'flyAsh'] as const;

  // 1. Rumus Dasar Setiap Material (FM-CWQC-27):
  // W_Basah = %Dry / (1 - (Moist / 100))
  // Total_W_Basah = SUM(W_Basah seluruh material aktif)
  const rawWBasah: Record<string, number> = {};
  let totalWBasah = 0;
  let sumDry = 0;

  for (const key of keys) {
    const dry = Number(materials[key]?.dry) || 0;
    const moist = Number(materials[key]?.h2o) || 0;
    sumDry += dry;

    if (dry > 0) {
      const denom = 1 - (moist / 100);
      const validDenom = denom > 0 ? denom : 1;
      const w = dry / validDenom;
      rawWBasah[key] = w;
      totalWBasah += w;
    } else {
      rawWBasah[key] = 0;
    }
  }

  // Cek kategori produk: OPC (OPC G & OPC P) vs PCC & SPK
  const isOpc = (productType && productType.toUpperCase().includes('OPC')) || 
                (materials.trass.dry === 0 && materials.flyAsh.dry === 0 && materials.limestone.dry > 0);

  // Aturan Balancer / Penampung Selisih Pembulatan:
  // - Produk OPC (OPC G & OPC P): Material LIMESTONE adalah balancer mutlak
  // - Produk PCC & SPK: Material TRASS adalah balancer mutlak
  const balancer = isOpc
    ? 'limestone'
    : (materials.trass.dry > 0 ? 'trass' : (materials.limestone.dry > 0 ? 'limestone' : 'clinker'));

  const wetMap: Record<string, number> = {
    clinker: 0, gypsum: 0, limestone: 0, trass: 0, flyAsh: 0
  };
  const wBasahDisplay: Record<string, number> = {
    clinker: 0, gypsum: 0, limestone: 0, trass: 0, flyAsh: 0
  };

  let sumNonBalancer = 0;

  // Hitung %Wet_Murni = (W_Basah / Total_W_Basah) * 100
  // Bulatkan material non-balancer ke 1 tempat desimal menggunakan Math.round(val * 10) / 10
  for (const key of keys) {
    const dry = Number(materials[key]?.dry) || 0;
    const w = rawWBasah[key] || 0;
    wBasahDisplay[key] = Number(w.toFixed(1));

    if (dry <= 0) {
      wetMap[key] = 0;
      continue;
    }

    if (key === balancer) {
      continue;
    }

    const wetMurni = totalWBasah > 0 ? (w / totalWBasah) * 100 : 0;
    const rounded = Math.round(wetMurni * 10) / 10;
    wetMap[key] = rounded;
    sumNonBalancer += rounded;
  }

  // Hitung Balancer dari sisa total:
  // %Wet_TRASS = +(100.0 - (Clinker + Gypsum + Limestone + FlyAsh)).toFixed(1)
  // %Wet_LIMESTONE = +(100.0 - (Clinker + Gypsum)).toFixed(1)
  if (materials[balancer].dry > 0) {
    wetMap[balancer] = +(100.0 - sumNonBalancer).toFixed(1);
  } else {
    wetMap[balancer] = 0;
  }

  // Total %Wet terkunci mutlak di 100.0%
  const finalWetTotal = +(
    wetMap.clinker +
    wetMap.gypsum +
    wetMap.limestone +
    wetMap.trass +
    wetMap.flyAsh
  ).toFixed(1);

  const finalTotalWBasah = Number(totalWBasah.toFixed(1));
  const airMenguap = Math.max(0, Number((totalWBasah - 100.0).toFixed(1)));
  const dryTotalNum = Number(sumDry.toFixed(1));

  return {
    clinker: {
      name: 'Clinker',
      shortName: 'Clk',
      dry: materials.clinker.dry,
      h2o: materials.clinker.h2o,
      wetFactor: totalWBasah > 0 ? Number((rawWBasah.clinker / (materials.clinker.dry || 1)).toFixed(4)) : 1,
      wet: wetMap.clinker,
      wBasah: wBasahDisplay.clinker,
    },
    gypsum: {
      name: 'Gypsum',
      shortName: 'Gyp',
      dry: materials.gypsum.dry,
      h2o: materials.gypsum.h2o,
      wetFactor: totalWBasah > 0 ? Number((rawWBasah.gypsum / (materials.gypsum.dry || 1)).toFixed(4)) : 1,
      wet: wetMap.gypsum,
      wBasah: wBasahDisplay.gypsum,
    },
    limestone: {
      name: 'Limestone',
      shortName: 'Lst',
      dry: materials.limestone.dry,
      h2o: materials.limestone.h2o,
      wetFactor: totalWBasah > 0 ? Number((rawWBasah.limestone / (materials.limestone.dry || 1)).toFixed(4)) : 1,
      wet: wetMap.limestone,
      wBasah: wBasahDisplay.limestone,
    },
    trass: {
      name: 'Trass',
      shortName: 'Trass',
      dry: materials.trass.dry,
      h2o: materials.trass.h2o,
      wetFactor: totalWBasah > 0 ? Number((rawWBasah.trass / (materials.trass.dry || 1)).toFixed(4)) : 1,
      wet: wetMap.trass,
      wBasah: wBasahDisplay.trass,
    },
    flyAsh: {
      name: 'Fly Ash',
      shortName: 'Fly Ash',
      dry: materials.flyAsh.dry,
      h2o: materials.flyAsh.h2o,
      wetFactor: totalWBasah > 0 ? Number((rawWBasah.flyAsh / (materials.flyAsh.dry || 1)).toFixed(4)) : 1,
      wet: wetMap.flyAsh,
      wBasah: wBasahDisplay.flyAsh,
    },
    dryTotal: dryTotalNum,
    wetTotal: finalWetTotal,
    totalMassaBasah: finalTotalWBasah,
    airMenguap,
    isValidDry: Math.abs(dryTotalNum - 100.0) < 0.05,
    isValidWet: Math.abs(finalWetTotal - 100.0) < 0.05,
  };
}

export interface ProporsiReportBlock {
  proporsiId: string;
  label: string;
  startHour: string;
  endHour: string;
  avgTph: string;
  avgBlaine: string;
  avgR45: string;
  avgH2O: string;
  avgSO3: string;
  proporsiSummary: string; // Target Dry Summary (Poin 6: wajib Dry, bukan Wet!)
  admixtureSummary: string;
}

/**
 * Calculates averages for a specific mill session's proporsi history
 * Note: uses DRY proportions for WhatsApp report as specified in instruction point 6!
 */
export function computeMillProporsiAverages(mill: MillSessionData): ProporsiReportBlock[] {
  const { hourlyRows, proporsiHistory } = mill;

  if (!proporsiHistory || proporsiHistory.length === 0) {
    const tphVals = hourlyRows.map(r => r.tph).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const blaineVals = hourlyRows.map(r => r.blaine).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const r45Vals = hourlyRows.map(r => r.residuR45).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const h2oVals = hourlyRows.map(r => r.moistureH2O).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const so3Vals = hourlyRows.map(r => r.so3).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    const firstHour = hourlyRows[0]?.hour || '08:00';
    const lastHour = hourlyRows[hourlyRows.length - 1]?.hour || '16:00';

    return [{
      proporsiId: 'default',
      label: 'Proporsi Standar',
      startHour: firstHour,
      endHour: lastHour,
      avgTph: tphVals.length > 0 ? (tphVals.reduce((a, b) => a + b, 0) / tphVals.length).toFixed(1) : '**',
      avgBlaine: blaineVals.length > 0 ? Math.round(blaineVals.reduce((a, b) => a + b, 0) / blaineVals.length).toString() : '**',
      avgR45: r45Vals.length > 0 ? (r45Vals.reduce((a, b) => a + b, 0) / r45Vals.length).toFixed(2) : '**',
      avgH2O: h2oVals.length > 0 ? (h2oVals.reduce((a, b) => a + b, 0) / h2oVals.length).toFixed(2) : '**',
      avgSO3: so3Vals.length > 0 ? (so3Vals.reduce((a, b) => a + b, 0) / so3Vals.length).toFixed(2) : '**',
      proporsiSummary: '72.0% Clk | 4.0% Gyp | 14.0% Lst | 5.0% Trass | 5.0% FA',
      admixtureSummary: `${mill.admixtureName} ${mill.admixturePpm} PPM`,
    }];
  }

  const blocks: ProporsiReportBlock[] = [];

  for (let i = 0; i < proporsiHistory.length; i++) {
    const prop = proporsiHistory[i];
    const nextProp = proporsiHistory[i + 1];

    const startH = prop.appliedAtHour || (hourlyRows[0]?.hour || '08:00');
    const endH = prop.endAtHour || (nextProp ? nextProp.appliedAtHour : (hourlyRows[hourlyRows.length - 1]?.hour || '16:00'));

    const matchedRows = hourlyRows.filter(r => {
      if (r.proporsiVersionId && r.proporsiVersionId === prop.id) return true;
      const rIdx = hourlyRows.findIndex(row => row.hour === r.hour);
      const startIdx = hourlyRows.findIndex(row => row.hour === startH);
      const endIdx = hourlyRows.findIndex(row => row.hour === endH);
      
      if (startIdx !== -1 && endIdx !== -1) {
        if (nextProp) {
          return rIdx >= startIdx && rIdx < endIdx;
        } else {
          return rIdx >= startIdx && rIdx <= endIdx;
        }
      }
      return false;
    });

    const tphVals = matchedRows.map(r => r.tph).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const blaineVals = matchedRows.map(r => r.blaine).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const r45Vals = matchedRows.map(r => r.residuR45).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const h2oVals = matchedRows.map(r => r.moistureH2O).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const so3Vals = matchedRows.map(r => r.so3).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    // Point 6 Requirement: Use DRY proportions, NOT Wet Base! (Filter out 0% materials)
    const m = prop.materials;
    const summaryParts: string[] = [];
    if (m.clinker.dry > 0) summaryParts.push(`${m.clinker.dry.toFixed(1)}% Clk`);
    if (m.gypsum.dry > 0) summaryParts.push(`${m.gypsum.dry.toFixed(1)}% Gyp`);
    if (m.limestone.dry > 0) summaryParts.push(`${m.limestone.dry.toFixed(1)}% Lst`);
    if (m.trass.dry > 0) summaryParts.push(`${m.trass.dry.toFixed(1)}% Trass`);
    if (m.flyAsh.dry > 0) summaryParts.push(`${m.flyAsh.dry.toFixed(1)}% FA`);
    const summary = summaryParts.join(' | ');

    blocks.push({
      proporsiId: prop.id,
      label: prop.label,
      startHour: startH,
      endHour: endH,
      avgTph: tphVals.length > 0 ? (tphVals.reduce((a, b) => a + b, 0) / tphVals.length).toFixed(1) : '**',
      avgBlaine: blaineVals.length > 0 ? Math.round(blaineVals.reduce((a, b) => a + b, 0) / blaineVals.length).toString() : '**',
      avgR45: r45Vals.length > 0 ? (r45Vals.reduce((a, b) => a + b, 0) / r45Vals.length).toFixed(2) : '**',
      avgH2O: h2oVals.length > 0 ? (h2oVals.reduce((a, b) => a + b, 0) / h2oVals.length).toFixed(2) : '**',
      avgSO3: so3Vals.length > 0 ? (so3Vals.reduce((a, b) => a + b, 0) / so3Vals.length).toFixed(2) : '**',
      proporsiSummary: summary,
      admixtureSummary: `${prop.admixtureName || mill.admixtureName} ${prop.admixturePpm || mill.admixturePpm} PPM`,
    });
  }

  return blocks;
}

export function formatIndonesianDate(dateString: string): string {
  try {
    const months = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return dateString.toUpperCase();
    return `${day} ${months[month - 1]} ${year}`;
  } catch {
    return dateString.toUpperCase();
  }
}

export function formatIndonesianDateTitleCase(dateString?: string): string {
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    if (!dateString) {
      const now = new Date();
      return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    return `${day} ${months[month - 1]} ${year}`;
  } catch {
    return dateString || '';
  }
}


function fmtNumComma(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '**';
  }
  return Number(val.toFixed(decimals)).toString().replace('.', ',');
}

function formatDryPropParts(materials: any, admixtureName?: string, admixturePpm?: number): string {
  const propParts: string[] = [];
  if (materials) {
    if (materials.clinker && materials.clinker.dry > 0) {
      const v = materials.clinker.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% Clk`);
    }
    if (materials.gypsum && materials.gypsum.dry > 0) {
      const v = materials.gypsum.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% Gyp`);
    }
    if (materials.limestone && materials.limestone.dry > 0) {
      const v = materials.limestone.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% Lst`);
    }
    if (materials.trass && materials.trass.dry > 0) {
      const v = materials.trass.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% Trass`);
    }
    if (materials.flyAsh && materials.flyAsh.dry > 0) {
      const v = materials.flyAsh.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% FA`);
    }
  }
  const propStr = propParts.length > 0 ? propParts.join(' + ') : '*74,0*% Clk + *4,0*% Gyp + *17,0*% Lst + *5,0*% Trass';
  const admName = admixtureName || 'CGA Sika';
  const admPpm = admixturePpm || 400;
  return `${propStr} *${admName} ${admPpm} PPM*`;
}

function renderCleanMillBlock(mill: MillSessionData): string {
  const header = `*${mill.millCode} ${mill.productType} ${mill.siloName}*`;
  const allRows = mill.hourlyRows;

  // Pemisahan Draft Proporsi & Rata-rata Sesuai Jam (Poin 4: jika ada perubahan proporsi di tengah shift)
  if (mill.proporsiHistory && mill.proporsiHistory.length > 1) {
    const subBlocks: string[] = [];
    const props = mill.proporsiHistory;

    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      const startHour = prop.appliedAtHour || allRows[0]?.hour || '08:00';
      const nextProp = props[i + 1];

      // Tentukan rentang baris jam untuk proporsi ini
      const startIdx = allRows.findIndex(r => r.hour === startHour);
      let endIdx = allRows.length - 1;

      if (nextProp && nextProp.appliedAtHour) {
        const nextIdx = allRows.findIndex(r => r.hour === nextProp.appliedAtHour);
        if (nextIdx > 0) {
          endIdx = nextIdx - 1;
        }
      }

      const effectiveStartIdx = startIdx !== -1 ? startIdx : 0;
      const effectiveEndIdx = Math.max(effectiveStartIdx, endIdx);
      const intervalRows = allRows.slice(effectiveStartIdx, effectiveEndIdx + 1);

      if (intervalRows.length === 0) continue;

      const firstH = intervalRows[0].hour;
      const lastH = intervalRows[intervalRows.length - 1].hour;
      const intervalLabel = `*(${firstH} - ${lastH})*`;

      // Hitung rata-rata khusus pada rentang jam proporsi aktif ini
      const blaineVals = intervalRows.map(r => r.blaine).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      const r45Vals = intervalRows.map(r => r.residuR45).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      const h2oVals = intervalRows.map(r => r.moistureH2O).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      const so3Vals = intervalRows.map(r => r.so3).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

      const avgBlaine = blaineVals.length > 0 ? Math.round(blaineVals.reduce((a, b) => a + b, 0) / blaineVals.length).toString() : '**';
      const avgR45 = r45Vals.length > 0 ? (r45Vals.reduce((a, b) => a + b, 0) / r45Vals.length).toFixed(2).replace('.', ',') : '**';
      const avgH2O = h2oVals.length > 0 ? (h2oVals.reduce((a, b) => a + b, 0) / h2oVals.length).toFixed(2).replace('.', ',') : '**';
      const avgSO3 = so3Vals.length > 0 ? (so3Vals.reduce((a, b) => a + b, 0) / so3Vals.length).toFixed(2).replace('.', ',') : '**';

      const propStr = formatDryPropParts(prop.materials, prop.admixtureName || mill.admixtureName, prop.admixturePpm || mill.admixturePpm);

      subBlocks.push(`${intervalLabel}
Blaine : *${avgBlaine}* cm²/gr
R45 : *${avgR45}*%
H2O : *${avgH2O}*% 
SO3 : *${avgSO3}*%
Proportion : ${propStr}`);
    }

    return `${header}\n\n${subBlocks.join('\n\n')}`;
  }

  // Jika selama shift berjalan hanya ada 1 proporsi tanpa perubahan
  const blaineVals = mill.hourlyRows.map(r => r.blaine).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  const r45Vals = mill.hourlyRows.map(r => r.residuR45).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  const h2oVals = mill.hourlyRows.map(r => r.moistureH2O).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  const so3Vals = mill.hourlyRows.map(r => r.so3).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  const tphVals = mill.hourlyRows.map(r => r.tph).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

  const avgBlaine = blaineVals.length > 0 ? Math.round(blaineVals.reduce((a, b) => a + b, 0) / blaineVals.length).toString() : '**';
  const avgR45 = r45Vals.length > 0 ? (r45Vals.reduce((a, b) => a + b, 0) / r45Vals.length).toFixed(2).replace('.', ',') : '**';
  const avgH2O = h2oVals.length > 0 ? (h2oVals.reduce((a, b) => a + b, 0) / h2oVals.length).toFixed(2).replace('.', ',') : '**';
  const avgSO3 = so3Vals.length > 0 ? (so3Vals.reduce((a, b) => a + b, 0) / so3Vals.length).toFixed(2).replace('.', ',') : '**';
  const avgTph = tphVals.length > 0 ? Math.round(tphVals.reduce((a, b) => a + b, 0) / tphVals.length).toString() : (mill.tphFeeding ? Math.round(mill.tphFeeding).toString() : '**');

  const latestProp = mill.proporsiHistory && mill.proporsiHistory.length > 0 
    ? mill.proporsiHistory[mill.proporsiHistory.length - 1] 
    : null;

  const propStr = formatDryPropParts(latestProp?.materials, latestProp?.admixtureName || mill.admixtureName, latestProp?.admixturePpm || mill.admixturePpm);

  return `${header}
Blaine : *${avgBlaine}* cm²/gr
R45 : *${avgR45}*%
H2O : *${avgH2O}*% 
SO3 : *${avgSO3}*%
TPH : *${avgTph}* t/h
Proportion : ${propStr}`;
}

/**
 * Format Incoming Materials list without points or emojis
 */
function renderCleanIncomingMaterials(materials: UnifiedIncomingMaterial[]): string {
  const blocks: string[] = [];

  for (const m of materials) {
    const p = m.params;

    // Check if it's a simple percent / status item
    if (m.enabledParams.includes('valuePercent') && !m.enabledParams.includes('blaine') && !m.enabledParams.includes('c3s')) {
      if (p.valuePercent !== null && p.valuePercent !== undefined) {
        const valStr = p.valuePercent.toString().replace('.', ',');
        blocks.push(`*${m.name}* : *${valStr}%*`);
      } else if (p.statusText) {
        blocks.push(`*${m.name}* : **% (${p.statusText})`);
      } else {
        blocks.push(`*${m.name}* : **%`);
      }
    } else if (m.enabledParams.includes('blaine') || m.enabledParams.includes('r45')) {
      const lines: string[] = [`*${m.name}*`];
      lines.push(`Blaine : *${p.blaine !== null && p.blaine !== undefined ? Math.round(p.blaine).toString() : '**'}* cm²/gr`);
      lines.push(`R45 : *${fmtNumComma(p.r45, 2)}*%`);
      lines.push(`H2O : *${fmtNumComma(p.h2o, 2)}*%`);
      if (m.enabledParams.includes('so3')) {
        lines.push(`SO3 : *${fmtNumComma(p.so3, 2)}*%`);
      }
      blocks.push(lines.join('\n'));
    } else if (m.enabledParams.includes('c3s')) {
      const lines: string[] = [`*${m.name}*`];
      lines.push(`C3S : *${fmtNumComma(p.c3s, 2)}*%`);
      lines.push(`F-CaO : *${fmtNumComma(p.fcao, 2)}*%`);
      lines.push(`C3A : *${fmtNumComma(p.c3a, 2)}*%`);
      lines.push(`H2O : *${fmtNumComma(p.h2o, 2)}*%`);
      blocks.push(lines.join('\n'));
    } else {
      const lines: string[] = [`*${m.name}*`];
      m.enabledParams.forEach(paramKey => {
        if (paramKey === 'statusText' && p.statusText) {
          lines.push(`Status : *${p.statusText}*`);
        } else if (p[paramKey] !== undefined) {
          lines.push(`${paramKey.toUpperCase()} : *${fmtNumComma(p[paramKey] as any, 2)}*%`);
        }
      });
      blocks.push(lines.join('\n'));
    }
  }

  return blocks.join('\n\n');
}

/**
 * Generate clean WhatsApp report:
 * No emoji, no alphabetical index, comma decimals, clean equipment titles, dual CP, and analyst name at the end
 */
export function generateWhatsAppReport(session: ShiftSession): string {
  const formattedDate = formatIndonesianDate(session.date);

  const sections: string[] = [];

  // Top Title
  sections.push(`*LAPORAN ${session.shiftName.toUpperCase()}*\n*${formattedDate}*`);

  // Mill Sections (TM and/or VRM)
  const tmActive = session.tm.isRunning || session.tm.hourlyRows.some(r => r.blaine !== null);
  const vrmActive = session.vrm.isRunning || session.vrm.hourlyRows.some(r => r.blaine !== null);

  if (vrmActive && !tmActive) {
    sections.push(renderCleanMillBlock(session.vrm));
  } else if (tmActive && !vrmActive) {
    sections.push(renderCleanMillBlock(session.tm));
  } else if (tmActive && vrmActive) {
    // Both active: TM first, then VRM
    sections.push(renderCleanMillBlock(session.tm));
    sections.push(renderCleanMillBlock(session.vrm));
  } else {
    // Default fallback
    sections.push(renderCleanMillBlock(session.tm));
  }

  // Clinker WF
  const cWf = session.clinkerWf;
  sections.push(`*Clinker WF*
C3S : *${fmtNumComma(cWf.c3s, 2)}*%
F-CaO : *${fmtNumComma(cWf.fcao, 2)}*%
C3A : *${fmtNumComma(cWf.c3a, 2)}*%
H2O : *${fmtNumComma(cWf.h2o, 2)}*%`);

  // Moisture Raw Material WF
  const mWf = session.moistureWf;
  sections.push(`*Moisture Raw Material WF*
Gypsum : *${fmtNumComma(mWf.gypsum, 1)}*%
Limestone : *${fmtNumComma(mWf.limestone, 1)}*% 
Trass : *${fmtNumComma(mWf.trass, 1)}*%
BB konsumsi : *${fmtNumComma(mWf.bbKonsumsi, 1)}*%`);

  // CP Products (Accommodates 2 samples per shift)
  const cpProducts = session.cpProducts || (session.cpShiftSilo ? [
    {
      id: 'cp_1',
      label: 'CP Produk 1',
      productType: session.tm.productType || 'PCC',
      siloName: session.cpShiftSilo.siloName,
      blaine: session.cpShiftSilo.blaine,
      r45: session.cpShiftSilo.r45,
      h2o: session.cpShiftSilo.h2o,
      so3: session.cpShiftSilo.so3,
    }
  ] : []);

  for (const cp of cpProducts) {
    if (cp && (cp.blaine !== null || cp.r45 !== null || cp.h2o !== null || cp.so3 !== null || cp.productType)) {
      const blaineStr = cp.blaine !== null && cp.blaine !== undefined ? Math.round(cp.blaine).toString() : '**';
      const r45Str = cp.r45 !== null && cp.r45 !== undefined ? cp.r45.toFixed(2).replace('.', ',') : '**';
      const h2oStr = cp.h2o !== null && cp.h2o !== undefined ? cp.h2o.toFixed(2).replace('.', ',') : '**';
      const so3Str = cp.so3 !== null && cp.so3 !== undefined ? cp.so3.toFixed(2).replace('.', ',') : '**';
      
      const manualName = (cp.productType || 'SEMEN').trim();
      const title = `*CP ${session.shiftName.toUpperCase()} ${manualName.toUpperCase()}*`;

      sections.push(`${title}
Blaine : *${blaineStr}* cm²/gr
R45 : *${r45Str}*%
H2O : *${h2oStr}*% 
SO3 : *${so3Str}*%`);
    }
  }

  // Incoming Materials
  if (session.incomingMaterials && session.incomingMaterials.length > 0) {
    sections.push(renderCleanIncomingMaterials(session.incomingMaterials));
  }

  // Footer with on-duty Analyst Name
  const analyst = session.analystName ? session.analystName.toUpperCase() : 'AHMAD RIFAI';
  sections.push(`Terimakasih\n*${analyst}*`);

  return sections.join('\n\n');
}

/**
 * Poin 1.3: Quality Warning jika produk adalah OPC dan Limestone (%Dry) > 5.0%
 */
export function checkOpcLimestoneWarning(productType: string, limestoneDry: number): {
  hasWarning: boolean;
  message: string;
} {
  const isOpc = productType.toUpperCase().includes('OPC');
  if (isOpc && limestoneDry > 5.0) {
    return {
      hasWarning: true,
      message: `Peringatan Komposisi OPC: Kandungan Limestone (${limestoneDry.toFixed(1)}%) > 5.0% (potensi reklasifikasi produk non-OPC).`,
    };
  }
  return { hasWarning: false, message: '' };
}

/**
 * Poin 4: Auto-detect time & restriksi login shift
 * Validasi rentang waktu login:
 * - Shift 1 (00:00 - 08:00): Aktif pada rentang 23:00 - 08:30 WIB
 * - Shift 2 (08:00 - 16:00): Aktif pada rentang 07:00 - 16:30 WIB
 * - Shift 3 (16:00 - 24:00): Aktif pada rentang 15:00 - 00:30 WIB
 * - Shift AM 1 / AM 2: Aktif pada rentang 07:00 - 20:30 WIB
 * - Shift PM 1 / PM 2: Aktif pada rentang 19:00 - 08:30 WIB
 */
export function isShiftAllowedNow(shiftName: ShiftName, date: Date = new Date()): boolean {
  const totalMins = date.getHours() * 60 + date.getMinutes();

  switch (shiftName) {
    case 'SHIFT 1':
      return totalMins >= 1380 || totalMins <= 510; // 23:00 s/d 08:30
    case 'SHIFT 2':
      return totalMins >= 420 && totalMins <= 990;  // 07:00 s/d 16:30
    case 'SHIFT 3':
      return totalMins >= 900 || totalMins <= 30;   // 15:00 s/d 00:30
    case 'AM 1':
    case 'AM 2':
      return totalMins >= 420 && totalMins <= 1230; // 07:00 s/d 20:30
    case 'PM 1':
    case 'PM 2':
      return totalMins >= 1140 || totalMins <= 510; // 19:00 s/d 08:30
    default:
      return true;
  }
}

export function getAutoRecommendedShift(date: Date = new Date()): ShiftName {
  const totalMins = date.getHours() * 60 + date.getMinutes();
  if (totalMins >= 420 && totalMins < 900) {
    return 'SHIFT 2';
  }
  if (totalMins >= 900 && totalMins < 1380) {
    return 'SHIFT 3';
  }
  return 'SHIFT 1';
}


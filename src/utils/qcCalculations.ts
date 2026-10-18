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
    hours: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00'],
  },
  'SHIFT 2': {
    name: 'SHIFT 2',
    label: 'Shift 2 (Pagi / Siang)',
    category: 'Normal (8 Jam)',
    timeRange: '08:00 - 16:00',
    hours: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
  },
  'SHIFT 3': {
    name: 'SHIFT 3',
    label: 'Shift 3 (Sore / Malam)',
    category: 'Normal (8 Jam)',
    timeRange: '16:00 - 24:00',
    hours: ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'],
  },
  'AM 1': {
    name: 'AM 1',
    label: 'AM 1 (Lembur 12 Jam Siang)',
    category: 'Lembur V1 (12 Jam)',
    timeRange: '08:00 - 20:00',
    hours: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
  },
  'PM 1': {
    name: 'PM 1',
    label: 'PM 1 (Lembur 12 Jam Malam)',
    category: 'Lembur V1 (12 Jam)',
    timeRange: '20:00 - 08:00',
    hours: ['20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00'],
  },
  'AM 2': {
    name: 'AM 2',
    label: 'AM 2 (Lembur 10 Jam Siang)',
    category: 'Lembur V2 (10 Jam)',
    timeRange: '08:00 - 18:00',
    hours: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
  },
  'PM 2': {
    name: 'PM 2',
    label: 'PM 2 (Lembur 10 Jam Malam)',
    category: 'Lembur V2 (10 Jam)',
    timeRange: '22:00 - 08:00',
    hours: ['22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00'],
  },
};

/**
 * High-precision Wet Base calculation using Decimal.js
 */
export function calculateWetBase(
  materials: {
    clinker: { dry: number; h2o: number };
    gypsum: { dry: number; h2o: number };
    limestone: { dry: number; h2o: number };
    trass: { dry: number; h2o: number };
    flyAsh: { dry: number; h2o: number };
  },
  bufferMaterial: 'trass' | 'clinker' = 'trass'
): {
  clinker: MaterialPropItem;
  gypsum: MaterialPropItem;
  limestone: MaterialPropItem;
  trass: MaterialPropItem;
  flyAsh: MaterialPropItem;
  dryTotal: number;
  wetTotal: number;
  isValidDry: boolean;
  isValidWet: boolean;
} {
  const keys = ['clinker', 'gypsum', 'limestone', 'trass', 'flyAsh'] as const;
  
  let sumWetFactor = new Decimal(0);
  let sumDry = new Decimal(0);

  const rawFactors: Record<string, Decimal> = {};

  for (const key of keys) {
    const dryDec = new Decimal(materials[key].dry || 0);
    const h2oDec = new Decimal(materials[key].h2o || 0);
    sumDry = sumDry.plus(dryDec);

    if (dryDec.isZero()) {
      rawFactors[key] = new Decimal(0);
    } else {
      const denominator = new Decimal(1).minus(h2oDec.div(100));
      if (denominator.isZero() || denominator.isNegative()) {
        rawFactors[key] = dryDec;
      } else {
        const factor = dryDec.div(denominator);
        rawFactors[key] = factor;
        sumWetFactor = sumWetFactor.plus(factor);
      }
    }
  }

  const wetPercentages: Record<string, number> = {};
  let preliminaryWetSum = new Decimal(0);

  for (const key of keys) {
    if (sumWetFactor.isZero() || rawFactors[key].isZero()) {
      wetPercentages[key] = 0;
    } else {
      const prop = rawFactors[key].div(sumWetFactor).times(100);
      const rounded = Number(prop.toFixed(1));
      wetPercentages[key] = rounded;
      preliminaryWetSum = preliminaryWetSum.plus(new Decimal(rounded));
    }
  }

  // Adjust rounding remainder into buffer material for absolute 100.0%
  const remainder = new Decimal(100.0).minus(preliminaryWetSum);
  const targetBuffer = (bufferMaterial === 'trass' && materials.trass.dry > 0) ? 'trass' : 'clinker';

  if (!remainder.isZero() && !sumWetFactor.isZero()) {
    const currentBufferVal = new Decimal(wetPercentages[targetBuffer]);
    wetPercentages[targetBuffer] = Number(currentBufferVal.plus(remainder).toFixed(1));
  }

  let finalWetSum = 0;
  for (const key of keys) {
    finalWetSum += wetPercentages[key];
  }
  finalWetSum = Number(finalWetSum.toFixed(1));

  const dryTotalNum = Number(sumDry.toFixed(1));

  return {
    clinker: {
      name: 'Clinker',
      shortName: 'Clk',
      dry: materials.clinker.dry,
      h2o: materials.clinker.h2o,
      wetFactor: Number(rawFactors.clinker.toFixed(4)),
      wet: wetPercentages.clinker,
    },
    gypsum: {
      name: 'Gypsum',
      shortName: 'Gyp',
      dry: materials.gypsum.dry,
      h2o: materials.gypsum.h2o,
      wetFactor: Number(rawFactors.gypsum.toFixed(4)),
      wet: wetPercentages.gypsum,
    },
    limestone: {
      name: 'Limestone',
      shortName: 'Lst',
      dry: materials.limestone.dry,
      h2o: materials.limestone.h2o,
      wetFactor: Number(rawFactors.limestone.toFixed(4)),
      wet: wetPercentages.limestone,
    },
    trass: {
      name: 'Trass',
      shortName: 'Trass',
      dry: materials.trass.dry,
      h2o: materials.trass.h2o,
      wetFactor: Number(rawFactors.trass.toFixed(4)),
      wet: wetPercentages.trass,
    },
    flyAsh: {
      name: 'Fly Ash',
      shortName: 'Fly Ash',
      dry: materials.flyAsh.dry,
      h2o: materials.flyAsh.h2o,
      wetFactor: Number(rawFactors.flyAsh.toFixed(4)),
      wet: wetPercentages.flyAsh,
    },
    dryTotal: dryTotalNum,
    wetTotal: finalWetSum,
    isValidDry: Math.abs(dryTotalNum - 100.0) < 0.05,
    isValidWet: Math.abs(finalWetSum - 100.0) < 0.05,
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

    // Point 6 Requirement: Use DRY proportions, NOT Wet Base!
    const m = prop.materials;
    const summary = `${m.clinker.dry.toFixed(1)}% Clk | ${m.gypsum.dry.toFixed(1)}% Gyp | ${m.limestone.dry.toFixed(1)}% Lst | ${m.trass.dry.toFixed(1)}% Trass | ${m.flyAsh.dry.toFixed(1)}% FA`;

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

function fmtVal(val: number | null | undefined, decimals = 2, unit = ''): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '**';
  }
  return `${Number(val.toFixed(decimals))}${unit}`;
}

/**
 * Renders the block for a single mill in WhatsApp format
 */
function renderMillBlock(prefix: string, title: string, mill: MillSessionData): string {
  const blocks = computeMillProporsiAverages(mill);
  const header = `⚙️ *${prefix}. ${title} - ${mill.productType} ${mill.siloName}*`;

  const propLines = blocks.map(b => {
    return `*Proporsi (${b.startHour} - ${b.endHour})*
• Feeding: *${b.avgTph}* t/h
• Blaine : *${b.avgBlaine}* cm²/gr
• R45    : *${b.avgR45}*%
• H2O    : *${b.avgH2O}*% 
• SO3    : *${b.avgSO3}*%
• Proporsi : *${b.proporsiSummary}*
• Admixture: *${b.admixtureSummary}*`;
  }).join('\n\n');

  return `${header}\n\n${propLines}`;
}

/**
 * Format Incoming Materials list
 */
function renderUnifiedIncomingMaterials(materials: UnifiedIncomingMaterial[]): string {
  const lines: string[] = [];

  for (const m of materials) {
    const p = m.params;

    // Check if it's a simple percent / status item
    if (m.enabledParams.includes('valuePercent') && !m.enabledParams.includes('blaine') && !m.enabledParams.includes('c3s')) {
      const valStr = p.valuePercent !== null && p.valuePercent !== undefined ? `${p.valuePercent}%` : (p.statusText || '**');
      lines.push(`*${m.name}* : *${valStr}*`);
    } else if (m.enabledParams.includes('blaine') || m.enabledParams.includes('r45')) {
      const parts: string[] = [];
      if (m.enabledParams.includes('blaine')) parts.push(`Blaine : *${fmtVal(p.blaine, 0)}* cm²/gr`);
      if (m.enabledParams.includes('r45')) parts.push(`R45 : *${fmtVal(p.r45)}*%`);
      if (m.enabledParams.includes('h2o')) parts.push(`H2O : *${fmtVal(p.h2o)}*%`);
      if (m.enabledParams.includes('so3')) parts.push(`SO3 : *${fmtVal(p.so3)}*%`);

      lines.push(`*${m.name}*\n• ${parts.join(' | ')}`);
    } else if (m.enabledParams.includes('c3s')) {
      const parts: string[] = [];
      if (m.enabledParams.includes('c3s')) parts.push(`C3S : *${fmtVal(p.c3s)}*%`);
      if (m.enabledParams.includes('fcao')) parts.push(`F-CaO : *${fmtVal(p.fcao)}*%`);
      if (m.enabledParams.includes('c3a')) parts.push(`C3A : *${fmtVal(p.c3a)}*%`);
      if (m.enabledParams.includes('h2o')) parts.push(`H2O : *${fmtVal(p.h2o)}*%`);

      lines.push(`*${m.name}*\n• ${parts.join(' | ')}`);
    } else {
      const parts: string[] = [];
      m.enabledParams.forEach(paramKey => {
        if (paramKey === 'statusText' && p.statusText) parts.push(`Status : *${p.statusText}*`);
        else if (p[paramKey] !== undefined) parts.push(`${paramKey.toUpperCase()} : *${fmtVal(p[paramKey] as any)}*`);
      });
      lines.push(`*${m.name}*\n• ${parts.join(' | ')}`);
    }
  }

  return lines.join('\n\n');
}

/**
 * Generate full Dual-Mill WhatsApp report
 */
export function generateWhatsAppReport(session: ShiftSession): string {
  const formattedDate = formatIndonesianDate(session.date);

  const tmHasData = session.tm.isRunning || session.tm.hourlyRows.some(r => r.blaine !== null);
  const vrmHasData = session.vrm.isRunning || session.vrm.hourlyRows.some(r => r.blaine !== null);

  const millSections: string[] = [];

  // Order priority: TM (Mill 1) first, then VRM (Mill 2)
  if (tmHasData) {
    millSections.push(renderMillBlock('A1', 'TM (MILL 1)', session.tm));
  }
  if (vrmHasData) {
    millSections.push(renderMillBlock('A2', 'VRM (MILL 2)', session.vrm));
  }

  if (millSections.length === 0) {
    millSections.push(renderMillBlock('A1', 'TM (MILL 1)', session.tm));
  }

  const sectionAContent = millSections.join('\n\n');

  // Section B - Clinker WF
  const cWf = session.clinkerWf;
  const sectionB = `⚖️ *B. CLINKER WF*
• C3S   : *${fmtVal(cWf.c3s)}*%
• F-CaO : *${fmtVal(cWf.fcao)}*%
• C3A   : *${fmtVal(cWf.c3a)}*%
• H2O   : *${fmtVal(cWf.h2o)}*%`;

  // Section C - Moisture Raw Material WF
  const mWf = session.moistureWf;
  const sectionC = `💧 *C. MOISTURE RAW MATERIAL WF*
• Gypsum      : *${fmtVal(mWf.gypsum)}*%
• Limestone   : *${fmtVal(mWf.limestone)}*% 
• Trass       : *${fmtVal(mWf.trass)}*%
• BB Konsumsi : *${fmtVal(mWf.bbKonsumsi)}*%`;

  // Section D - CP SHIFT SILO
  const cp = session.cpShiftSilo;
  const cpTitle = `CP ${session.shiftName} ${cp.siloName || 'SILO'}`;
  const sectionD = `📦 *D. ${cpTitle.toUpperCase()}*
• Blaine : *${fmtVal(cp.blaine, 0)}* cm²/gr
• R45    : *${fmtVal(cp.r45)}*%
• H2O    : *${fmtVal(cp.h2o)}*% 
• SO3    : *${fmtVal(cp.so3)}*%`;

  // Section E - Unified Incoming Raw Material
  const incomingBody = renderUnifiedIncomingMaterials(session.incomingMaterials || []);
  const sectionE = `🚚 *E. INCOMING RAW MATERIAL*\n${incomingBody}`;

  return `📋 *LAPORAN ANALISA PROSES QC*
🏭 *Grinding Plant Ciwandan*
📅 *${formattedDate}*
🕒 *${session.shiftName}* (${session.shiftHours})

${sectionAContent}

${sectionB}

${sectionC}

${sectionD}

${sectionE}

Terimakasih`;
}

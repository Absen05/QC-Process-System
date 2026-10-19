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

function fmtNumComma(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '**';
  }
  return Number(val.toFixed(decimals)).toString().replace('.', ',');
}

function renderCleanMillBlock(mill: MillSessionData): string {
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

  // Active proportion details - Wajib %DRY bukan %WET (Poin 6)
  const latestProp = mill.proporsiHistory && mill.proporsiHistory.length > 0 
    ? mill.proporsiHistory[mill.proporsiHistory.length - 1] 
    : null;

  const m = latestProp?.materials;
  const propParts: string[] = [];
  if (m) {
    if (m.clinker && m.clinker.dry > 0) {
      const v = m.clinker.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% Clk`);
    }
    if (m.gypsum && m.gypsum.dry > 0) {
      const v = m.gypsum.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% Gyp`);
    }
    if (m.limestone && m.limestone.dry > 0) {
      const v = m.limestone.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% Lst`);
    }
    if (m.trass && m.trass.dry > 0) {
      const v = m.trass.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% Trass`);
    }
    if (m.flyAsh && m.flyAsh.dry > 0) {
      const v = m.flyAsh.dry.toFixed(1).replace('.', ',');
      propParts.push(`*${v}*% FA`);
    }
  }

  const propStr = propParts.length > 0 ? propParts.join(' + ') : '*74,0*% Clk + *4,0*% Gyp + *17,0*% Lst + *5,0*% Trass';
  const admName = latestProp?.admixtureName || mill.admixtureName || 'CGA Sika';
  const admPpm = latestProp?.admixturePpm || mill.admixturePpm || 400;

  const header = `*${mill.millCode} ${mill.productType} ${mill.siloName}*`;

  return `${header}
Blaine : *${avgBlaine}* cm²/gr
R45 : *${avgR45}*%
H2O : *${avgH2O}*% 
SO3 : *${avgSO3}*%
TPH : *${avgTph}* t/h
Proportion : ${propStr} *${admName} ${admPpm} PPM*`;
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
      
      const prodName = (cp.productType || 'SEMEN').trim();
      const siloName = (cp.siloName || '').trim();
      
      // If prodName already contains silo info (e.g. 'FLEXIPLUS SILO 4' or 'OPC SILO 2'), do not repeat silo
      let title: string;
      if (prodName.toUpperCase().includes('SILO')) {
        title = `*CP ${session.shiftName.toUpperCase()} ${prodName.toUpperCase()}*`;
      } else if (siloName) {
        title = `*CP ${session.shiftName.toUpperCase()} ${prodName.toUpperCase()} ${siloName.toUpperCase()}*`;
      } else {
        title = `*CP ${session.shiftName.toUpperCase()} ${prodName.toUpperCase()}*`;
      }

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

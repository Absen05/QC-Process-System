import { 
  MasterTargetDryMap, 
  ShiftSession, 
  UnifiedIncomingMaterial,
  ClinkerWfData,
  MoistureRawMaterialWf,
  CpShiftSilo,
  ProductType,
  MillSessionData
} from '../types/qc';
import { SHIFT_DEFINITIONS, calculateWetBase } from '../utils/qcCalculations';

export const DEFAULT_MASTER_TARGETS: MasterTargetDryMap = {
  'Tube Mill (TM)': {
    'PCC NON FA': { clinker: 74.0, gypsum: 4.0, limestone: 17.0, trass: 5.0, flyAsh: 0.0 },
    'PCC Plus FA': { clinker: 72.0, gypsum: 4.0, limestone: 14.0, trass: 5.0, flyAsh: 5.0 },
    'PCC WS': { clinker: 70.0, gypsum: 4.0, limestone: 16.0, trass: 10.0, flyAsh: 0.0 },
    'SPK': { clinker: 82.0, gypsum: 4.0, limestone: 9.0, trass: 5.0, flyAsh: 0.0 },
    'OPC G': { clinker: 91.0, gypsum: 4.0, limestone: 5.0, trass: 0.0, flyAsh: 0.0 },
    'OPC P': { clinker: 92.0, gypsum: 4.0, limestone: 4.0, trass: 0.0, flyAsh: 0.0 },
  },
  'Vertical Roller Mill (VRM)': {
    'PCC Plus FA': { clinker: 72.0, gypsum: 4.0, limestone: 14.0, trass: 5.0, flyAsh: 5.0 },
    'PCC NON FA': { clinker: 74.0, gypsum: 4.0, limestone: 17.0, trass: 5.0, flyAsh: 0.0 },
    'PCC WS': { clinker: 70.0, gypsum: 4.0, limestone: 16.0, trass: 10.0, flyAsh: 0.0 },
    'SPK': { clinker: 82.0, gypsum: 4.0, limestone: 9.0, trass: 5.0, flyAsh: 0.0 },
    'OPC G': { clinker: 91.0, gypsum: 4.0, limestone: 5.0, trass: 0.0, flyAsh: 0.0 },
    'OPC P': { clinker: 92.0, gypsum: 4.0, limestone: 4.0, trass: 0.0, flyAsh: 0.0 },
  },
};

// Unified Incoming Materials matching Point 4 of instructions
export const DEFAULT_UNIFIED_INCOMING: UnifiedIncomingMaterial[] = [
  {
    id: 'inc_trass',
    name: 'Incoming Trass',
    enabledParams: ['valuePercent', 'statusText'],
    params: { valuePercent: null, statusText: 'on process' }
  },
  {
    id: 'inc_limestone',
    name: 'Incoming Limestone',
    enabledParams: ['valuePercent', 'statusText'],
    params: { valuePercent: null, statusText: 'on process' }
  },
  {
    id: 'inc_gyp_anh',
    name: 'Incoming Gypsum Anhidrat',
    enabledParams: ['valuePercent'],
    params: { valuePercent: 3.82 }
  },
  {
    id: 'inc_gyp_nat',
    name: 'Incoming Gypsum Natural',
    enabledParams: ['valuePercent'],
    params: { valuePercent: 4.15 }
  },
  {
    id: 'inc_bof_slag',
    name: 'Incoming BOF Slag',
    enabledParams: ['valuePercent'],
    params: { valuePercent: 1.18 }
  },
  {
    id: 'inc_wet_ash',
    name: 'Incoming Wet Ash',
    enabledParams: ['valuePercent'],
    params: { valuePercent: 24.3 }
  },
  {
    id: 'inc_clinker',
    name: 'Incoming Clinker',
    enabledParams: ['valuePercent'],
    params: { valuePercent: 0.12 }
  },
  {
    id: 'inc_batu_bara',
    name: 'Incoming Batu Bara',
    enabledParams: ['valuePercent'],
    params: { valuePercent: 18.5 }
  },
  {
    id: 'inc_bbfs_krt',
    name: 'Incoming BBFS KRT',
    enabledParams: ['blaine', 'r45', 'h2o'],
    params: { blaine: 4250, r45: 7.8, h2o: 0.18 }
  },
  {
    id: 'inc_fa_asc',
    name: 'Incoming Fly Ash ASC',
    enabledParams: ['blaine', 'r45', 'h2o'],
    params: { blaine: 3340, r45: 13.5, h2o: 0.32 }
  },
  {
    id: 'inc_fa_ikpp',
    name: 'Incoming Fly Ash IKPP',
    enabledParams: ['blaine', 'r45', 'h2o'],
    params: { blaine: 3510, r45: 11.9, h2o: 0.25 }
  },
  {
    id: 'inc_clinker_bayah',
    name: 'Incoming Clinker Bayah',
    enabledParams: ['c3s', 'fcao', 'c3a', 'h2o'],
    params: { c3s: 59.2, fcao: 1.08, c3a: 8.42, h2o: 0.14 }
  },
];

export const DEFAULT_CLINKER_WF: ClinkerWfData = {
  c3s: 58.7,
  fcao: 1.15,
  c3a: 8.55,
  h2o: 0.12,
};

export const DEFAULT_MOISTURE_WF: MoistureRawMaterialWf = {
  gypsum: 4.25,
  limestone: 1.85,
  trass: 4.80,
  bbKonsumsi: 18.20,
};

export const DEFAULT_CP_SHIFT_SILO: CpShiftSilo = {
  siloName: 'FLEXIPLUS SILO 4+6',
  blaine: 3860,
  r45: 11.8,
  h2o: 0.16,
  so3: 2.18,
};

/**
 * Creates initial mill data for either TM or VRM
 */
function createInitialMillData(
  millType: 'Tube Mill (TM)' | 'Vertical Roller Mill (VRM)',
  hours: string[],
  product: ProductType,
  siloName: string,
  isRunning: boolean = true
): MillSessionData {
  const isTM = millType === 'Tube Mill (TM)';
  const millCode = isTM ? 'TM' : 'VRM';
  const millNumber = isTM ? 1 : 2;
  const targetStandard = DEFAULT_MASTER_TARGETS[millType][product];

  const wetCalc = calculateWetBase({
    clinker: { dry: targetStandard.clinker, h2o: 0.12 },
    gypsum: { dry: targetStandard.gypsum, h2o: 4.25 },
    limestone: { dry: targetStandard.limestone, h2o: 1.85 },
    trass: { dry: targetStandard.trass, h2o: 4.80 },
    flyAsh: { dry: targetStandard.flyAsh, h2o: 0.30 },
  });

  const propId = `prop_${millCode.toLowerCase()}_init`;
  const initialProp = {
    id: propId,
    versionNumber: 1,
    label: `Proporsi 1 (${hours[0]} - ${hours[hours.length - 1]})`,
    appliedAtHour: hours[0],
    endAtHour: hours[hours.length - 1],
    millType,
    productType: product,
    siloName,
    admixtureName: 'CGA Sika',
    admixturePpm: 400,
    materials: {
      clinker: wetCalc.clinker,
      gypsum: wetCalc.gypsum,
      limestone: wetCalc.limestone,
      trass: wetCalc.trass,
      flyAsh: wetCalc.flyAsh,
    },
    dryTotal: wetCalc.dryTotal,
    wetTotal: wetCalc.wetTotal,
    isSessionOverride: false,
    savedAt: new Date().toISOString(),
  };

  const propSummary = `${wetCalc.clinker.wet}% Clk | ${wetCalc.gypsum.wet}% Gyp | ${wetCalc.limestone.wet}% Lst | ${wetCalc.trass.wet}% Trass | ${wetCalc.flyAsh.wet}% FA`;

  const hourlyRows = hours.map((hour, idx) => {
    const isFilled = idx <= 5;
    // Slight variance between TM and VRM for realistic plant simulation
    const baseBlaine = isTM 
      ? 3810 + (idx * 12) 
      : 3880 + (idx * 15);
    const baseR45 = isTM 
      ? 12.8 - (idx * 0.12) 
      : 11.6 - (idx * 0.15);

    return {
      hour,
      blaine: isFilled ? baseBlaine : null,
      residuR45: isFilled ? Number(baseR45.toFixed(2)) : null,
      moistureH2O: (isFilled && idx % 2 === 0) ? Number((0.16 + (idx * 0.01)).toFixed(2)) : null,
      so3: (isFilled && idx % 4 === 0) ? Number((2.10 + (idx * 0.02)).toFixed(2)) : null,
      freelimeFCaO: (isFilled && (idx === 0 || idx === 8)) ? 1.05 : null,
      proporsiVersionId: propId,
      proporsiDisplay: propSummary,
      admixtureDisplay: 'CGA Sika 400 PPM',
      notes: idx === 0 ? `Start ${millCode} running steady` : undefined,
    };
  });

  return {
    millType,
    millCode,
    millNumber,
    isRunning,
    productType: product,
    siloName,
    admixtureName: 'CGA Sika',
    admixturePpm: 400,
    hourlyRows,
    proporsiHistory: [initialProp],
  };
}

/**
 * Creates a fresh shift session with realistic initial dual-mill shift data
 */
export function createInitialShiftSession(
  shiftName: 'SHIFT 1' | 'SHIFT 2' | 'SHIFT 3' | 'AM 1' | 'PM 1' | 'AM 2' | 'PM 2' = 'SHIFT 2',
  date: string = '2026-10-19'
): ShiftSession {
  const shiftDef = SHIFT_DEFINITIONS[shiftName];

  // TM is Mill 1 (e.g. PCC NON FA, Silo 5)
  const tmData = createInitialMillData('Tube Mill (TM)', shiftDef.hours, 'PCC NON FA', 'SILO 5', true);
  
  // VRM is Mill 2 (e.g. PCC Plus FA, Silo 4)
  const vrmData = createInitialMillData('Vertical Roller Mill (VRM)', shiftDef.hours, 'PCC Plus FA', 'SILO 4', true);

  return {
    id: `shift_${shiftName.replace(/\s+/g, '_')}_${date}`,
    date,
    shiftName,
    shiftHours: shiftDef.timeRange,
    analystName: 'Ahmad Fauzi (QC Analyst)',
    supervisorName: 'Bambang Sudirgo (QC Leader)',
    tm: tmData,
    vrm: vrmData,
    clinkerWf: { ...DEFAULT_CLINKER_WF },
    moistureWf: { ...DEFAULT_MOISTURE_WF },
    cpShiftSilo: { ...DEFAULT_CP_SHIFT_SILO },
    incomingMaterials: JSON.parse(JSON.stringify(DEFAULT_UNIFIED_INCOMING)),
    aiInsight: 'Analisa Dual-Mill Shift: Operasi TM (Mill 1) dan VRM (Mill 2) berjalan harmonis dengan rata-rata Blaine terkontrol (TM: 3840 cm²/gr, VRM: 3910 cm²/gr). Residu R45 kedua mill stabil di bawah batas spesifikasi. Penyerapan SO3 dari gipsum konsisten pada 2.12% - 2.18% tanpa kendala build-up di sirkuit penggilingan.',
    aiInsightTimestamp: '2026-10-19T10:15:00.000Z',
  };
}

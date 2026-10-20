import { 
  MasterTargetDryMap, 
  ShiftSession, 
  UnifiedIncomingMaterial, 
  ClinkerWfData, 
  MoistureRawMaterialWf, 
  CpShiftSilo, 
  ProductType, 
  MillSessionData,
  UserAccount,
  ProductQualitySpec,
  CgaMasterSetting,
  CpProductSample
} from '../types/qc';
import { SHIFT_DEFINITIONS, calculateWetBase } from '../utils/qcCalculations';

export const DEFAULT_USERS: UserAccount[] = [
  { id: 'usr_si', role: 'supervisor', name: 'SI (ADMIN)', pin: '123456', updatedAt: '2026-10-19T00:00:00.000Z' },
  { id: 'usr_rifai', role: 'analyst', name: 'AHMAD RIFAI', pin: '456789', updatedAt: '2026-10-19T00:00:00.000Z' },
  { id: 'usr_ines', role: 'analyst', name: 'INES NARSUL', pin: '456789', updatedAt: '2026-10-19T00:00:00.000Z' },
  { id: 'usr_anugrah', role: 'analyst', name: 'ANUGRAH MAHESA', pin: '456789', updatedAt: '2026-10-19T00:00:00.000Z' },
  { id: 'usr_sadrani', role: 'analyst', name: 'SADRANI', pin: '456789', updatedAt: '2026-10-19T00:00:00.000Z' },
];

export const DEFAULT_PRODUCT_LIST: string[] = [
  'PCC Plus FA',
  'PCC NON FA',
  'PCC WS',
  'SPK',
  'OPC G',
  'OPC P',
];

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

export const DEFAULT_QUALITY_SPECS: ProductQualitySpec[] = [
  {
    productType: 'PCC Plus FA',
    blaine: { min: 3800, max: 4200, std: 3900 },
    residuR45: { min: 8.0, max: 14.0, std: 11.0 },
    moistureH2O: { min: 0.05, max: 0.30, std: 0.15 },
    so3: { min: 1.90, max: 2.30, std: 2.10 },
    freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 },
  },
  {
    productType: 'PCC NON FA',
    blaine: { min: 3700, max: 4100, std: 3850 },
    residuR45: { min: 9.0, max: 15.0, std: 12.0 },
    moistureH2O: { min: 0.05, max: 0.30, std: 0.16 },
    so3: { min: 1.80, max: 2.20, std: 2.05 },
    freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 },
  },
  {
    productType: 'PCC WS',
    blaine: { min: 3900, max: 4300, std: 4000 },
    residuR45: { min: 7.0, max: 13.0, std: 10.5 },
    moistureH2O: { min: 0.05, max: 0.30, std: 0.15 },
    so3: { min: 1.90, max: 2.30, std: 2.10 },
    freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 },
  },
  {
    productType: 'SPK',
    blaine: { min: 3300, max: 3700, std: 3500 },
    residuR45: { min: 10.0, max: 16.0, std: 13.0 },
    moistureH2O: { min: 0.05, max: 0.25, std: 0.12 },
    so3: { min: 1.80, max: 2.20, std: 2.00 },
    freelimeFCaO: { min: 0.50, max: 1.50, std: 1.10 },
  },
  {
    productType: 'OPC G',
    blaine: { min: 3400, max: 3800, std: 3600 },
    residuR45: { min: 8.0, max: 14.0, std: 11.0 },
    moistureH2O: { min: 0.02, max: 0.20, std: 0.10 },
    so3: { min: 2.00, max: 2.50, std: 2.25 },
    freelimeFCaO: { min: 0.50, max: 1.30, std: 0.90 },
  },
  {
    productType: 'OPC P',
    blaine: { min: 3600, max: 4000, std: 3800 },
    residuR45: { min: 6.0, max: 12.0, std: 9.0 },
    moistureH2O: { min: 0.02, max: 0.20, std: 0.10 },
    so3: { min: 2.10, max: 2.60, std: 2.35 },
    freelimeFCaO: { min: 0.50, max: 1.30, std: 0.90 },
  },
];

export const DEFAULT_CGA_SETTINGS: CgaMasterSetting[] = [
  { id: 'cga_1', productType: 'PCC Plus FA', cgaBrand: 'SIKA', dosagePpm: 400, notes: 'Optimasi kehalusan & strength' },
  { id: 'cga_2', productType: 'PCC NON FA', cgaBrand: 'CONCH', dosagePpm: 350, notes: 'Pengendali pack set' },
  { id: 'cga_3', productType: 'PCC WS', cgaBrand: 'GCP', dosagePpm: 450, notes: 'Peningkat retensi air' },
  { id: 'cga_4', productType: 'SPK', cgaBrand: 'SIKA', dosagePpm: 300, notes: 'Kuat tekan awal' },
  { id: 'cga_5', productType: 'OPC G', cgaBrand: 'CONCH', dosagePpm: 400, notes: 'Workability semen cor' },
  { id: 'cga_6', productType: 'OPC P', cgaBrand: 'GCP', dosagePpm: 400, notes: 'Kehalusan ekstra' },
];

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
    params: { blaine: null, r45: null, h2o: null }
  },
  {
    id: 'inc_fa_asc',
    name: 'Incoming Fly Ash ASC',
    enabledParams: ['blaine', 'r45', 'h2o'],
    params: { blaine: null, r45: null, h2o: null }
  },
  {
    id: 'inc_fa_ikpp',
    name: 'Incoming Fly Ash IKPP',
    enabledParams: ['blaine', 'r45', 'h2o'],
    params: { blaine: null, r45: null, h2o: null }
  },
  {
    id: 'inc_clinker_bayah',
    name: 'Incoming Clinker Bayah',
    enabledParams: ['c3s', 'fcao', 'c3a', 'h2o'],
    params: { c3s: null, fcao: null, c3a: null, h2o: null }
  },
];

export const DEFAULT_CLINKER_WF: ClinkerWfData = {
  c3s: null,
  fcao: null,
  c3a: null,
  h2o: null,
};

export const DEFAULT_MOISTURE_WF: MoistureRawMaterialWf = {
  gypsum: null,
  limestone: null,
  trass: null,
  bbKonsumsi: null,
};

export const DEFAULT_CP_SHIFT_SILO: CpShiftSilo = {
  siloName: 'SILO 2',
  blaine: null,
  r45: null,
  h2o: null,
  so3: null,
};

export const DEFAULT_CP_PRODUCTS: [CpProductSample, CpProductSample] = [
  {
    id: 'cp_1',
    label: 'CP Produk 1',
    productType: 'PCC Plus FA',
    siloName: 'SILO 4',
    blaine: null,
    r45: null,
    h2o: null,
    so3: null,
  },
  {
    id: 'cp_2',
    label: 'CP Produk 2',
    productType: 'PCC NON FA',
    siloName: 'SILO 2',
    blaine: null,
    r45: null,
    h2o: null,
    so3: null,
  },
];

/**
 * Creates initial mill data for either TM or VRM
 * If isEmpty is true, rows start clean without prior shift numbers
 */
export function createInitialMillData(
  millType: 'Tube Mill (TM)' | 'Vertical Roller Mill (VRM)',
  hours: string[],
  product: ProductType,
  siloName: string,
  isRunning: boolean = true,
  isEmpty: boolean = true
): MillSessionData {
  const isTM = millType === 'Tube Mill (TM)';
  const millCode = isTM ? 'TM' : 'VRM';
  const millNumber = isTM ? 1 : 2;
  const targetStandard = DEFAULT_MASTER_TARGETS[millType]?.[product] || {
    clinker: 72.0, gypsum: 4.0, limestone: 14.0, trass: 5.0, flyAsh: 5.0
  };

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
    tphFeeding: 100.0,
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

  const propSummary = `${wetCalc.clinker.dry}% Clk | ${wetCalc.gypsum.dry}% Gyp | ${wetCalc.limestone.dry}% Lst | ${wetCalc.trass.dry}% Trass | ${wetCalc.flyAsh.dry}% FA`;

  const hourlyRows = hours.map((hour) => {
    return {
      hour,
      blaine: null,
      residuR45: null,
      moistureH2O: null,
      so3: null,
      freelimeFCaO: null,
      tph: null,
      proporsiVersionId: propId,
      proporsiDisplay: propSummary,
      admixtureDisplay: 'CGA Sika 400 PPM',
      notes: undefined,
    };
  });

  return {
    millType,
    millCode,
    millNumber,
    isRunning,
    productType: product,
    siloName,
    tphFeeding: 100.0,
    admixtureName: 'CGA Sika',
    admixturePpm: 400,
    hourlyRows,
    proporsiHistory: [initialProp],
  };
}

/**
 * Creates a fresh shift session (Clean slate, zero residuals)
 */
export function createInitialShiftSession(
  shiftName: 'SHIFT 1' | 'SHIFT 2' | 'SHIFT 3' | 'AM 1' | 'PM 1' | 'AM 2' | 'PM 2' = 'SHIFT 2',
  date: string = '2026-10-19',
  analystName: string = 'AHMAD RIFAI'
): ShiftSession {
  const shiftDef = SHIFT_DEFINITIONS[shiftName] || SHIFT_DEFINITIONS['SHIFT 2'];

  // TM is Mill 1 (e.g. PCC NON FA, SILO 5)
  const tmData = createInitialMillData('Tube Mill (TM)', shiftDef.hours, 'PCC NON FA', 'SILO 5', true, true);
  
  // VRM is Mill 2 (e.g. PCC Plus FA, SILO 4)
  const vrmData = createInitialMillData('Vertical Roller Mill (VRM)', shiftDef.hours, 'PCC Plus FA', 'SILO 4', true, true);

  return {
    id: `shift_${shiftName.replace(/\s+/g, '_')}_${date}`,
    date,
    shiftName,
    shiftHours: shiftDef.timeRange,
    analystName,
    supervisorName: 'SI (ADMIN)',
    tm: tmData,
    vrm: vrmData,
    clinkerWf: { ...DEFAULT_CLINKER_WF },
    moistureWf: { ...DEFAULT_MOISTURE_WF },
    cpShiftSilo: { ...DEFAULT_CP_SHIFT_SILO },
    cpProducts: JSON.parse(JSON.stringify(DEFAULT_CP_PRODUCTS)),
    incomingMaterials: JSON.parse(JSON.stringify(DEFAULT_UNIFIED_INCOMING)),
    aiInsight: undefined,
    aiInsightTimestamp: undefined,
  };
}

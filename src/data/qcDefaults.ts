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
import { SHIFT_DEFINITIONS } from '../utils/qcCalculations';

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
  'SPK',
  'OPC G',
  'PCC WS',
  'OPC P',
];

export const DEFAULT_MASTER_TARGETS: MasterTargetDryMap = {
  'Tube Mill (TM)': {
    'PCC Plus FA': { clinker: 57.8, gypsum: 3.4, limestone: 18.8, trass: 15.0, flyAsh: 5.0 },
    'PCC NON FA': { clinker: 57.8, gypsum: 3.4, limestone: 18.8, trass: 20.0, flyAsh: 0.0 },
    'SPK': { clinker: 55.0, gypsum: 3.4, limestone: 15.8, trass: 15.8, flyAsh: 10.0 },
    'OPC G': { clinker: 88.0, gypsum: 3.8, limestone: 8.2, trass: 0.0, flyAsh: 0.0 },
    'PCC WS': { clinker: 58.0, gypsum: 3.4, limestone: 28.6, trass: 10.0, flyAsh: 0.0 },
    'OPC P': { clinker: 90.0, gypsum: 3.8, limestone: 6.2, trass: 0.0, flyAsh: 0.0 },
  },
  'Vertical Roller Mill (VRM)': {
    'PCC Plus FA': { clinker: 57.8, gypsum: 2.8, limestone: 8.0, trass: 26.4, flyAsh: 5.0 },
    'PCC NON FA': { clinker: 57.8, gypsum: 2.8, limestone: 8.0, trass: 31.4, flyAsh: 0.0 },
    'SPK': { clinker: 55.0, gypsum: 3.4, limestone: 15.8, trass: 15.8, flyAsh: 10.0 },
    'OPC G': { clinker: 88.0, gypsum: 3.8, limestone: 8.2, trass: 0.0, flyAsh: 0.0 },
    'PCC WS': { clinker: 58.0, gypsum: 3.4, limestone: 28.6, trass: 10.0, flyAsh: 0.0 },
    'OPC P': { clinker: 90.0, gypsum: 3.8, limestone: 6.2, trass: 0.0, flyAsh: 0.0 },
  },
};

export const DEFAULT_QUALITY_SPECS: ProductQualitySpec[] = [
  // TM Specs
  { id: 'qs_tm_1', millType: 'TM', productType: 'PCC Plus FA', blaine: { min: 4700, max: 4900, std: 4800 }, residuR45: { min: 0, max: 5.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.30, std: 0.15 }, so3: { min: 1.60, max: 1.80, std: 1.70 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 } },
  { id: 'qs_tm_2', millType: 'TM', productType: 'PCC NON FA', blaine: { min: 4700, max: 4900, std: 4800 }, residuR45: { min: 0, max: 5.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.30, std: 0.16 }, so3: { min: 1.60, max: 1.80, std: 1.70 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 } },
  { id: 'qs_tm_3', millType: 'TM', productType: 'SPK', blaine: { min: 5400, max: 5600, std: 5500 }, residuR45: { min: 0, max: 5.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.25, std: 0.12 }, so3: { min: 1.60, max: 1.80, std: 1.70 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.10 } },
  { id: 'qs_tm_4', millType: 'TM', productType: 'OPC G', blaine: { min: 3700, max: 3900, std: 3800 }, residuR45: { min: 0, max: 3.5, std: 0 }, moistureH2O: { min: 0.02, max: 0.20, std: 0.10 }, so3: { min: 2.00, max: 2.20, std: 2.10 }, freelimeFCaO: { min: 0.50, max: 1.30, std: 0.90 } },
  { id: 'qs_tm_5', millType: 'TM', productType: 'PCC WS', blaine: { min: 4700, max: 4900, std: 4800 }, residuR45: { min: 0, max: 5.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.30, std: 0.15 }, so3: { min: 1.60, max: 1.80, std: 1.70 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 } },
  { id: 'qs_tm_6', millType: 'TM', productType: 'OPC P', blaine: { min: 3700, max: 3900, std: 3800 }, residuR45: { min: 0, max: 3.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.30, std: 0.15 }, so3: { min: 2.00, max: 2.20, std: 2.10 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 } },

  // VRM Specs
  { id: 'qs_vrm_1', millType: 'VRM', productType: 'PCC Plus FA', blaine: { min: 4700, max: 4900, std: 4800 }, residuR45: { min: 0, max: 5.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.30, std: 0.15 }, so3: { min: 1.60, max: 1.80, std: 1.70 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 } },
  { id: 'qs_vrm_2', millType: 'VRM', productType: 'PCC NON FA', blaine: { min: 4700, max: 4900, std: 4800 }, residuR45: { min: 0, max: 5.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.30, std: 0.16 }, so3: { min: 1.60, max: 1.80, std: 1.70 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 } },
  { id: 'qs_vrm_3', millType: 'VRM', productType: 'SPK', blaine: { min: 5400, max: 5600, std: 5500 }, residuR45: { min: 0, max: 5.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.25, std: 0.12 }, so3: { min: 1.60, max: 1.80, std: 1.70 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.10 } },
  { id: 'qs_vrm_4', millType: 'VRM', productType: 'OPC G', blaine: { min: 3700, max: 3900, std: 3800 }, residuR45: { min: 0, max: 3.5, std: 0 }, moistureH2O: { min: 0.02, max: 0.20, std: 0.10 }, so3: { min: 2.00, max: 2.20, std: 2.10 }, freelimeFCaO: { min: 0.50, max: 1.30, std: 0.90 } },
  { id: 'qs_vrm_5', millType: 'VRM', productType: 'PCC WS', blaine: { min: 4700, max: 4900, std: 4800 }, residuR45: { min: 0, max: 5.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.30, std: 0.15 }, so3: { min: 1.60, max: 1.80, std: 1.70 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 } },
  { id: 'qs_vrm_6', millType: 'VRM', productType: 'OPC P', blaine: { min: 3700, max: 3900, std: 3800 }, residuR45: { min: 0, max: 3.0, std: 0 }, moistureH2O: { min: 0.05, max: 0.30, std: 0.15 }, so3: { min: 2.00, max: 2.20, std: 2.10 }, freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 } },
];

export const DEFAULT_CGA_SETTINGS: CgaMasterSetting[] = [
  // TM CGA Settings
  { id: 'cga_tm_1', millType: 'TM', productType: 'PCC Plus FA', cgaBrand: 'SIKA', dosagePpm: 400, notes: 'Optimasi kehalusan & strength' },
  { id: 'cga_tm_2', millType: 'TM', productType: 'PCC NON FA', cgaBrand: 'CONCH', dosagePpm: 350, notes: 'Pengendali pack set' },
  { id: 'cga_tm_3', millType: 'TM', productType: 'PCC WS', cgaBrand: 'GCP', dosagePpm: 450, notes: 'Peningkat retensi air' },
  { id: 'cga_tm_4', millType: 'TM', productType: 'SPK', cgaBrand: 'SIKA', dosagePpm: 300, notes: 'Kuat tekan awal' },
  { id: 'cga_tm_5', millType: 'TM', productType: 'OPC G', cgaBrand: 'CONCH', dosagePpm: 400, notes: 'Workability semen cor' },
  { id: 'cga_tm_6', millType: 'TM', productType: 'OPC P', cgaBrand: 'GCP', dosagePpm: 400, notes: 'Kehalusan ekstra' },

  // VRM CGA Settings
  { id: 'cga_vrm_1', millType: 'VRM', productType: 'PCC Plus FA', cgaBrand: 'SIKA', dosagePpm: 400, notes: 'Optimasi kehalusan & strength' },
  { id: 'cga_vrm_2', millType: 'VRM', productType: 'PCC NON FA', cgaBrand: 'CONCH', dosagePpm: 350, notes: 'Pengendali pack set' },
  { id: 'cga_vrm_3', millType: 'VRM', productType: 'PCC WS', cgaBrand: 'GCP', dosagePpm: 450, notes: 'Peningkat retensi air' },
  { id: 'cga_vrm_4', millType: 'VRM', productType: 'SPK', cgaBrand: 'SIKA', dosagePpm: 300, notes: 'Kuat tekan awal' },
  { id: 'cga_vrm_5', millType: 'VRM', productType: 'OPC G', cgaBrand: 'CONCH', dosagePpm: 400, notes: 'Workability semen cor' },
  { id: 'cga_vrm_6', millType: 'VRM', productType: 'OPC P', cgaBrand: 'GCP', dosagePpm: 400, notes: 'Kehalusan ekstra' },
];

export const DEFAULT_UNIFIED_INCOMING: UnifiedIncomingMaterial[] = [
  {
    id: 'inc_trass',
    name: 'Incoming Trass',
    enabledParams: ['h2o', 'statusText'],
    params: { h2o: null, statusText: '' }
  },
  {
    id: 'inc_limestone',
    name: 'Incoming Limestone',
    enabledParams: ['h2o', 'statusText'],
    params: { h2o: null, statusText: '' }
  },
  {
    id: 'inc_gyp_anh',
    name: 'Incoming Gypsum Anhidrat',
    enabledParams: ['h2o'],
    params: { h2o: null }
  },
  {
    id: 'inc_gyp_nat',
    name: 'Incoming Gypsum Natural',
    enabledParams: ['h2o'],
    params: { h2o: null }
  },
  {
    id: 'inc_bof_slag',
    name: 'Incoming BOF Slag',
    enabledParams: ['h2o'],
    params: { h2o: null }
  },
  {
    id: 'inc_wet_ash',
    name: 'Incoming Wet Ash',
    enabledParams: ['h2o'],
    params: { h2o: null }
  },
  {
    id: 'inc_clinker',
    name: 'Incoming Clinker',
    enabledParams: ['h2o'],
    params: { h2o: null }
  },
  {
    id: 'inc_batu_bara',
    name: 'Incoming Batu Bara',
    enabledParams: ['h2o'],
    params: { h2o: null }
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
 * Shift baru wajib 100% BERSIH tanpa proporsi aktif fiktif/dummy.
 */
export function createInitialMillData(
  millType: 'Tube Mill (TM)' | 'Vertical Roller Mill (VRM)',
  hours: string[],
  _product: ProductType = '',
  _siloName: string = '',
  isRunning: boolean = false,
  _isEmpty: boolean = true
): MillSessionData {
  const isTM = millType === 'Tube Mill (TM)';
  const millCode = isTM ? 'TM' : 'VRM';
  const millNumber = isTM ? 1 : 2;

  const hourlyRows = hours.map((hour) => ({
    hour,
    productType: undefined,
    blaine: null,
    residuR45: null,
    moistureH2O: null,
    so3: null,
    freelimeFCaO: null,
    tph: null,
    proporsiVersionId: undefined,
    proporsiDisplay: '',
    admixtureDisplay: '',
    notes: undefined,
  }));

  return {
    millType,
    millCode,
    millNumber,
    isRunning,
    productType: '',
    siloName: '',
    tphFeeding: 0,
    admixtureName: '',
    admixturePpm: 0,
    hourlyRows,
    proporsiHistory: [],
  };
}

/**
 * Membersihkan proporsi dummy/fiktif (prop_tm_init / prop_vrm_init) dari sesi yang tersimpan
 * sehingga proporsi hanya dianggap aktif apabila analis benar-benar menekan Simpan & Aktifkan.
 */
export function sanitizeMillSessionData(mill: MillSessionData): MillSessionData {
  if (!mill) return mill;
  const validHistory = (mill.proporsiHistory || []).filter(
    (p) => p && p.id && !p.id.startsWith('prop_tm_init') && !p.id.startsWith('prop_vrm_init')
  );

  if (validHistory.length === 0) {
    const cleanedRows = (mill.hourlyRows || []).map((r) => ({
      ...r,
      productType: undefined,
      proporsiVersionId: undefined,
      proporsiDisplay: '',
      admixtureDisplay: '',
    }));
    const hasHourlyData = cleanedRows.some(
      (r) =>
        r.blaine !== null ||
        r.residuR45 !== null ||
        r.moistureH2O !== null ||
        r.so3 !== null ||
        r.freelimeFCaO !== null ||
        r.tph !== null
    );
    return {
      ...mill,
      isRunning: hasHourlyData,
      productType: '',
      siloName: '',
      tphFeeding: 0,
      admixtureName: '',
      admixturePpm: 0,
      proporsiHistory: [],
      hourlyRows: cleanedRows,
    };
  }

  const latestProp = validHistory[validHistory.length - 1];
  const syncedRows = (mill.hourlyRows || []).map((r) => {
    if (r.proporsiVersionId) {
      const matched = validHistory.find((p) => p.id === r.proporsiVersionId);
      if (matched) {
        return {
          ...r,
          productType: r.productType || matched.productType,
        };
      }
    }
    return r;
  });

  return {
    ...mill,
    productType: latestProp.productType || mill.productType,
    siloName: latestProp.siloName || mill.siloName,
    tphFeeding: latestProp.tphFeeding || mill.tphFeeding || 100,
    admixtureName: latestProp.admixtureName || mill.admixtureName,
    admixturePpm: latestProp.admixturePpm ?? mill.admixturePpm,
    proporsiHistory: validHistory,
    hourlyRows: syncedRows,
  };
}

export function sanitizeShiftSession(session: ShiftSession): ShiftSession {
  if (!session) return session;
  return {
    ...session,
    tm: sanitizeMillSessionData(session.tm),
    vrm: sanitizeMillSessionData(session.vrm),
  };
}

/**
 * Creates a fresh shift session (Clean slate, zero residuals, no active proportions)
 */
export function createInitialShiftSession(
  shiftName: 'SHIFT 1' | 'SHIFT 2' | 'SHIFT 3' | 'AM 1' | 'PM 1' | 'AM 2' | 'PM 2' = 'SHIFT 2',
  date: string = '2026-10-19',
  analystName: string = 'AHMAD RIFAI'
): ShiftSession {
  const shiftDef = SHIFT_DEFINITIONS[shiftName] || SHIFT_DEFINITIONS['SHIFT 2'];

  const tmData = createInitialMillData('Tube Mill (TM)', shiftDef.hours, '', '', false, true);
  const vrmData = createInitialMillData('Vertical Roller Mill (VRM)', shiftDef.hours, '', '', false, true);

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

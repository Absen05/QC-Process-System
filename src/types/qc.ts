export type UserRole = 'analyst' | 'supervisor';

export type ShiftName = 
  | 'SHIFT 1' 
  | 'SHIFT 2' 
  | 'SHIFT 3' 
  | 'AM 1' 
  | 'PM 1' 
  | 'AM 2' 
  | 'PM 2';

export interface ShiftDefinition {
  name: ShiftName;
  label: string;
  category: 'Normal (8 Jam)' | 'Lembur V1 (12 Jam)' | 'Lembur V2 (10 Jam)';
  timeRange: string;
  hours: string[];
}

export type MillType = 'Tube Mill (TM)' | 'Vertical Roller Mill (VRM)';

export type ProductType = 
  | 'PCC Plus FA' 
  | 'PCC NON FA' 
  | 'PCC WS' 
  | 'SPK' 
  | 'OPC G' 
  | 'OPC P';

export interface MaterialPropItem {
  name: 'Clinker' | 'Gypsum' | 'Limestone' | 'Trass' | 'Fly Ash';
  shortName: 'Clk' | 'Gyp' | 'Lst' | 'Trass' | 'Fly Ash';
  dry: number;        // Target Dry % (Supervisor/Override)
  h2o: number;        // Moisture H2O %
  wetFactor: number;  // Dry / (1 - H2O/100)
  wet: number;        // Proportion % (calculated, sum to 100.0%)
}

export interface ProporsiConfig {
  id: string;
  versionNumber: number;
  label: string;             // e.g. "Proporsi 1 (08:00 - 11:00)"
  appliedAtHour: string;     // e.g. "08:00"
  endAtHour?: string;        // e.g. "11:00" or empty if currently active
  millType: MillType;
  productType: ProductType;
  siloName: string;
  admixtureName: string;     // e.g. "CGA Sika"
  admixturePpm: number;      // e.g. 400
  materials: {
    clinker: MaterialPropItem;
    gypsum: MaterialPropItem;
    limestone: MaterialPropItem;
    trass: MaterialPropItem;
    flyAsh: MaterialPropItem;
  };
  dryTotal: number;          // 100.0%
  wetTotal: number;          // 100.0%
  isSessionOverride: boolean;
  notes?: string;
  savedAt: string;
}

export interface HourlyAnalysisRow {
  hour: string; // "08:00", "09:00", etc.
  blaine: number | null; // cm2/gr
  residuR45: number | null; // %
  moistureH2O: number | null; // % (every 2 hr)
  so3: number | null; // % via XRF (every 4 hr)
  freelimeFCaO: number | null; // % (every 8 hr)
  proporsiVersionId?: string; // links to applied proporsi
  proporsiDisplay?: string; // e.g. "72% Clk | 4% Gyp | ..."
  admixtureDisplay?: string; // e.g. "CGA Sika 400 PPM"
  notes?: string;
}

export interface ClinkerWfData {
  c3s: number | null;
  fcao: number | null;
  c3a: number | null;
  h2o: number | null;
}

export interface MoistureRawMaterialWf {
  gypsum: number | null;
  limestone: number | null;
  trass: number | null;
  bbKonsumsi: number | null;
}

export interface CpShiftSilo {
  siloName: string;
  blaine: number | null;
  r45: number | null;
  h2o: number | null;
  so3: number | null;
}

// Independent Mill Session State for TM & VRM running concurrently
export interface MillSessionData {
  millType: MillType;
  millCode: 'TM' | 'VRM';
  millNumber: 1 | 2;
  isRunning: boolean;
  productType: ProductType;
  siloName: string;
  admixtureName: string;
  admixturePpm: number;
  hourlyRows: HourlyAnalysisRow[];
  proporsiHistory: ProporsiConfig[];
}

export type IncomingParamKey = 
  | 'blaine'
  | 'r45'
  | 'h2o'
  | 'so3'
  | 'fcao'
  | 'c3s'
  | 'c3a'
  | 'valuePercent'
  | 'statusText';

export interface UnifiedIncomingMaterial {
  id: string;
  name: string; // Must start with "Incoming "
  enabledParams: IncomingParamKey[];
  params: {
    blaine?: number | null;
    r45?: number | null;
    h2o?: number | null;
    so3?: number | null;
    fcao?: number | null;
    c3s?: number | null;
    c3a?: number | null;
    valuePercent?: number | null;
    statusText?: string;
  };
  isCustom?: boolean;
}

export interface ShiftSession {
  id: string;
  date: string; // ISO format "2026-10-19"
  shiftName: ShiftName;
  shiftHours: string; // "08:00 - 16:00"
  analystName: string;
  supervisorName: string;
  
  // Dual-Mill Data: TM is Mill 1 (first), VRM is Mill 2 (second)
  tm: MillSessionData;
  vrm: MillSessionData;

  // Shared / Plant-wide sections
  clinkerWf: ClinkerWfData;
  moistureWf: MoistureRawMaterialWf;
  cpShiftSilo: CpShiftSilo;

  // Unified Incoming Raw Materials
  incomingMaterials: UnifiedIncomingMaterial[];

  aiInsight?: string;
  aiInsightTimestamp?: string;
}

export type MasterTargetDryMap = Record<
  MillType,
  Record<
    ProductType,
    {
      clinker: number;
      gypsum: number;
      limestone: number;
      trass: number;
      flyAsh: number;
    }
  >
>;

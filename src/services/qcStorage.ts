import { 
  ShiftSession, 
  MasterTargetDryMap, 
  UserRole, 
  ShiftName, 
  ProductType, 
  MillType 
} from '../types/qc';
import { 
  DEFAULT_MASTER_TARGETS, 
  createInitialShiftSession 
} from '../data/qcDefaults';
import { SHIFT_DEFINITIONS, calculateWetBase } from '../utils/qcCalculations';

const STORAGE_KEYS = {
  CURRENT_ROLE: 'qc_cemindo_current_role',
  MASTER_TARGETS: 'qc_cemindo_master_targets',
  ACTIVE_SESSION: 'qc_cemindo_active_session_v2', // v2 for dual-mill architecture
};

export function getStoredRole(): UserRole {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE);
    if (val === 'supervisor' || val === 'analyst') return val;
    return 'analyst';
  } catch {
    return 'analyst';
  }
}

export function saveStoredRole(role: UserRole): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, role);
  } catch (err) {
    console.error('Failed to save role:', err);
  }
}

export function getStoredMasterTargets(): MasterTargetDryMap {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MASTER_TARGETS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load master targets:', err);
  }
  return DEFAULT_MASTER_TARGETS;
}

export function saveStoredMasterTargets(targets: MasterTargetDryMap): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MASTER_TARGETS, JSON.stringify(targets));
  } catch (err) {
    console.error('Failed to save master targets:', err);
  }
}

export function getStoredActiveSession(): ShiftSession {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (data) {
      const parsed = JSON.parse(data);
      // Verify dual-mill structure (tm and vrm)
      if (parsed && parsed.tm && parsed.vrm && parsed.incomingMaterials) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load active session:', err);
  }
  const defaultSession = createInitialShiftSession('SHIFT 2', '2026-10-19');
  saveStoredActiveSession(defaultSession);
  return defaultSession;
}

export function saveStoredActiveSession(session: ShiftSession): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save active session:', err);
  }
}

/**
 * Start a new shift session with dual-mill support
 */
export function startNewShiftSession(
  shiftName: ShiftName,
  date: string,
  analystName: string,
  tmRunning: boolean = true,
  tmProduct: ProductType = 'PCC NON FA',
  tmSilo: string = 'SILO 5',
  vrmRunning: boolean = true,
  vrmProduct: ProductType = 'PCC Plus FA',
  vrmSilo: string = 'SILO 4'
): ShiftSession {
  const baseSession = createInitialShiftSession(shiftName, date);
  
  const newSession: ShiftSession = {
    ...baseSession,
    id: `shift_${shiftName.replace(/\s+/g, '_')}_${date}_${Date.now()}`,
    date,
    shiftName,
    analystName: analystName || 'Analis QC (Shift)',
    tm: {
      ...baseSession.tm,
      isRunning: tmRunning,
      productType: tmProduct,
      siloName: tmSilo,
    },
    vrm: {
      ...baseSession.vrm,
      isRunning: vrmRunning,
      productType: vrmProduct,
      siloName: vrmSilo,
    },
    aiInsight: undefined,
    aiInsightTimestamp: undefined,
  };

  saveStoredActiveSession(newSession);
  return newSession;
}

export function resetFactoryData(): ShiftSession {
  localStorage.removeItem(STORAGE_KEYS.MASTER_TARGETS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  const resetSession = createInitialShiftSession('SHIFT 2', '2026-10-19');
  saveStoredActiveSession(resetSession);
  saveStoredMasterTargets(DEFAULT_MASTER_TARGETS);
  return resetSession;
}

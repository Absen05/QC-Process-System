import { 
  ShiftSession, 
  MasterTargetDryMap, 
  UserRole, 
  ShiftName, 
  ProductType, 
  UserAccount,
  AuthSession,
  ProductQualitySpec,
  CgaMasterSetting
} from '../types/qc';
import { 
  DEFAULT_USERS,
  DEFAULT_PRODUCT_LIST,
  DEFAULT_MASTER_TARGETS, 
  DEFAULT_QUALITY_SPECS,
  DEFAULT_CGA_SETTINGS,
  createInitialShiftSession 
} from '../data/qcDefaults';
import { SHIFT_DEFINITIONS } from '../utils/qcCalculations';

const STORAGE_KEYS = {
  CURRENT_ROLE: 'qc_cemindo_current_role',
  AUTH_SESSION: 'qc_cemindo_auth_session',
  USERS_LIST: 'qc_cemindo_users_list_v2',
  MASTER_TARGETS: 'qc_cemindo_master_targets_v2',
  PRODUCT_LIST: 'qc_cemindo_product_list_v2',
  QUALITY_SPECS: 'qc_cemindo_quality_specs_v2',
  CGA_SETTINGS: 'qc_cemindo_cga_settings_v2',
  ACTIVE_SESSION: 'qc_cemindo_active_session_v3',
  SHIFT_ARCHIVES: 'qc_cemindo_shift_archives_v2',
};

// ==========================================
// User Accounts & Authentication
// ==========================================

export function getStoredUsers(): UserAccount[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load users:', err);
  }
  return DEFAULT_USERS;
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users:', err);
  }
}

export function updateUserPin(userName: string, newPin: string): boolean {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.name.toUpperCase() === userName.toUpperCase());
  if (index === -1) return false;

  users[index] = {
    ...users[index],
    pin: newPin,
    updatedAt: new Date().toISOString(),
  };
  saveStoredUsers(users);

  // If currently logged in user updated their own PIN, sync auth session
  const auth = getStoredAuth();
  if (auth.isLoggedIn && auth.user && auth.user.name.toUpperCase() === userName.toUpperCase()) {
    auth.user.pin = newPin;
    saveStoredAuth(auth);
  }
  return true;
}

export function resetUserPin(userName: string): string {
  const isSI = userName.toUpperCase().includes('SI') || userName.toUpperCase().includes('ADMIN');
  const defaultPin = isSI ? '123456' : '456789';
  updateUserPin(userName, defaultPin);
  return defaultPin;
}

export function getStoredAuth(): AuthSession {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.isLoggedIn === 'boolean') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load auth session:', err);
  }
  return {
    isLoggedIn: false,
    user: null,
    loginDate: new Date().toISOString().slice(0, 10),
    loginShift: 'SHIFT 2',
  };
}

export function saveStoredAuth(auth: AuthSession): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(auth));
  } catch (err) {
    console.error('Failed to save auth session:', err);
  }
}

export function logoutUser(): void {
  saveStoredAuth({
    isLoggedIn: false,
    user: null,
    loginDate: new Date().toISOString().slice(0, 10),
    loginShift: 'SHIFT 2',
  });
}

export function getStoredRole(): UserRole {
  const auth = getStoredAuth();
  if (auth.isLoggedIn && auth.user) {
    return auth.user.role;
  }
  return 'analyst';
}

export function saveStoredRole(role: UserRole): void {
  const auth = getStoredAuth();
  if (auth.user) {
    auth.user.role = role;
    saveStoredAuth(auth);
  }
}

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
  return switchOrStartShift(date, shiftName, analystName, tmRunning, tmProduct, tmSilo, vrmRunning, vrmProduct, vrmSilo);
}

// ==========================================
// Products & Master Targets
// ==========================================

export function getStoredProductList(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCT_LIST);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load product list:', err);
  }
  return DEFAULT_PRODUCT_LIST;
}

export function saveStoredProductList(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCT_LIST, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save product list:', err);
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

export function addNewProductType(
  productName: string,
  tmTarget: { clinker: number; gypsum: number; limestone: number; trass: number; flyAsh: number },
  vrmTarget: { clinker: number; gypsum: number; limestone: number; trass: number; flyAsh: number }
): void {
  const currentList = getStoredProductList();
  if (!currentList.includes(productName)) {
    saveStoredProductList([...currentList, productName]);
  }

  const targets = getStoredMasterTargets();
  targets['Tube Mill (TM)'][productName] = tmTarget;
  targets['Vertical Roller Mill (VRM)'][productName] = vrmTarget;
  saveStoredMasterTargets(targets);

  // Also add default Quality Spec and CGA setting for the new product
  const qualitySpecs = getStoredQualitySpecs();
  if (!qualitySpecs.some(s => s.productType === productName)) {
    qualitySpecs.push({
      productType: productName,
      blaine: { min: 3800, max: 4200, std: 3900 },
      residuR45: { min: 8.0, max: 14.0, std: 11.0 },
      moistureH2O: { min: 0.05, max: 0.30, std: 0.15 },
      so3: { min: 1.90, max: 2.30, std: 2.10 },
      freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 },
    });
    saveStoredQualitySpecs(qualitySpecs);
  }

  const cgaSettings = getStoredCgaSettings();
  if (!cgaSettings.some(c => c.productType === productName)) {
    cgaSettings.push({
      id: `cga_${Date.now()}`,
      productType: productName,
      cgaBrand: 'SIKA',
      dosagePpm: 400,
      notes: 'Standar awal',
    });
    saveStoredCgaSettings(cgaSettings);
  }
}

// ==========================================
// Quality Specs & CGA Master Settings
// ==========================================

export function getStoredQualitySpecs(): ProductQualitySpec[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUALITY_SPECS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load quality specs:', err);
  }
  return DEFAULT_QUALITY_SPECS;
}

export function saveStoredQualitySpecs(specs: ProductQualitySpec[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.QUALITY_SPECS, JSON.stringify(specs));
  } catch (err) {
    console.error('Failed to save quality specs:', err);
  }
}

export function getStoredCgaSettings(): CgaMasterSetting[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CGA_SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load CGA settings:', err);
  }
  return DEFAULT_CGA_SETTINGS;
}

export function saveStoredCgaSettings(settings: CgaMasterSetting[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CGA_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save CGA settings:', err);
  }
}

// ==========================================
// Shift Archives (Historical Records)
// ==========================================

export interface ArchiveMap {
  [key: string]: ShiftSession; // key: "[date]_[shiftName]"
}

export function getStoredArchives(): ArchiveMap {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SHIFT_ARCHIVES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load archives:', err);
  }
  return {};
}

export function saveShiftArchive(session: ShiftSession): void {
  try {
    const archives = getStoredArchives();
    const key = `${session.date}_${session.shiftName}`;
    archives[key] = session;
    localStorage.setItem(STORAGE_KEYS.SHIFT_ARCHIVES, JSON.stringify(archives));
  } catch (err) {
    console.error('Failed to save shift archive:', err);
  }
}

export function getArchivedShift(date: string, shiftName: string): ShiftSession | null {
  const archives = getStoredArchives();
  const key = `${date}_${shiftName}`;
  return archives[key] || null;
}

// ==========================================
// Active Session & Auto-Reset Logic
// ==========================================

export function getStoredActiveSession(): ShiftSession {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && parsed.tm && parsed.vrm && parsed.incomingMaterials) {
        // Ensure cpProducts exists
        if (!parsed.cpProducts || !Array.isArray(parsed.cpProducts) || parsed.cpProducts.length < 2) {
          parsed.cpProducts = [
            {
              id: 'cp_1',
              label: 'CP Produk 1',
              productType: parsed.tm?.productType || 'PCC Plus FA',
              siloName: parsed.cpShiftSilo?.siloName || 'SILO 4',
              blaine: parsed.cpShiftSilo?.blaine ?? null,
              r45: parsed.cpShiftSilo?.r45 ?? null,
              h2o: parsed.cpShiftSilo?.h2o ?? null,
              so3: parsed.cpShiftSilo?.so3 ?? null,
            },
            {
              id: 'cp_2',
              label: 'CP Produk 2',
              productType: parsed.vrm?.productType || 'PCC NON FA',
              siloName: 'SILO 2',
              blaine: null,
              r45: null,
              h2o: null,
              so3: null,
            },
          ];
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load active session:', err);
  }
  const defaultSession = createInitialShiftSession('SHIFT 2', new Date().toISOString().slice(0, 10), 'AHMAD RIFAI');
  saveStoredActiveSession(defaultSession);
  return defaultSession;
}

export function saveStoredActiveSession(session: ShiftSession): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    // Automatically keep the archive in sync for historical viewing!
    saveShiftArchive(session);
  } catch (err) {
    console.error('Failed to save active session:', err);
  }
}

/**
 * Resumes the latest active state for a user upon login:
 * Preserves all latest active proportions, incoming parameters, mill running status,
 * WF and CP data left by coworkers from the previous shift without resetting.
 */
export function resumeLatestActiveStateForUser(
  userName: string,
  targetDate?: string,
  targetShift?: ShiftName
): ShiftSession {
  const current = getStoredActiveSession();

  if (targetDate) {
    current.date = targetDate;
  }

  if (targetShift && current.shiftName !== targetShift) {
    current.shiftName = targetShift;
    const shiftDef = SHIFT_DEFINITIONS[targetShift] || SHIFT_DEFINITIONS['SHIFT 2'];
    current.shiftHours = shiftDef.timeRange;

    // Adjust row counts if shift duration differs while preserving values
    if (current.tm.hourlyRows.length !== shiftDef.hours.length) {
      current.tm.hourlyRows = shiftDef.hours.map((hour, idx) => ({
        hour,
        blaine: current.tm.hourlyRows[idx]?.blaine ?? null,
        residuR45: current.tm.hourlyRows[idx]?.residuR45 ?? null,
        moistureH2O: current.tm.hourlyRows[idx]?.moistureH2O ?? null,
        so3: current.tm.hourlyRows[idx]?.so3 ?? null,
        freelimeFCaO: current.tm.hourlyRows[idx]?.freelimeFCaO ?? null,
        tph: current.tm.hourlyRows[idx]?.tph ?? null,
        proporsiVersionId: current.tm.hourlyRows[idx]?.proporsiVersionId,
        proporsiDisplay: current.tm.hourlyRows[idx]?.proporsiDisplay,
        admixtureDisplay: current.tm.hourlyRows[idx]?.admixtureDisplay,
        notes: current.tm.hourlyRows[idx]?.notes,
      }));
    }

    if (current.vrm.hourlyRows.length !== shiftDef.hours.length) {
      current.vrm.hourlyRows = shiftDef.hours.map((hour, idx) => ({
        hour,
        blaine: current.vrm.hourlyRows[idx]?.blaine ?? null,
        residuR45: current.vrm.hourlyRows[idx]?.residuR45 ?? null,
        moistureH2O: current.vrm.hourlyRows[idx]?.moistureH2O ?? null,
        so3: current.vrm.hourlyRows[idx]?.so3 ?? null,
        freelimeFCaO: current.vrm.hourlyRows[idx]?.freelimeFCaO ?? null,
        tph: current.vrm.hourlyRows[idx]?.tph ?? null,
        proporsiVersionId: current.vrm.hourlyRows[idx]?.proporsiVersionId,
        proporsiDisplay: current.vrm.hourlyRows[idx]?.proporsiDisplay,
        admixtureDisplay: current.vrm.hourlyRows[idx]?.admixtureDisplay,
        notes: current.vrm.hourlyRows[idx]?.notes,
      }));
    }
  }

  current.analystName = userName;
  saveStoredActiveSession(current);
  return current;
}

/**
 * Switch or start a new shift:
 * 1. Archives current active shift
 * 2. Checks if the target date+shift has an existing archive (to resume)
 * 3. If no archive exists, carries forward all active proportions, incoming configurations,
 *    and mill settings while resetting hourly rows for the fresh shift.
 */
export function switchOrStartShift(
  targetDate: string,
  targetShift: ShiftName,
  analystName: string,
  tmRunning: boolean = true,
  tmProduct: ProductType = 'PCC NON FA',
  tmSilo: string = 'SILO 5',
  vrmRunning: boolean = true,
  vrmProduct: ProductType = 'PCC Plus FA',
  vrmSilo: string = 'SILO 4'
): ShiftSession {
  // 1. Archive current active session
  try {
    const current = getStoredActiveSession();
    if (current && (current.date !== targetDate || current.shiftName !== targetShift)) {
      saveShiftArchive(current);
    }
  } catch (err) {
    console.error('Error auto-archiving prior shift:', err);
  }

  // 2. Check if archive exists for target
  const existing = getArchivedShift(targetDate, targetShift);
  if (existing) {
    const resumed: ShiftSession = {
      ...existing,
      analystName: analystName || existing.analystName,
    };
    saveStoredActiveSession(resumed);
    return resumed;
  }

  // 3. Create fresh shift but preserve incoming materials & active proportions from latest session
  const current = getStoredActiveSession();
  const freshSession = createInitialShiftSession(targetShift, targetDate, analystName);
  
  freshSession.tm.isRunning = tmRunning;
  freshSession.tm.productType = tmProduct;
  freshSession.tm.siloName = tmSilo;
  if (current?.tm?.proporsiHistory?.length > 0) {
    freshSession.tm.proporsiHistory = [...current.tm.proporsiHistory];
  }

  freshSession.vrm.isRunning = vrmRunning;
  freshSession.vrm.productType = vrmProduct;
  freshSession.vrm.siloName = vrmSilo;
  if (current?.vrm?.proporsiHistory?.length > 0) {
    freshSession.vrm.proporsiHistory = [...current.vrm.proporsiHistory];
  }

  // Carry forward incoming materials and CP product configurations
  if (current?.incomingMaterials?.length > 0) {
    freshSession.incomingMaterials = JSON.parse(JSON.stringify(current.incomingMaterials));
  }
  if (current?.cpProducts?.length === 2) {
    freshSession.cpProducts = [
      { ...current.cpProducts[0], blaine: null, r45: null, h2o: null, so3: null },
      { ...current.cpProducts[1], blaine: null, r45: null, h2o: null, so3: null },
    ];
  }

  saveStoredActiveSession(freshSession);
  return freshSession;
}

export function resetFactoryData(): ShiftSession {
  localStorage.removeItem(STORAGE_KEYS.MASTER_TARGETS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  localStorage.removeItem(STORAGE_KEYS.QUALITY_SPECS);
  localStorage.removeItem(STORAGE_KEYS.CGA_SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.USERS_LIST);
  localStorage.removeItem(STORAGE_KEYS.PRODUCT_LIST);

  const resetSession = createInitialShiftSession('SHIFT 2', new Date().toISOString().slice(0, 10), 'AHMAD RIFAI');
  saveStoredActiveSession(resetSession);
  saveStoredMasterTargets(DEFAULT_MASTER_TARGETS);
  saveStoredQualitySpecs(DEFAULT_QUALITY_SPECS);
  saveStoredCgaSettings(DEFAULT_CGA_SETTINGS);
  saveStoredUsers(DEFAULT_USERS);
  saveStoredProductList(DEFAULT_PRODUCT_LIST);
  return resetSession;
}

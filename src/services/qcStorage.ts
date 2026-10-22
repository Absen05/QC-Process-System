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
  createInitialShiftSession,
  sanitizeShiftSession
} from '../data/qcDefaults';
import { SHIFT_DEFINITIONS } from '../utils/qcCalculations';

const STORAGE_KEYS = {
  CURRENT_ROLE: 'qc_cemindo_current_role',
  AUTH_SESSION: 'qc_cemindo_auth_session',
  USERS_LIST: 'qc_cemindo_users_list_v3',
  MASTER_TARGETS: 'qc_cemindo_master_targets_v3',
  PRODUCT_LIST: 'qc_cemindo_product_list_v3',
  QUALITY_SPECS: 'qc_cemindo_quality_specs_v3',
  CGA_SETTINGS: 'qc_cemindo_cga_settings_v3',
  ACTIVE_SESSION: 'qc_cemindo_active_session_v4',
  SHIFT_ARCHIVES: 'qc_cemindo_shift_archives_v4',
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
  tmRunning: boolean = false,
  tmProduct: ProductType = '',
  tmSilo: string = '',
  vrmRunning: boolean = false,
  vrmProduct: ProductType = '',
  vrmSilo: string = ''
): ShiftSession {
  return switchOrStartShift(date, shiftName, analystName, tmRunning, tmProduct, tmSilo, vrmRunning, vrmProduct, vrmSilo, null);
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
      const parsed = JSON.parse(data);
      if (parsed && parsed['Tube Mill (TM)'] && parsed['Vertical Roller Mill (VRM)']) {
        return parsed;
      }
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

  const qualitySpecs = getStoredQualitySpecs();
  if (!qualitySpecs.some(s => s.productType === productName)) {
    qualitySpecs.push(
      {
        id: `qs_tm_${Date.now()}`,
        millType: 'TM',
        productType: productName,
        blaine: { min: 4700, max: 4900, std: 4800 },
        residuR45: { min: 0, max: 5.0, std: 0 },
        moistureH2O: { min: 0.05, max: 0.30, std: 0.15 },
        so3: { min: 1.60, max: 1.80, std: 1.70 },
        freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 },
      },
      {
        id: `qs_vrm_${Date.now() + 1}`,
        millType: 'VRM',
        productType: productName,
        blaine: { min: 4700, max: 4900, std: 4800 },
        residuR45: { min: 0, max: 5.0, std: 0 },
        moistureH2O: { min: 0.05, max: 0.30, std: 0.15 },
        so3: { min: 1.60, max: 1.80, std: 1.70 },
        freelimeFCaO: { min: 0.50, max: 1.50, std: 1.00 },
      }
    );
    saveStoredQualitySpecs(qualitySpecs);
  }

  const cgaSettings = getStoredCgaSettings();
  if (!cgaSettings.some(c => c.productType === productName)) {
    cgaSettings.push(
      {
        id: `cga_tm_${Date.now()}`,
        millType: 'TM',
        productType: productName,
        cgaBrand: 'SIKA',
        dosagePpm: 400,
        notes: 'Standar awal TM',
      },
      {
        id: `cga_vrm_${Date.now() + 1}`,
        millType: 'VRM',
        productType: productName,
        cgaBrand: 'SIKA',
        dosagePpm: 400,
        notes: 'Standar awal VRM',
      }
    );
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
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const cleaned: ArchiveMap = {};
        for (const k of Object.keys(parsed)) {
          cleaned[k] = sanitizeShiftSession(parsed[k]);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Failed to load archives:', err);
  }
  return {};
}

export function saveShiftArchive(session: ShiftSession): void {
  try {
    const clean = sanitizeShiftSession(session);
    const archives = getStoredArchives();
    const key = `${clean.date}_${clean.shiftName}`;
    archives[key] = clean;
    localStorage.setItem(STORAGE_KEYS.SHIFT_ARCHIVES, JSON.stringify(archives));
  } catch (err) {
    console.error('Failed to save shift archive:', err);
  }
}

export function getArchivedShift(date: string, shiftName: string): ShiftSession | null {
  const archives = getStoredArchives();
  const key = `${date}_${shiftName}`;
  return archives[key] ? sanitizeShiftSession(archives[key]) : null;
}

// ==========================================
// Active Session & Auto-Reset Logic
// ==========================================

export function getStoredActiveSession(): ShiftSession {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (data) {
      const rawParsed = JSON.parse(data);
      if (rawParsed && rawParsed.tm && rawParsed.vrm && rawParsed.incomingMaterials) {
        const parsed = sanitizeShiftSession(rawParsed);
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
        const shiftDef = SHIFT_DEFINITIONS[parsed.shiftName as ShiftName] || SHIFT_DEFINITIONS['SHIFT 2'];
        const alignHours = (mill: any) => {
          if (!mill) return;
          const currentRows: any[] = Array.isArray(mill.hourlyRows) ? mill.hourlyRows : [];
          mill.hourlyRows = shiftDef.hours.map((hour: string) => {
            const found = currentRows.find((r: any) => r.hour === hour);
            if (found) return found;
            return {
              hour,
              blaine: null,
              residuR45: null,
              moistureH2O: null,
              so3: null,
              freelimeFCaO: null,
              tph: null,
              proporsiDisplay: '',
              admixtureDisplay: '',
              notes: undefined,
            };
          });
        };
        alignHours(parsed.tm);
        alignHours(parsed.vrm);

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
    const clean = sanitizeShiftSession(session);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(clean));
    saveShiftArchive(clean);
  } catch (err) {
    console.error('Failed to save active session:', err);
  }
}

export function switchOrStartShift(
  targetDate: string,
  targetShift: ShiftName,
  analystName: string,
  _tmRunning: boolean = false,
  _tmProduct: ProductType = '',
  _tmSilo: string = '',
  _vrmRunning: boolean = false,
  _vrmProduct: ProductType = '',
  _vrmSilo: string = '',
  _priorSessionParam?: ShiftSession | null
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

  // 2. Check if archive exists for target date & shift
  const existing = getArchivedShift(targetDate, targetShift);
  if (existing) {
    const resumed: ShiftSession = sanitizeShiftSession({
      ...existing,
      analystName: analystName || existing.analystName,
    });
    saveStoredActiveSession(resumed);
    return resumed;
  }

  // 3. Create fresh shift 100% BERSIH (Tanpa proporsi aktif fiktif)
  const freshSession = createInitialShiftSession(targetShift, targetDate, analystName);
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

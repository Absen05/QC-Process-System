import { ShiftSession, ShiftName } from '../types/qc';
import { getStoredActiveSession, saveStoredActiveSession } from './qcStorage';

/**
 * Service API Sinkronisasi Cloud Database (Poin 2 & 3)
 * Menghubungkan client (PC & HP) ke server database terpusat secara real-time
 */

export async function fetchCloudSession(date: string, shift: ShiftName): Promise<{
  session: ShiftSession | null;
  found: boolean;
  priorSession?: any;
}> {
  try {
    const res = await fetch(`/api/qc/session?date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.session) {
        // Cache to localStorage as backup
        saveStoredActiveSession(data.session);
      }
      return data;
    }
  } catch (err) {
    console.warn('Network offline or backend unreachable, falling back to local storage cache:', err);
  }
  const local = getStoredActiveSession();
  return {
    session: (local.date === date && local.shiftName === shift) ? local : null,
    found: local.date === date && local.shiftName === shift,
  };
}

export async function saveCloudSession(session: ShiftSession): Promise<boolean> {
  // Always update local cache immediately
  saveStoredActiveSession(session);

  try {
    const res = await fetch('/api/qc/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to push session to cloud DB:', err);
    return false;
  }
}

export async function upsertCloudCell(
  tanggal: string,
  shift: ShiftName,
  mill_type: 'TM' | 'VRM',
  jam_analisa: string,
  field: string,
  value: any
): Promise<boolean> {
  try {
    const res = await fetch('/api/qc/upsert-cell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tanggal,
        shift,
        mill_type,
        jam_analisa,
        field,
        value,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to upsert cell to cloud DB:', err);
    return false;
  }
}

export async function fetchLatestCloudProporsi(mill: 'TM' | 'VRM'): Promise<any> {
  try {
    const res = await fetch(`/api/qc/proporsi/latest?mill=${mill}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch latest proporsi from cloud:', err);
  }
  return { found: false };
}

export async function fetchAllCloudSessions(): Promise<Record<string, ShiftSession>> {
  try {
    const res = await fetch('/api/qc/all-sessions');
    if (res.ok) {
      const data = await res.json();
      return data.sessions || {};
    }
  } catch (err) {
    console.warn('Failed to fetch all sessions from cloud:', err);
  }
  return {};
}

export async function saveCloudMasterTargets(targets: any): Promise<boolean> {
  try {
    const res = await fetch('/api/qc/master-targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to save master targets to cloud:', err);
    return false;
  }
}

export async function fetchCloudMasterTargets(): Promise<any | null> {
  try {
    const res = await fetch('/api/qc/master-targets');
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.targets) {
        return data.targets;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch master targets from cloud:', err);
  }
  return null;
}


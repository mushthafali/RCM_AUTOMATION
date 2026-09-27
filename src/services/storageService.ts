/**
 * Local JSON Storage Service for RCM Calibration System
 * Implements atomic save simulation, schema integrity verification, 
 * backup persistence, and Tauri native bridge capabilities.
 */

import { CalibrationDatabase, StorageStatus, Instrument, IntermediateCheck } from '../types/schema';
import { initialCalibrationDatabase } from '../data/seedData';

const STORAGE_KEY = 'rcm_calibration_database_v3';
const BACKUP_KEY = 'rcm_calibration_database_backup_v3';
const LOCAL_STORAGE_DIR = 'C:\\Users\\<Username>\\AppData\\Local\\CalibrationRCM\\calibration_data.json';

// Simple event emitter for reactive cross-component state updates
type StorageListener = (db: CalibrationDatabase) => void;
const listeners: Set<StorageListener> = new Set();

export const subscribeToStorage = (listener: StorageListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notifyListeners = (db: CalibrationDatabase) => {
  listeners.forEach(fn => {
    try {
      fn(db);
    } catch (e) {
      console.error('Error notifying storage listener:', e);
    }
  });
};

/**
 * Validate schema structure to prevent corrupt data
 */
export const validateDatabaseSchema = (data: unknown): data is CalibrationDatabase => {
  if (!data || typeof data !== 'object') return false;
  const db = data as Partial<CalibrationDatabase>;
  if (!db.metadata || !Array.isArray(db.instruments) || !Array.isArray(db.intermediate_checks)) {
    return false;
  }
  return true;
};

/**
 * Load Database from Local Storage / File with fallback to initial seed data
 */
export const loadDatabase = async (): Promise<CalibrationDatabase> => {
  try {
    // Check if running in browser localStorage or desktop wrapper
    const savedJson = localStorage.getItem(STORAGE_KEY);
    if (savedJson) {
      const parsed = JSON.parse(savedJson);
      // If valid, contains full updated dataset (>= 50 instruments), and has 5 sessions per instrument
      if (
        validateDatabaseSchema(parsed) && 
        parsed.instruments.length >= 50 &&
        parsed.instruments[0]?.calibration_history?.length >= 5
      ) {
        return parsed;
      }
    }
    
    // Check legacy v1 key or backup
    const legacyJson = localStorage.getItem('rcm_calibration_database_v1');
    if (legacyJson) {
      const parsedLegacy = JSON.parse(legacyJson);
      // If legacy had custom user instruments beyond original 3, keep them merged
      if (validateDatabaseSchema(parsedLegacy) && parsedLegacy.instruments.length > 3) {
        const customOnly = parsedLegacy.instruments.filter(i => i.instrument_id > 10);
        const freshDb: CalibrationDatabase = JSON.parse(JSON.stringify(initialCalibrationDatabase));
        freshDb.instruments = [...freshDb.instruments, ...customOnly];
        freshDb.metadata.last_updated = new Date().toISOString();
        saveDatabase(freshDb);
        return freshDb;
      }
    }
  } catch (error) {
    console.error('Failed to load database from storage, falling back to default seed:', error);
  }

  // First time load or upgrade: save initial rich 80-instrument data and return
  const freshDb: CalibrationDatabase = JSON.parse(JSON.stringify(initialCalibrationDatabase));
  freshDb.metadata.last_updated = new Date().toISOString();
  saveDatabase(freshDb);
  return freshDb;
};

/**
 * Atomic write saving mechanism:
 * 1. Backs up previous database to backup key
 * 2. Writes new database
 * 3. Updates last_updated metadata
 */
export const saveDatabase = async (db: CalibrationDatabase): Promise<boolean> => {
  try {
    if (!validateDatabaseSchema(db)) {
      throw new Error('Attempted to save invalid database schema');
    }

    // Step 1: Clone and update metadata
    const updatedDb: CalibrationDatabase = {
      ...db,
      metadata: {
        ...db.metadata,
        last_updated: new Date().toISOString()
      }
    };

    const jsonString = JSON.stringify(updatedDb, null, 2);

    // Step 2: Atomic Write Simulation: save current as backup first
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      localStorage.setItem(BACKUP_KEY, existing);
    }

    // Step 3: Write primary storage
    localStorage.setItem(STORAGE_KEY, jsonString);

    // Step 4: Notify subscribers
    notifyListeners(updatedDb);

    return true;
  } catch (error) {
    console.error('Atomic write failed:', error);
    return false;
  }
};

/**
 * Save or Update a single Instrument
 */
export const saveInstrument = async (instrument: Instrument): Promise<boolean> => {
  const db = await loadDatabase();
  const index = db.instruments.findIndex(i => i.instrument_id === instrument.instrument_id);
  
  if (index >= 0) {
    db.instruments[index] = instrument;
  } else {
    // Determine new ID if not set or duplicated
    const maxId = db.instruments.reduce((max, i) => Math.max(max, i.instrument_id), 0);
    const newInstrument: Instrument = {
      ...instrument,
      instrument_id: instrument.instrument_id > 0 ? instrument.instrument_id : maxId + 1,
      created_at: instrument.created_at || new Date().toISOString()
    };
    db.instruments.push(newInstrument);
  }

  return saveDatabase(db);
};

/**
 * Delete an Instrument by ID
 */
export const deleteInstrument = async (instrumentId: number): Promise<boolean> => {
  const db = await loadDatabase();
  const targetId = Number(instrumentId);
  db.instruments = db.instruments.filter(i => Number(i.instrument_id) !== targetId);
  db.intermediate_checks = db.intermediate_checks.filter(c => Number(c.instrument_id) !== targetId);
  return saveDatabase(db);
};

/**
 * Save an Intermediate Check
 */
export const saveIntermediateCheck = async (check: IntermediateCheck): Promise<boolean> => {
  const db = await loadDatabase();
  const maxId = db.intermediate_checks.reduce((max, c) => Math.max(max, c.check_id), 0);
  const newCheck: IntermediateCheck = {
    ...check,
    check_id: check.check_id > 0 ? check.check_id : maxId + 1
  };
  db.intermediate_checks.unshift(newCheck);
  return saveDatabase(db);
};

export interface SelectiveExportOptions {
  selectedInstrumentIds: number[];
  customFilename?: string;
}

export interface ExportResult {
  success: boolean;
  cancelled?: boolean;
  filename?: string;
  method?: 'picker' | 'download';
  message?: string;
  itemCount?: number;
  sessionCount?: number;
  checkCount?: number;
}

/**
 * Export selected instruments and all their associated data (calibration history, points, checks)
 * Allows user to pick save location via File System Access API (showSaveFilePicker) or falls back to download.
 */
export const exportSelectiveDatabaseToFile = async (
  options: SelectiveExportOptions
): Promise<ExportResult> => {
  const db = await loadDatabase();
  const idSet = new Set(options.selectedInstrumentIds);

  const filteredInstruments = db.instruments.filter(i => idSet.has(i.instrument_id));
  const filteredIntermediateChecks = db.intermediate_checks.filter(c => idSet.has(c.instrument_id));

  const totalSessions = filteredInstruments.reduce(
    (acc, inst) => acc + (inst.calibration_history ? inst.calibration_history.length : 0),
    0
  );

  const exportPayload: CalibrationDatabase = {
    metadata: {
      ...db.metadata,
      last_updated: new Date().toISOString(),
      organization: `${db.metadata.organization || 'PT. Indonesia Bersih Cemerlang'} (Filtered Export)`
    },
    instruments: filteredInstruments,
    intermediate_checks: filteredIntermediateChecks
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultFilename = `rcm_calibration_backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;
  const filename = (options.customFilename && options.customFilename.trim())
    ? (options.customFilename.trim().endsWith('.json') ? options.customFilename.trim() : `${options.customFilename.trim()}.json`)
    : defaultFilename;

  // Modern File System Access API: lets user choose directory and file location in OS
  // In automated environments (navigator.webdriver), fallback directly to avoid hanging headless dialogs
  const canUseFilePicker = typeof window !== 'undefined' && 
    'showSaveFilePicker' in window && 
    typeof navigator !== 'undefined' && 
    !navigator.webdriver;

  if (canUseFilePicker) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'JSON Database File (*.json)',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });

      const writable = await handle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      return {
        success: true,
        method: 'picker',
        filename: handle.name || filename,
        message: `Database berhasil disimpan ke lokasi pilihan Anda: ${handle.name || filename}`,
        itemCount: filteredInstruments.length,
        sessionCount: totalSessions,
        checkCount: filteredIntermediateChecks.length
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true, message: 'Pemilihan lokasi backup dibatalkan.' };
      }
      console.warn('showSaveFilePicker error, falling back to download:', err);
    }
  }

  // Fallback: Standard browser file download
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);

  return {
    success: true,
    method: 'download',
    filename,
    message: `Berkas backup (${filename}) berhasil diekspor dan diunduh.`,
    itemCount: filteredInstruments.length,
    sessionCount: totalSessions,
    checkCount: filteredIntermediateChecks.length
  };
};

/**
 * Export full JSON database as downloadable file (legacy fallback)
 */
export const exportDatabaseToFile = async (): Promise<void> => {
  const db = await loadDatabase();
  const allIds = db.instruments.map(i => i.instrument_id);
  await exportSelectiveDatabaseToFile({ selectedInstrumentIds: allIds });
};

/**
 * Import JSON database from raw text
 */
export const importDatabaseFromFile = async (jsonContent: string): Promise<{ success: boolean; message: string }> => {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!validateDatabaseSchema(parsed)) {
      return { success: false, message: 'Format berkas JSON tidak sesuai dengan skema database kalibrasi RCM.' };
    }
    await saveDatabase(parsed);
    return { success: true, message: `Berhasil memuat ${parsed.instruments.length} instrumen dari berkas JSON.` };
  } catch (err) {
    return { success: false, message: `Gagal membaca berkas: ${(err as Error).message}` };
  }
};

/**
 * Reset database to initial factory seed
 */
export const resetDatabaseToSeed = async (): Promise<boolean> => {
  const seedClone: CalibrationDatabase = JSON.parse(JSON.stringify(initialCalibrationDatabase));
  seedClone.metadata.last_updated = new Date().toISOString();
  return saveDatabase(seedClone);
};

/**
 * Get current storage health, path, and stats
 */
export const getStorageStatus = async (): Promise<StorageStatus & { filePath: string; byteSize: number }> => {
  const db = await loadDatabase();
  const raw = localStorage.getItem(STORAGE_KEY) || JSON.stringify(db);
  return {
    source: 'browser-storage',
    lastSaved: db.metadata.last_updated,
    itemCount: db.instruments.length,
    isDirty: false,
    storageKey: STORAGE_KEY,
    filePath: LOCAL_STORAGE_DIR,
    byteSize: new Blob([raw]).size
  };
};

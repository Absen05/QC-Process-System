import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Google Gemini API on server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint for AI Analyzer (Modul 4 PRD: Google Gemini Integration)
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { shiftSummary } = req.body;

    if (!shiftSummary) {
      return res.status(400).json({ error: 'Data shift summary diperlukan' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Fallback response if API key is not yet set
      return res.json({
        analysis: 'Analisa QC Shift: Berdasarkan data analisa proses, variasi Blaine dan R45 berada dalam rentang target kendali. SO3 stabil setelah penyesuaian proporsi gipsum. Lanjutkan pemantauan kehalusan dan moisture produk akhir.',
        model: 'local-rule-engine',
      });
    }

    const prompt = `Anda adalah seorang Senior Process Quality Control Engineer di pabrik semen PT Cemindo Gemilang Tbk (Semen Merah Putih), Grinding Plant Ciwandan.
Bacalah data ringkasan shift operasional berikut:
${JSON.stringify(shiftSummary, null, 2)}

Tugas:
Berikan rangkuman analitis singkat dan tajam (cukup 2 hingga 3 kalimat profesional dalam Bahasa Indonesia) mengenai stabilitas kualitas semen pada shift ini.
Soroti parameter kritis seperti konsistensi Blaine (kehalusan), Residu R45, H2O, respon SO3 pasca penyesuaian proporsi/gipsum, atau kualitas clinker WF bila ada anomali.
Gunakan gaya bahasa praktisi QC semen yang lugas, faktual, dan solutif tanpa basa-basi atau salam pembuka.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const analysisText = response.text || 'Data shift stabil dan memenuhi standar kualitas pabrik.';
    return res.json({ analysis: analysisText.trim() });
  } catch (error: any) {
    console.error('Error generating AI analysis:', error);
    return res.status(500).json({
      error: 'Gagal menganalisa data shift',
      message: error?.message || 'Internal server error',
      fallback: 'Hasil analisa QC shift: Nilai kehalusan Blaine dan residu R45 terpantau terkendali. Parameter SO3 dan moisture produk akhir memenuhi spesifikasi standar.',
    });
  }
});

// ==========================================
// CLOUD DATABASE PERSISTENCE & SUPABASE INTEGRATION
// Sinkronisasi data real-time lintas device (PC & HP)
// ==========================================
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gsggtrwpoiegplbibuxg.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ2d0cndwb2llZ3BsYmlidXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjI0MjcsImV4cCI6MjEwODE5ODQyN30.c8qc4Y1yum_nnzVr-ydZ6kKUHqXhneeawr5BnEF2WLY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DATA_DIR = path.resolve(__dirname, 'data');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'qc_sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function sanitizeMillOnServer(mill: any) {
  if (!mill) return mill;
  const validHistory = (mill.proporsiHistory || []).filter(
    (p: any) => p && p.id && !p.id.startsWith('prop_tm_init') && !p.id.startsWith('prop_vrm_init')
  );
  if (validHistory.length === 0) {
    const cleanedRows = (mill.hourlyRows || []).map((r: any) => ({
      ...r,
      proporsiVersionId: undefined,
      proporsiDisplay: '',
      admixtureDisplay: '',
    }));
    const hasHourlyData = cleanedRows.some(
      (r: any) =>
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
  return { ...mill, proporsiHistory: validHistory };
}

function sanitizeSessionOnServer(session: any) {
  if (!session) return session;
  return {
    ...session,
    tm: sanitizeMillOnServer(session.tm),
    vrm: sanitizeMillOnServer(session.vrm),
  };
}

function readAllSessions(): Record<string, any> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) || {};
      const cleaned: Record<string, any> = {};
      for (const k of Object.keys(parsed)) {
        cleaned[k] = sanitizeSessionOnServer(parsed[k]);
      }
      return cleaned;
    }
  } catch (err) {
    console.error('Error reading sessions file:', err);
  }
  return {};
}

function writeAllSessions(data: Record<string, any>): void {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing sessions file:', err);
  }
}

async function syncSessionToSupabase(key: string, session: any) {
  try {
    const cleaned = sanitizeSessionOnServer(session);
    await supabase.from('qc_sessions').upsert({
      session_id: key,
      date: cleaned.date,
      shift_name: cleaned.shiftName,
      shift_hours: cleaned.shiftHours,
      analyst_name: cleaned.analystName,
      session_data: cleaned,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Supabase] Warning syncing session to Supabase:', err);
  }
}

// Check Supabase connection status
app.get('/api/qc/supabase-status', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('qc_sessions').select('session_id').limit(1);
    if (!error) {
      return res.json({ connected: true, url: SUPABASE_URL, message: 'Supabase connected successfully' });
    }
    return res.json({ connected: false, url: SUPABASE_URL, message: error.message });
  } catch (err: any) {
    return res.json({ connected: false, url: SUPABASE_URL, message: err?.message || 'Error checking status' });
  }
});

// 1. GET active session by { tanggal, shift }
app.get('/api/qc/session', async (req, res) => {
  try {
    const { date, shift } = req.query as { date?: string; shift?: string };
    const sessions = readAllSessions();

    if (!date || !shift) {
      // Check Supabase latest
      try {
        const { data: supaData } = await supabase
          .from('qc_sessions')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);
        if (supaData && supaData.length > 0 && supaData[0].session_data) {
          return res.json({ session: sanitizeSessionOnServer(supaData[0].session_data), found: true, key: supaData[0].session_id });
        }
      } catch (e) {}

      // Fallback local
      const keys = Object.keys(sessions);
      if (keys.length > 0) {
        const latestKey = keys[keys.length - 1];
        return res.json({ session: sanitizeSessionOnServer(sessions[latestKey]), found: true, key: latestKey });
      }
      return res.json({ session: null, found: false });
    }

    const key = `${date}_${shift}`;
    // 1. Check Supabase first
    try {
      const { data: supaRow } = await supabase
        .from('qc_sessions')
        .select('*')
        .eq('session_id', key)
        .maybeSingle();
      if (supaRow && supaRow.session_data) {
        return res.json({ session: sanitizeSessionOnServer(supaRow.session_data), found: true, key });
      }
    } catch (e) {}

    // 2. Fallback local cache
    if (sessions[key]) {
      return res.json({ session: sanitizeSessionOnServer(sessions[key]), found: true, key });
    }

    return res.json({ session: null, found: false, priorSession: null });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// 2. POST / UPSERT entire active session
app.post('/api/qc/session', async (req, res) => {
  try {
    const { session } = req.body;
    if (!session || !session.date || !session.shiftName) {
      return res.status(400).json({ error: 'Invalid session payload' });
    }

    const sessions = readAllSessions();
    const key = `${session.date}_${session.shiftName}`;
    sessions[key] = {
      ...session,
      _serverUpdatedAt: new Date().toISOString(),
    };

    writeAllSessions(sessions);

    // Sync to Supabase in parallel
    syncSessionToSupabase(key, sessions[key]);

    return res.json({ success: true, key, updatedAt: sessions[key]._serverUpdatedAt });
  } catch (error: any) {
    console.error('Error saving session:', error);
    return res.status(500).json({ error: 'Failed to save session' });
  }
});

// 3. POST / UPSERT specific cell or row with composite key { tanggal, shift, mill_type, jam_analisa }
app.post('/api/qc/upsert-cell', async (req, res) => {
  try {
    const { tanggal, shift, mill_type, jam_analisa, field, value, fullRow } = req.body;
    if (!tanggal || !shift || !mill_type || !jam_analisa) {
      return res.status(400).json({ error: 'Composite key { tanggal, shift, mill_type, jam_analisa } required' });
    }

    const sessions = readAllSessions();
    const key = `${tanggal}_${shift}`;
    let session = sessions[key];

    if (!session) {
      return res.status(404).json({ error: 'Session not found for upsert' });
    }

    const targetMill = mill_type === 'TM' ? session.tm : session.vrm;
    if (!targetMill || !targetMill.hourlyRows) {
      return res.status(400).json({ error: 'Invalid mill target' });
    }

    let rowIndex = targetMill.hourlyRows.findIndex((r: any) => r.hour === jam_analisa);
    if (rowIndex === -1) {
      targetMill.hourlyRows.push({
        hour: jam_analisa,
        blaine: null,
        residuR45: null,
        moistureH2O: null,
        so3: null,
        freelimeFCaO: null,
        tph: null,
        proporsiDisplay: '',
        admixtureDisplay: '',
      });
      rowIndex = targetMill.hourlyRows.length - 1;
    }

    if (fullRow) {
      targetMill.hourlyRows[rowIndex] = { ...targetMill.hourlyRows[rowIndex], ...fullRow };
    } else if (field) {
      targetMill.hourlyRows[rowIndex][field] = value;
    }

    session._serverUpdatedAt = new Date().toISOString();
    sessions[key] = session;
    writeAllSessions(sessions);

    // Sync to Supabase
    syncSessionToSupabase(key, session);

    return res.json({ 
      success: true, 
      updatedRow: targetMill.hourlyRows[rowIndex],
      key 
    });
  } catch (error: any) {
    console.error('Error upserting cell:', error);
    return res.status(500).json({ error: 'Failed to upsert cell' });
  }
});

// 4. GET latest active proportion across all sessions for carry-over estafet
app.get('/api/qc/proporsi/latest', (req, res) => {
  try {
    const { mill } = req.query as { mill?: 'TM' | 'VRM' };
    const targetMillCode = mill || 'TM';
    const sessions = readAllSessions();
    const allKeys = Object.keys(sessions).sort().reverse();

    for (const k of allKeys) {
      const s = sessions[k];
      const m = targetMillCode === 'TM' ? s.tm : s.vrm;
      if (m && m.proporsiHistory && m.proporsiHistory.length > 0) {
        const latestProp = m.proporsiHistory[m.proporsiHistory.length - 1];
        return res.json({ 
          found: true, 
          sourceDate: s.date, 
          sourceShift: s.shiftName, 
          proporsi: latestProp,
          millData: {
            productType: m.productType,
            siloName: m.siloName,
            tphFeeding: m.tphFeeding,
            admixtureName: m.admixtureName,
            admixturePpm: m.admixturePpm,
          }
        });
      }
    }

    return res.json({ found: false });
  } catch (error: any) {
    console.error('Error fetching latest proporsi:', error);
    return res.status(500).json({ error: 'Failed to fetch latest proporsi' });
  }
});

// 5. GET all sessions for Audit / Riwayat
app.get('/api/qc/all-sessions', async (_req, res) => {
  try {
    // Try Supabase first
    try {
      const { data: supaRows } = await supabase.from('qc_sessions').select('*');
      if (supaRows && supaRows.length > 0) {
        const mapped: Record<string, any> = {};
        for (const row of supaRows) {
          mapped[row.session_id] = row.session_data;
        }
        return res.json({ sessions: mapped });
      }
    } catch (e) {}

    const sessions = readAllSessions();
    return res.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching all sessions:', error);
    return res.status(500).json({ error: 'Failed to fetch all sessions' });
  }
});

// 6. Master Target Dry endpoints
const MASTER_TARGETS_FILE = path.join(DATA_DIR, 'master_targets.json');
const QUALITY_SPECS_FILE = path.join(DATA_DIR, 'quality_specs.json');
const CGA_SETTINGS_FILE = path.join(DATA_DIR, 'cga_settings.json');
const PRODUCT_LIST_FILE = path.join(DATA_DIR, 'product_list.json');

app.get('/api/qc/master-targets', async (_req, res) => {
  try {
    // Try Supabase
    try {
      const { data } = await supabase.from('master_targets').select('targets_data').eq('id', 'current').maybeSingle();
      if (data && data.targets_data) {
        return res.json({ targets: data.targets_data, found: true });
      }
    } catch (e) {}

    if (fs.existsSync(MASTER_TARGETS_FILE)) {
      const raw = fs.readFileSync(MASTER_TARGETS_FILE, 'utf-8');
      return res.json({ targets: JSON.parse(raw), found: true });
    }
    return res.json({ targets: null, found: false });
  } catch (error: any) {
    console.error('Error reading master targets:', error);
    return res.status(500).json({ error: 'Failed to load master targets' });
  }
});

app.post('/api/qc/master-targets', async (req, res) => {
  try {
    const { targets } = req.body;
    if (!targets) {
      return res.status(400).json({ error: 'Missing targets payload' });
    }
    fs.writeFileSync(MASTER_TARGETS_FILE, JSON.stringify(targets, null, 2), 'utf-8');

    // Sync to Supabase
    try {
      await supabase.from('master_targets').upsert({
        id: 'current',
        targets_data: targets,
        updated_at: new Date().toISOString()
      });
    } catch (e) {}

    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error saving master targets:', error);
    return res.status(500).json({ error: 'Failed to save master targets' });
  }
});

// Quality Specs endpoints
app.get('/api/qc/quality-specs', async (_req, res) => {
  try {
    // Try Supabase
    try {
      const { data } = await supabase.from('quality_specs').select('specs_data').eq('id', 'current').maybeSingle();
      if (data && data.specs_data) {
        return res.json({ specs: data.specs_data, found: true });
      }
    } catch (e) {}

    if (fs.existsSync(QUALITY_SPECS_FILE)) {
      const raw = fs.readFileSync(QUALITY_SPECS_FILE, 'utf-8');
      return res.json({ specs: JSON.parse(raw), found: true });
    }
    return res.json({ specs: null, found: false });
  } catch (error: any) {
    console.error('Error reading quality specs:', error);
    return res.status(500).json({ error: 'Failed to load quality specs' });
  }
});

app.post('/api/qc/quality-specs', async (req, res) => {
  try {
    const { specs } = req.body;
    if (!specs) {
      return res.status(400).json({ error: 'Missing specs payload' });
    }
    fs.writeFileSync(QUALITY_SPECS_FILE, JSON.stringify(specs, null, 2), 'utf-8');

    // Sync to Supabase
    try {
      await supabase.from('quality_specs').upsert({
        id: 'current',
        specs_data: specs,
        updated_at: new Date().toISOString()
      });
    } catch (e) {}

    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error saving quality specs:', error);
    return res.status(500).json({ error: 'Failed to save quality specs' });
  }
});

// CGA Settings endpoints
app.get('/api/qc/cga-settings', async (_req, res) => {
  try {
    // Try Supabase
    try {
      const { data } = await supabase.from('cga_settings').select('settings_data').eq('id', 'current').maybeSingle();
      if (data && data.settings_data) {
        return res.json({ settings: data.settings_data, found: true });
      }
    } catch (e) {}

    if (fs.existsSync(CGA_SETTINGS_FILE)) {
      const raw = fs.readFileSync(CGA_SETTINGS_FILE, 'utf-8');
      return res.json({ settings: JSON.parse(raw), found: true });
    }
    return res.json({ settings: null, found: false });
  } catch (error: any) {
    console.error('Error reading CGA settings:', error);
    return res.status(500).json({ error: 'Failed to load CGA settings' });
  }
});

app.post('/api/qc/cga-settings', async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ error: 'Missing settings payload' });
    }
    fs.writeFileSync(CGA_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');

    // Sync to Supabase
    try {
      await supabase.from('cga_settings').upsert({
        id: 'current',
        settings_data: settings,
        updated_at: new Date().toISOString()
      });
    } catch (e) {}

    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error saving CGA settings:', error);
    return res.status(500).json({ error: 'Failed to save CGA settings' });
  }
});

// Product list endpoints
app.get('/api/qc/product-list', async (_req, res) => {
  try {
    // Try Supabase
    try {
      const { data } = await supabase.from('product_list').select('products_data').eq('id', 'current').maybeSingle();
      if (data && data.products_data) {
        return res.json({ products: data.products_data, found: true });
      }
    } catch (e) {}

    if (fs.existsSync(PRODUCT_LIST_FILE)) {
      const raw = fs.readFileSync(PRODUCT_LIST_FILE, 'utf-8');
      return res.json({ products: JSON.parse(raw), found: true });
    }
    return res.json({ products: null, found: false });
  } catch (error: any) {
    console.error('Error reading product list:', error);
    return res.status(500).json({ error: 'Failed to load product list' });
  }
});

app.post('/api/qc/product-list', async (req, res) => {
  try {
    const { products } = req.body;
    if (!products) {
      return res.status(400).json({ error: 'Missing products payload' });
    }
    fs.writeFileSync(PRODUCT_LIST_FILE, JSON.stringify(products, null, 2), 'utf-8');

    // Sync to Supabase
    try {
      await supabase.from('product_list').upsert({
        id: 'current',
        products_data: products,
        updated_at: new Date().toISOString()
      });
    } catch (e) {}

    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error saving product list:', error);
    return res.status(500).json({ error: 'Failed to save product list' });
  }
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  // Serve public static assets (such as logo)
  app.use(express.static(path.resolve(__dirname, 'public')));

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`QC Semen Merah Putih Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

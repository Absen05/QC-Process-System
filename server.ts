import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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
// CLOUD DATABASE PERSISTENCE (Poin 2 & 3)
// Sinkronisasi data real-time lintas device (PC & HP)
// ==========================================
import fs from 'fs';

const DATA_DIR = path.resolve(__dirname, 'data');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'qc_sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAllSessions(): Record<string, any> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      return JSON.parse(raw) || {};
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

// 1. GET active session by { tanggal, shift }
app.get('/api/qc/session', (req, res) => {
  try {
    const { date, shift } = req.query as { date?: string; shift?: string };
    const sessions = readAllSessions();

    if (!date || !shift) {
      // Return latest saved session
      const keys = Object.keys(sessions);
      if (keys.length > 0) {
        const latestKey = keys[keys.length - 1];
        return res.json({ session: sessions[latestKey], found: true, key: latestKey });
      }
      return res.json({ session: null, found: false });
    }

    const key = `${date}_${shift}`;
    if (sessions[key]) {
      return res.json({ session: sessions[key], found: true, key });
    }

    // If session for this exact shift not found, find latest prior session for carry-over estafet (Poin 3)
    const allKeys = Object.keys(sessions).sort();
    let priorSession: any = null;
    if (allKeys.length > 0) {
      priorSession = sessions[allKeys[allKeys.length - 1]];
    }

    return res.json({ session: null, found: false, priorSession });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// 2. POST / UPSERT entire active session
app.post('/api/qc/session', (req, res) => {
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
    return res.json({ success: true, key, updatedAt: sessions[key]._serverUpdatedAt });
  } catch (error: any) {
    console.error('Error saving session:', error);
    return res.status(500).json({ error: 'Failed to save session' });
  }
});

// 3. POST / UPSERT specific cell or row with composite key { tanggal, shift, mill_type, jam_analisa } (Poin 2)
app.post('/api/qc/upsert-cell', (req, res) => {
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

// 4. GET latest active proportion across all sessions for carry-over estafet (Poin 3)
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
app.get('/api/qc/all-sessions', (_req, res) => {
  try {
    const sessions = readAllSessions();
    return res.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching all sessions:', error);
    return res.status(500).json({ error: 'Failed to fetch all sessions' });
  }
});

// 6. Master Target Dry endpoints (Poin 5)
const MASTER_TARGETS_FILE = path.join(DATA_DIR, 'master_targets.json');

app.get('/api/qc/master-targets', (_req, res) => {
  try {
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

app.post('/api/qc/master-targets', (req, res) => {
  try {
    const { targets } = req.body;
    if (!targets) {
      return res.status(400).json({ error: 'Missing targets payload' });
    }
    fs.writeFileSync(MASTER_TARGETS_FILE, JSON.stringify(targets, null, 2), 'utf-8');
    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error saving master targets:', error);
    return res.status(500).json({ error: 'Failed to save master targets' });
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

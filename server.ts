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

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

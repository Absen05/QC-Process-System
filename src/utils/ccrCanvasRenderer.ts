import { formatIndonesianDate } from './qcCalculations';
import { MaterialPropItem } from '../types/qc';

export interface CcrRenderData {
  date: string;
  shiftName: string;
  appliedHour: string;
  millCode: 'TM' | 'VRM';
  millType: string;
  productType: string;
  siloName: string;
  admixtureName: string;
  admixturePpm: number;
  analystName: string;
  materials: {
    clinker: MaterialPropItem;
    gypsum: MaterialPropItem;
    limestone: MaterialPropItem;
    trass: MaterialPropItem;
    flyAsh: MaterialPropItem;
  };
  dryTotal: number;
  wetTotal: number;
}

/**
 * High-performance, 100% reliable HTML5 Canvas renderer for CCR Proportion Instructions.
 * Completely immune to html2canvas "oklch" CSS parsing errors and CORS taint.
 */
export async function renderCcrImage(data: CcrRenderData): Promise<string> {
  const scale = 2; // High DPI for retina / WhatsApp zoom
  const width = 640;
  const height = 660;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Red top accent bar
  ctx.fillStyle = '#E31E24';
  ctx.fillRect(0, 0, width, 5);

  // Try to load logo or draw fallback
  let logoDrawn = false;
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = 'https://cms.semenmerahputih.com/storage/5187/responsive-images/Logo_Semen_Merah_Putih-1___converted_1684_489.webp';
    await new Promise((resolve) => {
      logoImg.onload = () => {
        try {
          ctx.drawImage(logoImg, 24, 20, 140, 40);
          logoDrawn = true;
        } catch {
          logoDrawn = false;
        }
        resolve(true);
      };
      logoImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 800); // 800ms timeout
    });
  } catch {
    logoDrawn = false;
  }

  if (!logoDrawn) {
    // Stylized Semen Merah Putih typographic logo
    ctx.fillStyle = '#E31E24';
    ctx.fillRect(24, 22, 10, 32);
    ctx.fillStyle = '#111827';
    ctx.fillRect(36, 22, 10, 32);

    ctx.fillStyle = '#E31E24';
    ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('SEMEN', 54, 36);
    ctx.fillStyle = '#111827';
    ctx.fillText('MERAH PUTIH', 54, 52);
  }

  // Header Title on Right
  ctx.textAlign = 'right';
  ctx.fillStyle = '#E31E24';
  ctx.font = 'bold 15px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`SETTING PROPORSI CCR - ${data.millCode}`, width - 24, 34);

  ctx.fillStyle = '#6B7280';
  ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Grinding Plant Ciwandan · PT Cemindo Gemilang Tbk', width - 24, 50);

  // Divider line
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 72);
  ctx.lineTo(width - 24, 72);
  ctx.stroke();

  // Info Box (Background)
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(24, 84, width - 48, 54);
  ctx.strokeStyle = '#E5E7EB';
  ctx.strokeRect(24, 84, width - 48, 54);

  // Info Box Content
  ctx.textAlign = 'left';
  ctx.font = '400 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Tanggal:', 36, 104);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(formatIndonesianDate(data.date), 88, 104);

  ctx.font = '400 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Shift:', 36, 124);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${data.shiftName} (${data.appliedHour} WIB)`, 88, 124);

  ctx.font = '400 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Unit Mill:', 320, 104);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${data.millCode} (${data.millType})`, 380, 104);

  ctx.font = '400 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Produk:', 320, 124);
  ctx.fillStyle = '#0284C7';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${data.productType} (${data.siloName})`, 380, 124);

  // Table Setup
  const tableX = 24;
  const tableY = 152;
  const tableW = width - 48;
  const colW = [140, 120, 132, tableW - (140 + 120 + 132)]; // 4 columns
  const rowH = 34;

  // Table Header Backgrounds
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(tableX, tableY, tableW, rowH);

  // Tint for Set Wet column header
  ctx.fillStyle = '#DCFCE7';
  ctx.fillRect(tableX + colW[0] + colW[1] + colW[2], tableY, colW[3], rowH);

  // Table Outer & Header Grid
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1;
  ctx.strokeRect(tableX, tableY, tableW, rowH * 7);

  // Header Text
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Raw Material', tableX + 12, tableY + 21);

  ctx.textAlign = 'right';
  ctx.fillText('Target Dry (%)', tableX + colW[0] + colW[1] - 12, tableY + 21);
  ctx.fillText('Moisture H2O (%)', tableX + colW[0] + colW[1] + colW[2] - 12, tableY + 21);

  ctx.fillStyle = '#15803D';
  ctx.fillText('SET WET (%)', tableX + tableW - 12, tableY + 21);

  // Table Rows Data
  const rows = [
    { name: 'Clinker', dry: data.materials.clinker.dry, h2o: data.materials.clinker.h2o, wet: data.materials.clinker.wet },
    { name: 'Gypsum', dry: data.materials.gypsum.dry, h2o: data.materials.gypsum.h2o, wet: data.materials.gypsum.wet },
    { name: 'Limestone', dry: data.materials.limestone.dry, h2o: data.materials.limestone.h2o, wet: data.materials.limestone.wet },
    { name: 'Trass', dry: data.materials.trass.dry, h2o: data.materials.trass.h2o, wet: data.materials.trass.wet },
    { name: 'Fly Ash', dry: data.materials.flyAsh.dry, h2o: data.materials.flyAsh.h2o, wet: data.materials.flyAsh.wet },
  ];

  rows.forEach((r, idx) => {
    const curY = tableY + rowH * (idx + 1);

    // Row divider
    ctx.strokeStyle = '#E5E7EB';
    ctx.beginPath();
    ctx.moveTo(tableX, curY);
    ctx.lineTo(tableX + tableW, curY);
    ctx.stroke();

    // Set Wet Column highlight background
    ctx.fillStyle = '#F0FDF4';
    ctx.fillRect(tableX + colW[0] + colW[1] + colW[2], curY, colW[3], rowH);

    // Material Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(r.name, tableX + 12, curY + 21);

    // Dry %
    ctx.textAlign = 'right';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#374151';
    ctx.fillText(`${r.dry.toFixed(1)}%`, tableX + colW[0] + colW[1] - 12, curY + 21);

    // H2O %
    ctx.fillText(`${r.h2o.toFixed(2)}%`, tableX + colW[0] + colW[1] + colW[2] - 12, curY + 21);

    // Wet %
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#111827';
    ctx.fillText(`${r.wet.toFixed(1)}%`, tableX + tableW - 12, curY + 21);
  });

  // Total Row
  const totalY = tableY + rowH * 6;
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(tableX, totalY, tableW, rowH);

  // Total Set Wet Column Badge
  ctx.fillStyle = '#DCFCE7';
  ctx.fillRect(tableX + colW[0] + colW[1] + colW[2], totalY, colW[3], rowH);

  // Top border of total row
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tableX, totalY);
  ctx.lineTo(tableX + tableW, totalY);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#111827';
  ctx.fillText('TOTAL PROPORSI', tableX + 12, totalY + 21);

  ctx.textAlign = 'right';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#16A34A';
  ctx.fillText(`${data.dryTotal.toFixed(1)}%`, tableX + colW[0] + colW[1] - 12, totalY + 21);

  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('-', tableX + colW[0] + colW[1] + colW[2] - 12, totalY + 21);

  ctx.fillStyle = '#15803D';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText(`${data.wetTotal.toFixed(1)}%`, tableX + tableW - 12, totalY + 21);

  // Column vertical lines
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  const colLines = [
    tableX + colW[0],
    tableX + colW[0] + colW[1],
    tableX + colW[0] + colW[1] + colW[2],
  ];
  colLines.forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, tableY);
    ctx.lineTo(x, tableY + rowH * 7);
    ctx.stroke();
  });

  // Admixture & Analyst Signature Box
  const metaBoxY = tableY + rowH * 7 + 16;
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(tableX, metaBoxY, tableW, 46);
  ctx.strokeStyle = '#E5E7EB';
  ctx.strokeRect(tableX, metaBoxY, tableW, 46);

  ctx.textAlign = 'left';
  ctx.font = '400 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Admixture Terpasang:', tableX + 12, metaBoxY + 27);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${data.admixtureName} (${data.admixturePpm} PPM)`, tableX + 130, metaBoxY + 27);

  ctx.textAlign = 'right';
  ctx.font = '400 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Analis QC:', tableX + tableW - 140, metaBoxY + 27);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(data.analystName, tableX + tableW - 12, metaBoxY + 27);

  // Footer Note
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '400 10px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('QC Process Management System · PT Cemindo Gemilang Tbk (Semen Merah Putih)', width / 2, height - 16);

  return canvas.toDataURL('image/png');
}

/**
 * Pure binary DataURL to Blob converter (Zero window.fetch dependency)
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/png';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

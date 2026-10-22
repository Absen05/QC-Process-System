import { formatIndonesianDate, formatIndonesianDateTitleCase } from './qcCalculations';
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
  totalMassaBasah?: number;
  airMenguap?: number;
  opcWarning?: string;
  targetQualitySummary?: string;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * High-performance, pixel-perfect HTML5 Canvas renderer for CCR Feeder Setpoint.
 * 100% compliant with Plant Reference structure:
 * - Outer soft gray background (#F3F4F6)
 * - Bagian 1: Card Header (White, Logo left, QC CIWANDAN / Title / Date real-time right)
 * - Bagian 2: Card Utama "HASIL SETPOINT FEEDER" (5 Kolom: MATERIAL, %DRY, MOIST, W BASAH, %WET badge, 2 Kotak Summary)
 * - Bagian 3: Footer luar "Quality Control Plant Ciwandan • PT Cemindo Gemilang"
 */
export async function renderCcrImage(data: CcrRenderData): Promise<string> {
  const scale = 2; // 2x Retina resolution
  const width = 640;

  // Active Material Items - Filter material non-aktif / 0.0% (Poin 2)
  const activeItems: { name: string; dry: number; h2o: number; wBasah: number; wet: number }[] = [];
  const rawList = [
    { name: 'CLINKER', item: data.materials.clinker },
    { name: 'GYPSUM', item: data.materials.gypsum },
    { name: 'LIMESTONE', item: data.materials.limestone },
    { name: 'TRASS', item: data.materials.trass },
    { name: 'FLY ASH', item: data.materials.flyAsh },
  ];

  let sumWBasah = 0;
  rawList.forEach(r => {
    if (r.item.dry > 0) {
      const dry = r.item.dry;
      const h2o = r.item.h2o;
      const wBasah = r.item.wBasah ?? (dry > 0 ? (dry / (1 - (h2o / 100))) : 0);
      sumWBasah += wBasah;

      activeItems.push({
        name: r.name,
        dry: r.item.dry,
        h2o: r.item.h2o,
        wBasah: Number(wBasah.toFixed(1)),
        wet: r.item.wet,
      });
    }
  });

  const totalWBasahFormatted = (data.totalMassaBasah ?? sumWBasah).toFixed(1);
  const airMenguap = (data.airMenguap ?? Math.max(0, (data.totalMassaBasah ?? sumWBasah) - 100.0)).toFixed(1);

  const rowH = 32;
  const sumBoxH = 68;
  const totalRowsCount = activeItems.length + 2; // header + active items + total
  const tableH = totalRowsCount * rowH;
  const hasTargetQuality = Boolean(data.targetQualitySummary);
  const targetQualityH = hasTargetQuality ? 32 : 0;
  const mainCardH = 58 + targetQualityH + tableH + 14 + sumBoxH + 20;

  const pad = 20;
  const headerCardY = pad;
  const headerCardH = 80;
  const mainCardY = headerCardY + headerCardH + 12;
  const height = mainCardY + mainCardH + 34;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.scale(scale, scale);

  // 1. Latar Luar Canvas Gambar: Abu-abu lembut (#F3F4F6)
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, 0, width, height);

  const cardW = width - pad * 2;

  // ==========================================
  // BAGIAN 1: Card Header (Kotak Atas)
  // ==========================================
  drawRoundedRect(ctx, pad, headerCardY, cardW, headerCardH, 12);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Logo Semen Merah Putih (Sisi Kiri)
  let logoDrawn = false;
  try {
    const logoImg = new Image();
    // Try local public logo first (same origin, never taints canvas)
    logoImg.src = '/logo_semen_merah_putih.webp';
    await new Promise((resolve) => {
      logoImg.onload = () => {
        try {
          ctx.drawImage(logoImg, pad + 16, headerCardY + 16, 148, 48);
          logoDrawn = true;
        } catch {
          logoDrawn = false;
        }
        resolve(true);
      };
      logoImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 500);
    });
  } catch {
    logoDrawn = false;
  }

  if (!logoDrawn) {
    // Stylized typographic brand logo fallback
    ctx.fillStyle = '#E31E24';
    ctx.fillRect(pad + 18, headerCardY + 20, 10, 40);
    ctx.fillStyle = '#111827';
    ctx.fillRect(pad + 32, headerCardY + 20, 10, 40);

    ctx.fillStyle = '#E31E24';
    ctx.font = 'bold 15px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('SEMEN', pad + 50, headerCardY + 38);
    ctx.fillStyle = '#111827';
    ctx.fillText('MERAH PUTIH', pad + 50, headerCardY + 54);
  }

  // Sisi Kanan (Teks Berjenjang)
  ctx.textAlign = 'right';

  // 1. Teks kecil merah kapital tebal: QC CIWANDAN
  ctx.fillStyle = '#E31E24';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('QC CIWANDAN', pad + cardW - 18, headerCardY + 25);

  // 2. Judul utama hitam tebal: Proporsi [Nama Produk] - [TM / VRM]
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 15px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`Proporsi ${data.productType} - ${data.millCode}`, pad + cardW - 18, headerCardY + 45);

  // 3. Sub-teks abu-abu: [DD MMMM YYYY, HH:mm WIB] (Format waktu Indonesia, real-time saat gambar digenerate)
  const now = new Date();
  const dateStr = formatIndonesianDateTitleCase(data.date);
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  ctx.fillStyle = '#64748B';
  ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${dateStr}, ${timeStr} WIB`, pad + cardW - 18, headerCardY + 63);

  // ==========================================
  // BAGIAN 2: Card Utama "HASIL SETPOINT FEEDER"
  // ==========================================
  drawRoundedRect(ctx, pad, mainCardY, cardW, mainCardH, 12);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header Card Utama: Kiri Atas
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('HASIL SETPOINT FEEDER', pad + 18, mainCardY + 28);

  ctx.fillStyle = '#64748B';
  ctx.font = '400 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Input manual nilai %Wet ke feeder CCR', pad + 18, mainCardY + 44);

  // Header Card Utama: Kanan Atas Badge "WET BASE"
  const badgeW = 86;
  const badgeH = 24;
  const badgeX = pad + cardW - 18 - badgeW;
  const badgeY = mainCardY + 18;

  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
  ctx.fillStyle = '#FEF2F2'; // bg-red-50
  ctx.fill();
  ctx.strokeStyle = '#FECACA';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#E31E24';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WET BASE', badgeX + badgeW / 2, badgeY + 16);

  // ==========================================
  // Badge Target Quality (Poin I.D.2)
  // ==========================================
  if (data.targetQualitySummary) {
    const tqY = mainCardY + 54;
    const tqW = cardW - 36;
    drawRoundedRect(ctx, pad + 18, tqY, tqW, 24, 6);
    ctx.fillStyle = '#EFF6FF'; // bg-blue-50
    ctx.fill();
    ctx.strokeStyle = '#BAE6FD'; // border-sky-300
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0369A1'; // text-sky-700
    ctx.font = 'bold 10px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`TARGET QUALITY: ${data.targetQualitySummary}`, pad + 28, tqY + 16);
  }

  // ==========================================
  // Tabel Kalkulasi Proporsi (5 Kolom)
  // MATERIAL | %DRY | MOIST | W BASAH | %WET
  // ==========================================
  const tableX = pad + 18;
  const tableY = mainCardY + 58 + targetQualityH;
  const tableW = cardW - 36;
  const colW = [124, 100, 100, 120, tableW - (124 + 100 + 100 + 120)];

  // Table Outer Frame
  drawRoundedRect(ctx, tableX, tableY, tableW, tableH, 8);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Table Header Background (#F3F4F6)
  ctx.save();
  ctx.clip(); // clip to table rounded rect
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(tableX, tableY, tableW, rowH);

  // Table Header Labels
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MATERIAL', tableX + 12, tableY + 20);

  ctx.textAlign = 'right';
  ctx.fillText('%DRY', tableX + colW[0] + colW[1] - 12, tableY + 20);
  ctx.fillText('MOIST', tableX + colW[0] + colW[1] + colW[2] - 12, tableY + 20);
  ctx.fillText('W BASAH', tableX + colW[0] + colW[1] + colW[2] + colW[3] - 12, tableY + 20);
  ctx.fillText('%WET', tableX + tableW - 16, tableY + 20);

  // Table Rows (Dividers)
  activeItems.forEach((item, idx) => {
    const curY = tableY + rowH * (idx + 1);

    // Row divider
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, curY);
    ctx.lineTo(tableX + tableW, curY);
    ctx.stroke();

    // Material Name (Column 1)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(item.name, tableX + 12, curY + 20);

    // %DRY (Column 2)
    ctx.textAlign = 'right';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(`${item.dry.toFixed(1)}%`, tableX + colW[0] + colW[1] - 12, curY + 20);

    // MOIST (Column 3)
    ctx.fillText(`${item.h2o.toFixed(1)}%`, tableX + colW[0] + colW[1] + colW[2] - 12, curY + 20);

    // W BASAH (Column 4 - Poin 3: konsisten 1 angka desimal)
    ctx.fillStyle = '#0F172A';
    ctx.fillText(`${item.wBasah.toFixed(1)}`, tableX + colW[0] + colW[1] + colW[2] + colW[3] - 12, curY + 20);

    // %WET Badge (Column 5 - Pink Badge bg-red-50 text-red #E31E24)
    const wetBadgeW = 74;
    const wetBadgeH = 22;
    const wetBadgeX = tableX + tableW - wetBadgeW - 8;
    const wetBadgeY = curY + 5;

    drawRoundedRect(ctx, wetBadgeX, wetBadgeY, wetBadgeW, wetBadgeH, 4);
    ctx.fillStyle = '#FEF2F2';
    ctx.fill();
    ctx.strokeStyle = '#FECACA';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#E31E24';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(`${item.wet.toFixed(1)}%`, wetBadgeX + wetBadgeW / 2, wetBadgeY + 15);
  });

  // Baris TOTAL
  const totalY = tableY + rowH * (activeItems.length + 1);

  // Background for total row (#F8FAFC)
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(tableX, totalY, tableW, rowH);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tableX, totalY);
  ctx.lineTo(tableX + tableW, totalY);
  ctx.stroke();

  // TOTAL: Material
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('TOTAL', tableX + 12, totalY + 20);

  // TOTAL: %DRY = 100.0%
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#16A34A';
  ctx.fillText('100.0%', tableX + colW[0] + colW[1] - 12, totalY + 20);

  // TOTAL: MOIST = —
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('—', tableX + colW[0] + colW[1] + colW[2] - 12, totalY + 20);

  // TOTAL: W BASAH = [Total W BASAH] t/h
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`${totalWBasahFormatted} t/h`, tableX + colW[0] + colW[1] + colW[2] + colW[3] - 12, totalY + 20);

  // TOTAL: %WET Badge = 100.0%
  const totalBadgeW = 74;
  const totalBadgeH = 22;
  const totalBadgeX = tableX + tableW - totalBadgeW - 8;
  const totalBadgeY = totalY + 5;

  drawRoundedRect(ctx, totalBadgeX, totalBadgeY, totalBadgeW, totalBadgeH, 4);
  ctx.fillStyle = '#FEE2E2';
  ctx.fill();
  ctx.strokeStyle = '#FCA5A5';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#E31E24';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText('100.0%', totalBadgeX + totalBadgeW / 2, totalBadgeY + 15);

  ctx.restore(); // restore clipping

  // ==========================================
  // 2 Kotak Summary di Bawah Tabel
  // (Total Massa Basah & Air Menguap)
  // ==========================================
  const sumBoxesY = tableY + rowH * totalRowsCount + 12;
  const sumBoxW = (tableW - 12) / 2;

  // Kotak Kiri: Total Massa Basah
  drawRoundedRect(ctx, tableX, sumBoxesY, sumBoxW, sumBoxH, 10);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Total Massa Basah', tableX + 14, sumBoxesY + 18);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillText(`${totalWBasahFormatted} ton/jam`, tableX + 14, sumBoxesY + 41);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '400 10px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Feeder mill input', tableX + 14, sumBoxesY + 58);

  // Kotak Kanan: Air Menguap (Mill)
  const boxRightX = tableX + sumBoxW + 12;
  drawRoundedRect(ctx, boxRightX, sumBoxesY, sumBoxW, sumBoxH, 10);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Air Menguap (Mill)', boxRightX + 14, sumBoxesY + 18);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillText(`${airMenguap} ton/jam`, boxRightX + 14, sumBoxesY + 41);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '400 10px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Uap air cerobong', boxRightX + 14, sumBoxesY + 58);

  // ==========================================
  // BAGIAN 3: Footer Gambar
  // ==========================================
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 10px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Quality Control Plant Ciwandan • PT Cemindo Gemilang', width / 2, height - 12);

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

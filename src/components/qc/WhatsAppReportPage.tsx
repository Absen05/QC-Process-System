import React, { useState } from 'react';
import { ShiftSession } from '../../types/qc';
import { generateWhatsAppReport } from '../../utils/qcCalculations';
import { Copy, Check, MessageSquare, ExternalLink } from 'lucide-react';

interface WhatsAppReportPageProps {
  session: ShiftSession;
}

export const WhatsAppReportPage: React.FC<WhatsAppReportPageProps> = ({ session }) => {
  const [copied, setCopied] = useState(false);

  // Real-time generated WhatsApp report text with Target Dry formulations & TPH
  const reportText = generateWhatsAppReport(session);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(reportText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-4 font-sans">

      {/* Top Header & Big Copy Button */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#16A34A] text-white">
              <MessageSquare className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase">
              LAPORAN AKHIR SHIFT (WHATSAPP)
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {session.shiftName} ({session.shiftHours}) · Analis: <strong>{session.analystName}</strong>
          </p>
        </div>

        {/* Big Solid Green Copy Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-6 py-3 text-sm font-bold text-white bg-[#16A34A] hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                <span>LAPORAN TERSALIN!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>COPY REPORT WA</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-4 py-3 text-xs font-bold text-white bg-[#0284C7] hover:bg-sky-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
            title="Buka langsung ke WhatsApp Web / App"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Kirim WA</span>
          </button>
        </div>
      </div>

      {/* Direct Copy-Paste Text Area (Poin 6: Tanpa Modal Berbelit) */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
        
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Kotak Teks Real-Time (Siap Salin & Kirim Langsung):
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {reportText.length} karakter
          </span>
        </div>

        {/* Scaled Textarea with monospace font and high readability */}
        <textarea
          readOnly
          value={reportText}
          rows={18}
          className="w-full p-4 bg-slate-50 border-2 border-slate-400 rounded-xl font-mono text-xs sm:text-sm text-slate-900 leading-relaxed resize-none focus:outline-none focus:bg-white select-all shadow-inner"
        />

        {/* Bottom Big Copy Button for frictionless mobile/desktop usage */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 font-mono">
            *Tekan tombol untuk otomatis menyalin ke clipboard, lalu paste (Ctrl+V) ke grup koordinasi CCR.
          </p>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-[#16A34A] hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                <span>LAPORAN TERSALIN!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>📋 COPY REPORT WA</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};

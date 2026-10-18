import React, { useState } from 'react';
import { ShiftSession } from '../../types/qc';
import { generateWhatsAppReport } from '../../utils/qcCalculations';
import { Copy, Check, ExternalLink, FileText } from 'lucide-react';

interface WhatsAppReportPageProps {
  session: ShiftSession;
}

export const WhatsAppReportPage: React.FC<WhatsAppReportPageProps> = ({ session }) => {
  const [copied, setCopied] = useState(false);

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
    <div className="space-y-4">

      {/* Top Header & Copy Action */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900">
            LAPORAN AKHIR SHIFT (WHATSAPP)
          </h2>
          <p className="text-xs text-gray-500 font-mono">
            {session.shiftName} ({session.shiftHours}) · Dual-Mill & Unified Incoming
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Laporan WA</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="px-3.5 py-2 text-xs font-bold text-[#0284C7] bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Kirim WA</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Message Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* WhatsApp Chat Simulation */}
        <div className="lg:col-span-2 bg-[#EFEAE2] border border-gray-300 rounded-xl p-4 sm:p-5 shadow-xs overflow-hidden">
          <div className="bg-white rounded-lg p-4 shadow-xs border border-gray-200 max-w-2xl mx-auto">
            <div className="whitespace-pre-wrap font-mono text-xs sm:text-[13px] text-gray-900 leading-relaxed select-all">
              {reportText}
            </div>
            <div className="text-right text-[10px] text-gray-400 mt-2 font-mono">
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ✓✓
            </div>
          </div>
        </div>

        {/* Raw Text Box */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Teks Format Mentah</span>
            </div>
            <p className="text-[11px] text-gray-500">
              Dapat diedit langsung sebelum dikirim bila ada catatan lapangan khusus.
            </p>
          </div>

          <textarea
            readOnly
            rows={18}
            value={reportText}
            className="w-full p-2.5 font-mono text-[11px] text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16A34A] resize-none"
          />

          <button
            onClick={handleCopy}
            className="w-full py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Tersalin!' : 'Salin Laporan'}</span>
          </button>
        </div>

      </div>

    </div>
  );
};

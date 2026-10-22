import React, { useState, useEffect, useMemo } from 'react';
import { ShiftSession, ProductQualitySpec } from '../../types/qc';
import { getStoredArchives, getStoredQualitySpecs, getStoredProductList } from '../../services/qcStorage';
import { 
  TrendingUp, 
  Calendar, 
  Factory, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react';
import { formatIndonesianDate } from '../../utils/qcCalculations';

interface DataPoint {
  id: string;
  date: string;
  shift: string;
  hour: string;
  millCode: 'TM' | 'VRM';
  product: string;
  blaine: number | null;
  so3: number | null;
  residuR45: number | null;
  timestamp: string;
}

interface RunChartProps {
  title: string;
  unit: string;
  data: { point: DataPoint; val: number }[];
  lsl: number | null;
  usl: number | null;
  target: number | null;
  decimalPlaces?: number;
  accentColor?: string;
}

const RunChart: React.FC<RunChartProps> = ({
  title,
  unit,
  data,
  lsl,
  usl,
  target,
  decimalPlaces = 1,
  accentColor = '#0284C7',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ point: DataPoint; val: number; x: number; y: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6 text-center shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 mb-1">{title} ({unit})</h4>
        <p className="text-xs text-slate-400 font-mono">Belum ada data input pada rentang filter ini.</p>
      </div>
    );
  }

  // Calculate statistics
  const values = data.map(d => d.val);
  const count = values.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = sum / count;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const variance = count > 1 ? values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (count - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // In-spec calculation
  const inSpecCount = values.filter(v => {
    const passLsl = lsl === null || v >= lsl - 0.001;
    const passUsl = usl === null || v <= usl + 0.001;
    return passLsl && passUsl;
  }).length;
  const inSpecPercent = count > 0 ? (inSpecCount / count) * 100 : 100;

  // Chart dimensions & coordinates
  const svgWidth = 860;
  const svgHeight = 220;
  const padLeft = 60;
  const padRight = 75;
  const padTop = 28;
  const padBottom = 34;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Domain Min & Max for Y axis
  const allYVals = [...values];
  if (lsl !== null) allYVals.push(lsl);
  if (usl !== null) allYVals.push(usl);
  if (target !== null) allYVals.push(target);

  const rawYMin = Math.min(...allYVals);
  const rawYMax = Math.max(...allYVals);
  const ySpan = Math.max(rawYMax - rawYMin, 0.5);
  const yMin = rawYMin - ySpan * 0.12;
  const yMax = rawYMax + ySpan * 0.12;

  const getY = (val: number) => {
    return padTop + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
  };

  const getX = (idx: number) => {
    if (data.length <= 1) return padLeft + chartW / 2;
    return padLeft + (idx / (data.length - 1)) * chartW;
  };

  const pointsString = data
    .map((d, idx) => `${getX(idx).toFixed(1)},${getY(d.val).toFixed(1)}`)
    .join(' ');

  return (
    <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm space-y-3">
      {/* Chart Header & Statistical KPI Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              {title}
            </h4>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-bold">
              {unit}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
            {lsl !== null && <span>LSL: <strong className="text-red-700">{lsl.toFixed(decimalPlaces)}</strong></span>}
            {target !== null && <span>• STD: <strong className="text-emerald-700">{target.toFixed(decimalPlaces)}</strong></span>}
            {usl !== null && <span>• USL: <strong className="text-red-700">{usl.toFixed(decimalPlaces)}</strong></span>}
          </div>
        </div>

        {/* 4 Mini KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg">
            <div className="text-[10px] text-slate-500 leading-tight">RATA-RATA</div>
            <div className="font-bold text-slate-900 text-xs mt-0.5">{avg.toFixed(decimalPlaces)}</div>
          </div>
          <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg">
            <div className="text-[10px] text-slate-500 leading-tight">STD DEV (σ)</div>
            <div className="font-bold text-slate-900 text-xs mt-0.5">{stdDev.toFixed(decimalPlaces + 1)}</div>
          </div>
          <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg">
            <div className="text-[10px] text-slate-500 leading-tight">MIN / MAX</div>
            <div className="font-bold text-slate-900 text-xs mt-0.5">{minVal.toFixed(decimalPlaces)} - {maxVal.toFixed(decimalPlaces)}</div>
          </div>
          <div className={`px-2.5 py-1.5 border rounded-lg ${
            inSpecPercent >= 90 ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-red-50 border-red-400 text-red-900'
          }`}>
            <div className="text-[10px] leading-tight font-sans font-semibold">% IN-SPEC</div>
            <div className="font-bold text-xs mt-0.5">{inSpecPercent.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative overflow-x-auto select-none">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto min-w-[620px] max-h-[220px]"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Background Grid */}
          <rect x={padLeft} y={padTop} width={chartW} height={chartH} fill="#F8FAFC" rx="4" />
          
          {/* Subtle horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padTop + chartH * pct;
            const gridVal = yMax - pct * (yMax - yMin);
            return (
              <g key={i}>
                <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#E2E8F0" strokeWidth="1" />
                <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8" fontFamily="monospace">
                  {gridVal.toFixed(decimalPlaces)}
                </text>
              </g>
            );
          })}

          {/* USL Line (Batas Atas: Garis Merah Putus-putus) */}
          {usl !== null && (
            <g>
              <line
                x1={padLeft}
                y1={getY(usl)}
                x2={padLeft + chartW}
                y2={getY(usl)}
                stroke="#DC2626"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <rect x={padLeft + chartW + 4} y={getY(usl) - 8} width="64" height="16" fill="#FEE2E2" rx="3" stroke="#DC2626" strokeWidth="0.8" />
              <text x={padLeft + chartW + 8} y={getY(usl) + 3} fontSize="9" fill="#B91C1C" fontWeight="bold" fontFamily="monospace">
                USL {usl.toFixed(decimalPlaces)}
              </text>
            </g>
          )}

          {/* Target / Standard Line (Garis Hijau) */}
          {target !== null && (
            <g>
              <line
                x1={padLeft}
                y1={getY(target)}
                x2={padLeft + chartW}
                y2={getY(target)}
                stroke="#16A34A"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <rect x={padLeft + chartW + 4} y={getY(target) - 8} width="64" height="16" fill="#DCFCE7" rx="3" stroke="#16A34A" strokeWidth="0.8" />
              <text x={padLeft + chartW + 8} y={getY(target) + 3} fontSize="9" fill="#15803D" fontWeight="bold" fontFamily="monospace">
                STD {target.toFixed(decimalPlaces)}
              </text>
            </g>
          )}

          {/* LSL Line (Batas Bawah: Garis Merah Putus-putus) */}
          {lsl !== null && (
            <g>
              <line
                x1={padLeft}
                y1={getY(lsl)}
                x2={padLeft + chartW}
                y2={getY(lsl)}
                stroke="#DC2626"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <rect x={padLeft + chartW + 4} y={getY(lsl) - 8} width="64" height="16" fill="#FEE2E2" rx="3" stroke="#DC2626" strokeWidth="0.8" />
              <text x={padLeft + chartW + 8} y={getY(lsl) + 3} fontSize="9" fill="#B91C1C" fontWeight="bold" fontFamily="monospace">
                LSL {lsl.toFixed(decimalPlaces)}
              </text>
            </g>
          )}

          {/* Connected Trend Line */}
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />
          )}

          {/* Data Points */}
          {data.map((d, idx) => {
            const cx = getX(idx);
            const cy = getY(d.val);
            const isOutOfSpec = (lsl !== null && d.val < lsl - 0.001) || (usl !== null && d.val > usl + 0.001);

            return (
              <g 
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ point: d.point, val: d.val, x: cx, y: cy })}
              >
                {/* Out-of-spec halo effect */}
                {isOutOfSpec && (
                  <circle cx={cx} cy={cy} r="8" fill="#FCA5A5" opacity="0.6" className="animate-ping" />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isOutOfSpec ? 5 : 4}
                  fill={isOutOfSpec ? '#DC2626' : accentColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {/* X Axis labels (Every nth point or shift mark) */}
          {data.map((d, idx) => {
            // Label every few points to avoid crowding
            const step = Math.ceil(data.length / 8);
            if (idx % step !== 0 && idx !== data.length - 1) return null;
            const cx = getX(idx);
            return (
              <text
                key={idx}
                x={cx}
                y={svgHeight - 12}
                textAnchor="middle"
                fontSize="9"
                fill="#64748B"
                fontFamily="monospace"
              >
                {d.point.hour} ({d.point.millCode})
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div 
            className="absolute z-10 pointer-events-none bg-slate-900 text-white p-2 rounded-lg text-[11px] font-mono shadow-xl border border-slate-700 leading-tight"
            style={{
              left: `${Math.min(Math.max(hoveredPoint.x - 60, 10), svgWidth - 140)}px`,
              top: `${Math.max(hoveredPoint.y - 70, 5)}px`
            }}
          >
            <div className="font-bold text-amber-300">
              {hoveredPoint.point.date} · {hoveredPoint.point.shift}
            </div>
            <div className="text-slate-300 mt-0.5">
              Jam: <strong>{hoveredPoint.point.hour}</strong> · Mesin: <strong>{hoveredPoint.point.millCode}</strong>
            </div>
            <div className="text-white mt-1 text-xs">
              Nilai: <strong className="text-cyan-300">{hoveredPoint.val.toFixed(decimalPlaces)} {unit}</strong>
            </div>
            <div className="text-[10px] mt-0.5">
              {(lsl !== null && hoveredPoint.val < lsl) || (usl !== null && hoveredPoint.val > usl) ? (
                <span className="text-red-400 font-bold">⚠️ OUT-OF-SPEC</span>
              ) : (
                <span className="text-emerald-400 font-bold">✓ IN-SPEC</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DashboardAnalitikPage: React.FC = () => {
  const [sessionsData, setSessionsData] = useState<Record<string, ShiftSession>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL');
  const [millFilter, setMillFilter] = useState<'ALL' | 'TM' | 'VRM'>('ALL');
  const [productFilter, setProductFilter] = useState<string>('ALL');

  const [qualitySpecs, setQualitySpecs] = useState<ProductQualitySpec[]>(() => getStoredQualitySpecs());
  const [productList, setProductList] = useState<string[]>(() => getStoredProductList());

  // Load all sessions from Supabase/Server
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qc/all-sessions');
      if (res.ok) {
        const json = await res.json();
        if (json.sessions && Object.keys(json.sessions).length > 0) {
          setSessionsData(json.sessions);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load from API, falling back to local archives:', e);
    }

    // Local fallback
    const local = getStoredArchives();
    setSessionsData(local);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    setQualitySpecs(getStoredQualitySpecs());
    setProductList(getStoredProductList());
  }, []);

  // Flatten and filter historical hourly rows
  const allPoints: DataPoint[] = useMemo(() => {
    const list: DataPoint[] = [];
    const now = new Date();

    const sortedKeys = Object.keys(sessionsData).sort((a, b) => {
      const sA = sessionsData[a];
      const sB = sessionsData[b];
      return (sA?.date || '').localeCompare(sB?.date || '');
    });

    for (const key of sortedKeys) {
      const sess = sessionsData[key];
      if (!sess || !sess.date) continue;

      // Date filtering
      if (dateFilter === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (sess.date !== todayStr) continue;
      } else if (dateFilter === '7D') {
        const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (new Date(sess.date) < past) continue;
      } else if (dateFilter === '30D') {
        const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (new Date(sess.date) < past) continue;
      }

      const processMill = (millCode: 'TM' | 'VRM', millData: any) => {
        if (!millData || !millData.hourlyRows) return;
        if (millFilter !== 'ALL' && millFilter !== millCode) return;
        if (productFilter !== 'ALL' && millData.productType !== productFilter) return;

        for (const row of millData.hourlyRows) {
          // If all critical parameters null, skip empty rows
          if (row.blaine === null && row.so3 === null && row.residuR45 === null) continue;

          list.push({
            id: `${sess.date}_${sess.shiftName}_${millCode}_${row.hour}`,
            date: sess.date,
            shift: sess.shiftName,
            hour: row.hour,
            millCode,
            product: millData.productType,
            blaine: typeof row.blaine === 'number' ? row.blaine : null,
            so3: typeof row.so3 === 'number' ? row.so3 : null,
            residuR45: typeof row.residuR45 === 'number' ? row.residuR45 : null,
            timestamp: `${sess.date} ${row.hour}`,
          });
        }
      };

      processMill('TM', sess.tm);
      processMill('VRM', sess.vrm);
    }

    return list;
  }, [sessionsData, dateFilter, millFilter, productFilter]);

  // Find reference spec for active selection
  const activeSpec = useMemo(() => {
    if (productFilter !== 'ALL') {
      const match = qualitySpecs.find(s => {
        const millMatches = !s.millType || s.millType === 'BOTH' || (millFilter !== 'ALL' && s.millType === millFilter);
        return millMatches && s.productType.toUpperCase() === productFilter.toUpperCase();
      });
      if (match) return match;
    }
    // Default to first PCC spec or general
    return qualitySpecs[0] || null;
  }, [qualitySpecs, productFilter, millFilter]);

  // Prepared series
  const blaineSeries = useMemo(() => {
    return allPoints
      .filter(p => p.blaine !== null)
      .map(p => ({ point: p, val: p.blaine as number }));
  }, [allPoints]);

  const so3Series = useMemo(() => {
    return allPoints
      .filter(p => p.so3 !== null)
      .map(p => ({ point: p, val: p.so3 as number }));
  }, [allPoints]);

  const r45Series = useMemo(() => {
    return allPoints
      .filter(p => p.residuR45 !== null)
      .map(p => ({ point: p, val: p.residuR45 as number }));
  }, [allPoints]);

  // Overall compliance summary
  const totalReadings = blaineSeries.length + so3Series.length + r45Series.length;
  const inSpecReadings = useMemo(() => {
    let count = 0;
    if (!activeSpec) return totalReadings;
    for (const b of blaineSeries) {
      if (b.val >= activeSpec.blaine.min && b.val <= activeSpec.blaine.max) count++;
    }
    for (const s of so3Series) {
      if (s.val >= activeSpec.so3.min && s.val <= activeSpec.so3.max) count++;
    }
    for (const r of r45Series) {
      if (r.val <= activeSpec.residuR45.max) count++;
    }
    return count;
  }, [blaineSeries, so3Series, r45Series, activeSpec, totalReadings]);

  const overallCompliancePercent = totalReadings > 0 ? (inSpecReadings / totalReadings) * 100 : 100;

  return (
    <div className="space-y-4 font-sans">
      
      {/* Top Banner: Dashboard Analitik & Tren Mutu (Khusus Dashboard SI) */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-400 flex items-center gap-1 font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Khusus Dashboard SI / QC Supervisor</span>
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Dashboard Analitik & Run Chart Tren Mutu
          </h2>
          <p className="text-xs text-slate-500">
            Pemantauan stabilitas parameter kritis (Blaine, SO3, Residu R45) terhadap batas spesifikasi USL / LSL dari database Supabase.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start md:self-auto px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Segarkan data historis dari Supabase"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Filter Control Bar: Tanggal, Mesin (TM/VRM/ALL), dan Produk */}
      <div className="bg-white border-2 border-slate-500 rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Filter Tanggal */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-lg p-1">
              <span className="text-slate-600 font-bold px-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Periode:
              </span>
              <button
                type="button"
                onClick={() => setDateFilter('ALL')}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  dateFilter === 'ALL' ? 'bg-[#E31E24] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('TODAY')}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  dateFilter === 'TODAY' ? 'bg-[#E31E24] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('7D')}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  dateFilter === '7D' ? 'bg-[#E31E24] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('30D')}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  dateFilter === '30D' ? 'bg-[#E31E24] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                30 Hari
              </button>
            </div>

            {/* Filter Mesin (TM / VRM / SEMUA) */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-lg p-1">
              <span className="text-slate-600 font-bold px-2 flex items-center gap-1">
                <Factory className="w-3.5 h-3.5 text-slate-500" />
                Mesin:
              </span>
              <button
                type="button"
                onClick={() => setMillFilter('ALL')}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  millFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setMillFilter('TM')}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  millFilter === 'TM' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                TM
              </button>
              <button
                type="button"
                onClick={() => setMillFilter('VRM')}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                  millFilter === 'VRM' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                VRM
              </button>
            </div>

            {/* Filter Jenis Produk */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg">
              <span className="text-slate-600 font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Produk:
              </span>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Produk Semen</option>
                {productList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Overall Compliance Header Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-mono text-xs shadow-2xs">
            <span className="text-slate-400">Total Sampel: <strong className="text-white">{allPoints.length}</strong></span>
            <span>•</span>
            <span className="text-slate-400">Kepatuhan Mutu: 
              <strong className={overallCompliancePercent >= 90 ? 'text-emerald-400 ml-1' : 'text-amber-400 ml-1'}>
                {overallCompliancePercent.toFixed(1)}%
              </strong>
            </span>
          </div>

        </div>
      </div>

      {/* 3 Interactive Run Charts: Blaine, SO3, Residu 45um */}
      <div className="space-y-4">
        {/* Run Chart 1: Blaine */}
        <RunChart
          title="Tren Kehalusan Blaine (Run Chart)"
          unit="cm²/gr"
          data={blaineSeries}
          lsl={activeSpec?.blaine.min ?? 3800}
          usl={activeSpec?.blaine.max ?? 4200}
          target={activeSpec?.blaine.std ?? 4000}
          decimalPlaces={0}
          accentColor="#0284C7"
        />

        {/* Run Chart 2: SO3 */}
        <RunChart
          title="Tren Kandungan Sulfur Trioksida SO3 (Run Chart)"
          unit="%"
          data={so3Series}
          lsl={activeSpec?.so3.min ?? 1.90}
          usl={activeSpec?.so3.max ?? 2.30}
          target={activeSpec?.so3.std ?? 2.10}
          decimalPlaces={2}
          accentColor="#16A34A"
        />

        {/* Run Chart 3: Residu 45um */}
        <RunChart
          title="Tren Residu Saringan 45 Mikron (Run Chart)"
          unit="%"
          data={r45Series}
          lsl={activeSpec?.residuR45.min ?? null}
          usl={activeSpec?.residuR45.max ?? 14.0}
          target={activeSpec?.residuR45.std ?? 11.0}
          decimalPlaces={1}
          accentColor="#E31E24"
        />
      </div>

    </div>
  );
};

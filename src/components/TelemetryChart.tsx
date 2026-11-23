import React, { useMemo, useState } from 'react';

export interface ChartSeries {
  id: string;
  label: string;
  unit: string;
  color: string;
  dashed?: boolean;
  values: number[];
}

interface TelemetryChartProps {
  title: string;
  subtitle?: string;
  timestamps: string[];
  series: ChartSeries[];
  minY: number;
  maxY: number;
  yUnit: string;
  referenceBands?: Array<{
    value: number;
    label: string;
    color: string;
  }>;
  height?: number;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  title,
  subtitle,
  timestamps,
  series,
  minY,
  maxY,
  yUnit,
  referenceBands = [],
  height = 240,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 760;
  const padLeft = 48;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const count = timestamps.length;
  const ySpan = Math.max(0.001, maxY - minY);

  const mapX = (idx: number) => {
    if (count <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (count - 1)) * plotW;
  };

  const mapY = (val: number) => {
    const clamped = Math.min(maxY, Math.max(minY, val));
    return padTop + plotH - ((clamped - minY) / ySpan) * plotH;
  };

  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = minY + (ySpan * i) / steps;
      return {
        val: Number(val.toFixed(ySpan < 5 ? 2 : 0)),
        y: mapY(val),
      };
    });
  }, [minY, maxY, ySpan]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (count === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const ratio = (relX - padLeft) / plotW;
    const idx = Math.round(ratio * (count - 1));
    if (idx >= 0 && idx < count) {
      setHoverIdx(idx);
    }
  };

  const activeIdx = hoverIdx !== null && hoverIdx < count ? hoverIdx : null;

  return (
    <div className="bg-[#121722] border border-[#1E2636] rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-2.5 mb-4">
        <div>
          <h3 className="font-display text-sm sm:text-base font-semibold text-slate-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
          {series.map((s) => {
            const latest = s.values[s.values.length - 1];
            return (
              <div key={s.id} className="flex items-center gap-1.5 font-mono tabular-nums">
                <span
                  className="inline-block w-3 h-0.5"
                  style={{
                    backgroundColor: s.color,
                    borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
                  }}
                />
                <span className="text-slate-400">{s.label}:</span>
                <span className="font-semibold text-slate-100">
                  {latest !== undefined ? `${latest}${s.unit}` : '--'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          role="img"
          aria-label={title}
        >
          {/* Horizontal grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={width - padRight}
                y2={tick.y}
                stroke="#1E2636"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {tick.val}
                {yUnit}
              </text>
            </g>
          ))}

          {/* Reference tolerance or threshold lines */}
          {referenceBands.map((band, idx) => {
            const y = mapY(band.value);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={band.color}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />
                <text
                  x={width - padRight - 4}
                  y={y + 13}
                  textAnchor="end"
                  fill={band.color}
                  stroke="#121722"
                  strokeWidth="3"
                  paintOrder="stroke"
                  className="text-[10px] font-mono font-medium"
                >
                  {band.label}
                </text>
              </g>
            );
          })}

          {/* Data series lines */}
          {series.map((s) => {
            if (s.values.length < 2) return null;
            const points = s.values
              .map((v, i) => `${mapX(i).toFixed(1)},${mapY(v).toFixed(1)}`)
              .join(' ');
            return (
              <polyline
                key={s.id}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '5 4' : undefined}
                points={points}
              />
            );
          })}

          {/* X-axis edge timestamps */}
          {count > 1 && (
            <>
              <text
                x={padLeft}
                y={height - 6}
                textAnchor="start"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {timestamps[0]}
              </text>
              <text
                x={padLeft + plotW / 2}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {timestamps[Math.floor(count / 2)]}
              </text>
              <text
                x={width - padRight}
                y={height - 6}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {timestamps[count - 1]}
              </text>
            </>
          )}

          {/* Crosshair & points */}
          {activeIdx !== null && (
            <g>
              <line
                x1={mapX(activeIdx)}
                y1={padTop}
                x2={mapX(activeIdx)}
                y2={padTop + plotH}
                stroke="#64748B"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {series.map((s) => {
                const v = s.values[activeIdx];
                if (v === undefined) return null;
                return (
                  <circle
                    key={s.id}
                    cx={mapX(activeIdx)}
                    cy={mapY(v)}
                    r="3.5"
                    fill={s.color}
                    stroke="#0B0E14"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {activeIdx !== null && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-[#1E2636] text-xs font-mono tabular-nums">
            <span className="text-slate-400">Muestra: {timestamps[activeIdx]}</span>
            <div className="flex flex-wrap items-center gap-4">
              {series.map((s) => (
                <span key={s.id} style={{ color: s.color }}>
                  {s.label}: {s.values[activeIdx]}
                  {s.unit}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

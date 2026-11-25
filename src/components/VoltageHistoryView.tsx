import React, { useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import type { TelemetrySample, VoltageRailStats } from '../types/hardware';
import { TelemetryChart } from './TelemetryChart';

interface VoltageHistoryViewProps {
  history: TelemetrySample[];
  stats: VoltageRailStats[];
  requiresLhm: boolean;
  onGoToAlerts: () => void;
}

type RailFocus = 'all_atx' | 'rail12v' | 'vcore_dram';

function fmtV(val: number | null): string {
  return val !== null ? `${val.toFixed(3)}V` : 'N/A';
}

export const VoltageHistoryView: React.FC<VoltageHistoryViewProps> = ({
  history,
  stats,
  requiresLhm,
  onGoToAlerts,
}) => {
  const [focus, setFocus] = useState<RailFocus>('rail12v');
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);

  const timestamps = history.map((s) => s.timeLabel);
  const noVoltageData = stats.every((s) => s.current === null);

  const filteredHistory = [...history]
    .reverse()
    .filter((sample) => {
      if (!onlyAnomalies) return true;
      const r12 = sample.voltages.rail12v;
      const r5 = sample.voltages.rail5v;
      const r33 = sample.voltages.rail33v;
      const out12 = r12 !== null && (r12 < 11.4 || r12 > 12.6);
      const out5 = r5 !== null && (r5 < 4.75 || r5 > 5.25);
      const out33 = r33 !== null && (r33 < 3.135 || r33 > 3.465);
      const droop12 = r12 !== null && Math.abs((r12 - 12.0) / 12.0) >= 0.02;
      return out12 || out5 || out33 || droop12;
    });

  return (
    <div className="space-y-6">
      {(requiresLhm || noVoltageData) && (
        <section
          aria-label="Requisito LibreHardwareMonitor para voltajes"
          className="bg-amber-950/25 border border-amber-500/40 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-amber-200">
                Voltajes reales no disponibles: instala y abre LibreHardwareMonitor
              </h2>
              <p className="text-xs text-amber-100/80 leading-relaxed">
                Los raíles <strong>+12V, +5V, +3.3V, Vcore y DRAM</strong> se leen desde el chip Super I/O de tu placa base. Como LibreHardwareMonitor no está activo en <code>127.0.0.1:8085</code>, los valores aparecen como <strong>N/A</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              <span>Descargar LibreHardwareMonitor</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onGoToAlerts}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#0B0E14] text-amber-200 border border-amber-500/35 hover:bg-amber-950/40 transition-colors whitespace-nowrap"
            >
              Comprobar puente SO
            </button>
          </div>
        </section>
      )}

      {/* Rail Summary Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((rail) => (
          <div key={rail.key} className="bg-[#121722] border border-[#1E2636] rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 truncate">
                {rail.label.split(' ')[0]} {rail.label.split(' ')[1] ?? ''}
              </span>
              <span
                className={`font-mono font-medium shrink-0 ${
                  rail.inSpec === null
                    ? 'text-slate-400'
                    : rail.inSpec
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                }`}
              >
                {rail.inSpec === null
                  ? '— Requiere LHM'
                  : rail.inSpec
                    ? '● En norma'
                    : '✖ Fuera ATX'}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold tabular-nums text-slate-100">
                {rail.current !== null ? rail.current.toFixed(3) : 'N/A'}
              </span>
              {rail.current !== null && <span className="text-xs font-mono text-slate-400">V</span>}
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-[#1E2636] text-[11px] font-mono tabular-nums text-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Mín / Máx</span>
                <span className="text-slate-300">
                  {rail.min !== null && rail.max !== null
                    ? `${rail.min.toFixed(3)} / ${rail.max.toFixed(3)}V`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Desviación</span>
                <span
                  className={
                    rail.deviationPct === null
                      ? 'text-slate-400'
                      : Math.abs(rail.deviationPct) >= 3
                        ? 'text-amber-400'
                        : 'text-slate-300'
                  }
                >
                  {rail.deviationPct === null
                    ? 'N/A'
                    : rail.deviationPct >= 0
                      ? `+${rail.deviationPct}%`
                      : `${rail.deviationPct}%`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Focus Selector + Live Voltage Chart */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Monitor de Estabilidad Eléctrica (Norma ATX ±5%)
            </h2>
            <p className="text-xs text-slate-400">
              Caídas bruscas en +12V bajo carga indican fuente fatigada, cable PCIe flojo o sobreconsumo.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#121722] border border-[#1E2636] rounded-lg self-start" role="group" aria-label="Vista de raíles de voltaje">
            <button
              type="button"
              onClick={() => setFocus('rail12v')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                focus === 'rail12v' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raíl +12V (Detalle)
            </button>
            <button
              type="button"
              onClick={() => setFocus('all_atx')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                focus === 'all_atx' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              +5V y +3.3V
            </button>
            <button
              type="button"
              onClick={() => setFocus('vcore_dram')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                focus === 'vcore_dram' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CPU Vcore y DRAM
            </button>
          </div>
        </div>

        {focus === 'rail12v' && (
          <TelemetryChart
            title="Historial Raíl +12V en Tiempo Real"
            subtitle="Tolerancia ATX oficial: 11.400V mínimo a 12.600V máximo"
            timestamps={timestamps}
            minY={11.3}
            maxY={12.7}
            yUnit="V"
            referenceBands={[
              { value: 12.0, label: 'Nominal 12.00V', color: '#10B981' },
              { value: 11.4, label: 'Mín ATX 11.40V', color: '#EF4444' },
            ]}
            emptyMessage="Sin datos del raíl +12V (N/A). Ejecuta LibreHardwareMonitor como Administrador en Windows 10."
            series={[
              { id: 'r12', label: '+12V', unit: 'V', color: '#06B6D4', values: history.map((s) => s.voltages.rail12v) },
            ]}
          />
        )}

        {focus === 'all_atx' && (
          <TelemetryChart
            title="Historial Raíles Auxiliares (+5V y +3.3V)"
            subtitle="Alimentación de puertos USB, SATA, chipset y unidades SSD NVMe"
            timestamps={timestamps}
            minY={3.0}
            maxY={5.4}
            yUnit="V"
            emptyMessage="Sin datos de +5V / +3.3V (N/A). Requiere LibreHardwareMonitor conectado."
            series={[
              { id: 'r5', label: '+5V', unit: 'V', color: '#10B981', values: history.map((s) => s.voltages.rail5v) },
              { id: 'r33', label: '+3.3V', unit: 'V', color: '#F59E0B', values: history.map((s) => s.voltages.rail33v) },
            ]}
          />
        )}

        {focus === 'vcore_dram' && (
          <TelemetryChart
            title="Historial CPU Vcore y DRAM VDD"
            subtitle="Vcore > 1.40V sostenido genera calor excesivo y obliga a los ventiladores a girar al máximo"
            timestamps={timestamps}
            minY={0.7}
            maxY={1.55}
            yUnit="V"
            referenceBands={[
              { value: 1.4, label: 'Aviso Vcore 1.40V', color: '#F59E0B' },
            ]}
            emptyMessage="Sin datos de Vcore / DRAM (N/A). Requiere LibreHardwareMonitor conectado."
            series={[
              { id: 'vcore', label: 'CPU Vcore', unit: 'V', color: '#F43F5E', values: history.map((s) => s.voltages.vcore) },
              { id: 'dram', label: 'DRAM VDD', unit: 'V', color: '#A78BFA', dashed: true, values: history.map((s) => s.voltages.dramVdd) },
            ]}
          />
        )}
      </section>

      {/* Timestamped Voltage History Table */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E2636] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-display text-sm sm:text-base font-semibold text-slate-100">
              Registro Cronológico de Voltajes Detectados
            </h3>
            <p className="text-xs text-slate-400">
              Últimas {history.length} muestras capturadas en tiempo real
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAnomalies}
              onChange={(e) => setOnlyAnomalies(e.target.checked)}
              className="rounded border-slate-600 bg-[#0B0E14] text-cyan-500 focus:ring-cyan-500"
            />
            <span>Mostrar solo caídas o desviaciones (&ge; 2%)</span>
          </label>
        </div>

        <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-[#121722] border-b border-[#1E2636] text-xs text-slate-400">
              <tr>
                <th className="py-2.5 px-5 font-medium">Hora</th>
                <th className="py-2.5 px-4 font-medium text-right">+12V</th>
                <th className="py-2.5 px-4 font-medium text-right">+5V</th>
                <th className="py-2.5 px-4 font-medium text-right">+3.3V</th>
                <th className="py-2.5 px-4 font-medium text-right">CPU Vcore</th>
                <th className="py-2.5 px-4 font-medium text-right">DRAM</th>
                <th className="py-2.5 px-5 font-medium text-right">Estado ATX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2636]">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No se han registrado desviaciones de voltaje &ge; 2% en las muestras actuales.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => {
                  const r12 = row.voltages.rail12v;
                  const dev12 = r12 !== null ? Math.abs(((r12 - 12.0) / 12.0) * 100) : null;
                  const isOk = r12 !== null ? r12 >= 11.4 && r12 <= 12.6 : null;
                  return (
                    <tr key={row.id} className="hover:bg-[#161D2B] transition-colors h-10">
                      <td className="py-2 px-5 font-mono text-xs text-slate-400 tabular-nums">
                        {row.timeLabel}
                      </td>
                      <td className={`py-2 px-4 text-right font-mono tabular-nums ${r12 === null ? 'text-slate-500' : 'text-slate-100'}`}>
                        {fmtV(r12)}
                      </td>
                      <td className={`py-2 px-4 text-right font-mono tabular-nums ${row.voltages.rail5v === null ? 'text-slate-500' : 'text-slate-300'}`}>
                        {fmtV(row.voltages.rail5v)}
                      </td>
                      <td className={`py-2 px-4 text-right font-mono tabular-nums ${row.voltages.rail33v === null ? 'text-slate-500' : 'text-slate-300'}`}>
                        {fmtV(row.voltages.rail33v)}
                      </td>
                      <td className={`py-2 px-4 text-right font-mono tabular-nums ${row.voltages.vcore === null ? 'text-slate-500' : 'text-cyan-300'}`}>
                        {fmtV(row.voltages.vcore)}
                      </td>
                      <td className={`py-2 px-4 text-right font-mono tabular-nums ${row.voltages.dramVdd === null ? 'text-slate-500' : 'text-slate-300'}`}>
                        {fmtV(row.voltages.dramVdd)}
                      </td>
                      <td className="py-2 px-5 text-right font-mono text-xs">
                        {isOk === null || dev12 === null ? (
                          <span className="text-slate-500">— Sin sensor (N/A)</span>
                        ) : !isOk ? (
                          <span className="text-rose-400">✖ Fuera ({dev12.toFixed(1)}%)</span>
                        ) : dev12 >= 2 ? (
                          <span className="text-amber-400">▲ Caída ({dev12.toFixed(1)}%)</span>
                        ) : (
                          <span className="text-emerald-400">● Estable</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

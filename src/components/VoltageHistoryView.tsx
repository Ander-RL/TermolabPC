import React, { useState } from 'react';
import type { TelemetrySample, VoltageRailStats } from '../types/hardware';
import { TelemetryChart } from './TelemetryChart';

interface VoltageHistoryViewProps {
  history: TelemetrySample[];
  stats: VoltageRailStats[];
}

type RailFocus = 'all_atx' | 'rail12v' | 'vcore_dram';

export const VoltageHistoryView: React.FC<VoltageHistoryViewProps> = ({
  history,
  stats,
}) => {
  const [focus, setFocus] = useState<RailFocus>('rail12v');
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);

  const timestamps = history.map((s) => s.timeLabel);

  const filteredHistory = [...history]
    .reverse()
    .filter((sample) => {
      if (!onlyAnomalies) return true;
      const out12 = sample.voltages.rail12v < 11.4 || sample.voltages.rail12v > 12.6;
      const out5 = sample.voltages.rail5v < 4.75 || sample.voltages.rail5v > 5.25;
      const out33 = sample.voltages.rail33v < 3.135 || sample.voltages.rail33v > 3.465;
      const droop12 = Math.abs((sample.voltages.rail12v - 12.0) / 12.0) >= 0.02;
      return out12 || out5 || out33 || droop12;
    });

  return (
    <div className="space-y-6">
      {/* Rail Summary Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((rail) => (
          <div key={rail.key} className="bg-[#121722] border border-[#1E2636] rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 truncate">{rail.label.split(' ')[0]} {rail.label.split(' ')[1] ?? ''}</span>
              <span className={`font-mono font-medium shrink-0 ${rail.inSpec ? 'text-emerald-400' : 'text-rose-400'}`}>
                {rail.inSpec ? '● En norma' : '✖ Fuera ATX'}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold tabular-nums text-slate-100">
                {rail.current.toFixed(3)}
              </span>
              <span className="text-xs font-mono text-slate-400">V</span>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-[#1E2636] text-[11px] font-mono tabular-nums text-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Mín / Máx</span>
                <span className="text-slate-300">
                  {rail.min.toFixed(3)} / {rail.max.toFixed(3)}V
                </span>
              </div>
              <div className="flex justify-between">
                <span>Desviación</span>
                <span className={Math.abs(rail.deviationPct) >= 3 ? 'text-amber-400' : 'text-slate-300'}>
                  {rail.deviationPct >= 0 ? `+${rail.deviationPct}%` : `${rail.deviationPct}%`}
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
                  const dev12 = Math.abs(((row.voltages.rail12v - 12.0) / 12.0) * 100);
                  const isOk = row.voltages.rail12v >= 11.4 && row.voltages.rail12v <= 12.6;
                  return (
                    <tr key={row.id} className="hover:bg-[#161D2B] transition-colors h-10">
                      <td className="py-2 px-5 font-mono text-xs text-slate-400 tabular-nums">
                        {row.timeLabel}
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-100">
                        {row.voltages.rail12v.toFixed(3)}V
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-300">
                        {row.voltages.rail5v.toFixed(3)}V
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-300">
                        {row.voltages.rail33v.toFixed(3)}V
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-cyan-300">
                        {row.voltages.vcore.toFixed(3)}V
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-300">
                        {row.voltages.dramVdd.toFixed(3)}V
                      </td>
                      <td className="py-2 px-5 text-right font-mono text-xs">
                        {!isOk ? (
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

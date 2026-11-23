import React from 'react';
import { Pause, Play, RefreshCw, AlertTriangle } from 'lucide-react';
import type {
  AcousticDiagnosis,
  TelemetryProfileId,
  TelemetrySample,
  TriggeredAlert,
} from '../types/hardware';
import { TelemetryChart } from './TelemetryChart';

interface LiveMonitorViewProps {
  current: TelemetrySample;
  history: TelemetrySample[];
  profile: TelemetryProfileId;
  onChangeProfile: (profile: TelemetryProfileId) => void;
  isStreaming: boolean;
  onToggleStream: () => void;
  diagnosis: AcousticDiagnosis;
  activeAlerts: TriggeredAlert[];
  hostBridgeInfo: {
    osLabel: string;
    lhmConnected: boolean;
    hasRealSensors: boolean;
  };
  onGoToComponents: () => void;
  onGoToAi: () => void;
}

const PROFILE_OPTIONS: Array<{ id: TelemetryProfileId; label: string }> = [
  { id: 'noisy-clean-pc', label: 'PC Limpio · Ventiladores 100%' },
  { id: 'gaming-load', label: 'Carga Gaming 4K' },
  { id: 'silent-idle', label: 'Objetivo Silencioso' },
  { id: 'thermal-stress', label: 'Estrés Térmico' },
  { id: 'host-live', label: 'Host Real (SO)' },
];

function statusLabel(val: number, warn: number, crit: number) {
  if (val >= crit) return { text: '✖ Crítico', cls: 'text-rose-400' };
  if (val >= warn) return { text: '▲ Elevado', cls: 'text-amber-400' };
  return { text: '● Nominal', cls: 'text-emerald-400' };
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({
  current,
  history,
  profile,
  onChangeProfile,
  isStreaming,
  onToggleStream,
  diagnosis,
  activeAlerts,
  hostBridgeInfo,
  onGoToComponents,
  onGoToAi,
}) => {
  const timestamps = history.map((s) => s.timeLabel);

  const cpuStatus = statusLabel(current.cpuTemp, 78, 88);
  const gpuHotStatus = statusLabel(current.gpuHotspot, 88, 98);
  const peakFan = Math.max(current.fans.cpuFanRpm, current.fans.gpuFanRpm);
  const fanStatus = statusLabel(peakFan, 1900, 2400);
  const loadStatus = statusLabel(Math.max(current.cpuLoad, current.gpuLoad), 80, 95);

  const fanRows = [
    { name: 'CPU_FAN (Disipador / Radiador)', rpm: current.fans.cpuFanRpm, duty: `${current.fans.cpuFanPct}%`, note: current.fans.cpuFanPct >= 85 ? 'Régimen máximo' : 'Control PWM' },
    { name: 'AIO_PUMP / Auxiliar', rpm: current.fans.aioPumpRpm, duty: '100%', note: 'Flujo constante' },
    { name: 'GPU_FAN (Triple ventilador)', rpm: current.fans.gpuFanRpm, duty: `${current.fans.gpuFanPct}%`, note: current.fans.gpuFanRpm === 0 ? 'Zero-RPM activo' : `Hotspot ${current.gpuHotspot}°C` },
    { name: 'SYS_FAN1 (Frontal entrada)', rpm: current.fans.sysFan1Rpm, duty: `${Math.round((current.fans.sysFan1Rpm / 2000) * 100)}%`, note: 'Presión positiva' },
    { name: 'SYS_FAN2 (Trasero extracción)', rpm: current.fans.sysFan2Rpm, duty: `${Math.round((current.fans.sysFan2Rpm / 2000) * 100)}%`, note: 'Extracción VRM' },
    { name: 'PSU_FAN (Fuente ATX)', rpm: current.fans.psuFanRpm, duty: current.fans.psuFanRpm === 0 ? '0%' : 'Activo', note: current.fans.psuFanRpm === 0 ? 'Botón Hybrid/Eco activo' : 'Ventilación activa' },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Profile & Stream Controls */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>Fuente activa:</span>
            <span className="text-slate-200 font-medium">{current.sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400">{current.osPlatform}</span>
          </div>
          {profile === 'host-live' && (
            <span className="text-cyan-300">
              {hostBridgeInfo.lhmConnected
                ? `Puente LibreHardwareMonitor conectado (${hostBridgeInfo.osLabel})`
                : `Host: ${hostBridgeInfo.osLabel} · Activa LibreHardwareMonitor en Windows 10 para RPM/voltajes`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1E2636]">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0E14] border border-[#1E2636] rounded-lg" role="group" aria-label="Perfil de telemetría">
            {PROFILE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeProfile(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  profile === opt.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleStream}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#283347] bg-[#0B0E14] text-slate-200 hover:bg-[#192131] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            {isStreaming ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isStreaming ? 'Pausar flujo' : 'Reanudar flujo'}</span>
          </button>
        </div>
      </section>

      {/* Active Overheating Alerts Banner */}
      {activeAlerts.length > 0 && (
        <section
          aria-label="Alertas activas de sobrecalentamiento"
          className="bg-rose-950/25 border border-rose-500/35 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-rose-200">
                {activeAlerts.length} {activeAlerts.length === 1 ? 'alerta térmica/acústica activa' : 'alertas térmicas/acústicas activas'}
              </h2>
              <p className="text-xs text-rose-200/80">
                {activeAlerts.map((a) => `${a.title} (${a.currentValue}${a.unit})`).join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToAi}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30 transition-colors whitespace-nowrap shrink-0"
          >
            Explicar alertas con IA
          </button>
        </section>
      )}

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#121722] border border-[#1E2636] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Temperatura CPU</span>
            <span className={`font-mono font-medium ${cpuStatus.cls}`}>{cpuStatus.text}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold tabular-nums text-slate-100">
              {current.cpuTemp.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">°C</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono tabular-nums">
            Hotspot: {current.cpuHotspot.toFixed(1)}°C · Vcore: {current.voltages.vcore.toFixed(3)}V
          </p>
        </div>

        <div className="bg-[#121722] border border-[#1E2636] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>GPU Núcleo / Hotspot</span>
            <span className={`font-mono font-medium ${gpuHotStatus.cls}`}>{gpuHotStatus.text}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold tabular-nums text-slate-100">
              {current.gpuHotspot.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">°C Hotspot</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono tabular-nums">
            Núcleo: {current.gpuTemp.toFixed(1)}°C · Delta: +{(current.gpuHotspot - current.gpuTemp).toFixed(1)}°C
          </p>
        </div>

        <div className="bg-[#121722] border border-[#1E2636] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pico Ventiladores</span>
            <span className={`font-mono font-medium ${fanStatus.cls}`}>{fanStatus.text}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold tabular-nums text-slate-100">
              {peakFan}
            </span>
            <span className="text-xs font-mono text-slate-400">RPM</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono tabular-nums">
            CPU: {current.fans.cpuFanPct}% · GPU: {current.fans.gpuFanPct}% · PSU: {current.fans.psuFanRpm} RPM
          </p>
        </div>

        <div className="bg-[#121722] border border-[#1E2636] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Carga y Consumo</span>
            <span className={`font-mono font-medium ${loadStatus.cls}`}>{loadStatus.text}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold tabular-nums text-slate-100">
              {current.cpuLoad.toFixed(0)}
            </span>
            <span className="text-xs font-mono text-slate-400">% CPU</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-xl font-mono font-semibold tabular-nums text-slate-200">
              {current.gpuLoad.toFixed(0)}%
            </span>
            <span className="text-xs font-mono text-slate-400">GPU</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono tabular-nums">
            RAM: {current.ramUsedGb}/{current.ramTotalGb} GB · {current.powerWatts}W est.
          </p>
        </div>
      </section>

      {/* Immediate Acoustic / Clean PC Root-Cause Insight */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={
                diagnosis.severity === 'critical'
                  ? 'text-rose-400'
                  : diagnosis.severity === 'warning'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }
            >
              {diagnosis.severity === 'critical'
                ? '✖ Diagnóstico acústico prioritario'
                : diagnosis.severity === 'warning'
                  ? '▲ Anomalía de curva detectada'
                  : '● Operación acústica saludable'}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-400">{diagnosis.primaryCause}</span>
          </div>
          <h2 className="font-display text-base sm:text-lg font-semibold text-slate-100">
            {diagnosis.headline}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {diagnosis.explanation}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onGoToComponents}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-[#283347] bg-[#0B0E14] text-slate-200 hover:bg-[#192131] transition-colors whitespace-nowrap"
          >
            Ver botón PSU y BIOS
          </button>
          <button
            type="button"
            onClick={onGoToAi}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 hover:bg-cyan-500/25 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Preguntar qué probar</span>
          </button>
        </div>
      </section>

      {/* Time-Series Live Charts */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TelemetryChart
          title="Evolución Térmica en Tiempo Real"
          subtitle="Pasa el cursor por la gráfica para inspeccionar valores exactos"
          timestamps={timestamps}
          minY={25}
          maxY={110}
          yUnit="°C"
          referenceBands={[
            { value: 90, label: 'Límite Hotspot 90°C', color: '#F59E0B' },
          ]}
          series={[
            { id: 'gpuHot', label: 'GPU Hotspot', unit: '°C', color: '#F43F5E', values: history.map((s) => s.gpuHotspot) },
            { id: 'cpu', label: 'CPU', unit: '°C', color: '#06B6D4', values: history.map((s) => s.cpuTemp) },
            { id: 'gpu', label: 'GPU Core', unit: '°C', color: '#F59E0B', values: history.map((s) => s.gpuTemp) },
            { id: 'vrm', label: 'VRM', unit: '°C', color: '#94A3B8', dashed: true, values: history.map((s) => s.vrmTemp) },
          ]}
        />

        <TelemetryChart
          title="Carga del Sistema vs Ciclo de Ventiladores"
          subtitle="Si los ventiladores superan el 80% con carga baja, revisa PWM o pasta térmica"
          timestamps={timestamps}
          minY={0}
          maxY={105}
          yUnit="%"
          series={[
            { id: 'cpuFanPct', label: 'Vent. CPU', unit: '%', color: '#06B6D4', values: history.map((s) => s.fans.cpuFanPct) },
            { id: 'gpuFanPct', label: 'Vent. GPU', unit: '%', color: '#F43F5E', values: history.map((s) => s.fans.gpuFanPct) },
            { id: 'cpuLoad', label: 'Carga CPU', unit: '%', color: '#10B981', dashed: true, values: history.map((s) => s.cpuLoad) },
            { id: 'gpuLoad', label: 'Carga GPU', unit: '%', color: '#A78BFA', dashed: true, values: history.map((s) => s.gpuLoad) },
          ]}
        />
      </section>

      {/* Dense Fan & Thermal Table */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E2636] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-display text-sm sm:text-base font-semibold text-slate-100">
              Canales de Ventilación y Sensores Secundarios
            </h3>
            <p className="text-xs text-slate-400">
              VRM: {current.vrmTemp.toFixed(1)}°C · NVMe: {current.nvmeTemp.toFixed(1)}°C · Ambiente caja: {current.ambientTemp.toFixed(1)}°C
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            Última lectura: {current.timeLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#1E2636] text-xs text-slate-400">
                <th className="py-2.5 px-5 font-medium">Canal / Sensor</th>
                <th className="py-2.5 px-4 font-medium text-right">Velocidad</th>
                <th className="py-2.5 px-4 font-medium text-right">Ciclo PWM</th>
                <th className="py-2.5 px-5 font-medium text-right">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2636]">
              {fanRows.map((row) => (
                <tr key={row.name} className="hover:bg-[#161D2B] transition-colors h-10">
                  <td className="py-2 px-5 text-slate-200 font-medium">{row.name}</td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-100">
                    {row.rpm} RPM
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums text-cyan-300">
                    {row.duty}
                  </td>
                  <td className="py-2 px-5 text-right text-xs text-slate-400">
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

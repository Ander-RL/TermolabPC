import React from 'react';
import { Bell, Download, RotateCcw, Terminal, Trash2, Volume2, VolumeX } from 'lucide-react';
import type { AlertRule, TriggeredAlert } from '../types/hardware';

interface AlertsAndOsBridgeViewProps {
  rules: AlertRule[];
  onUpdateRule: (id: string, patch: Partial<AlertRule>) => void;
  onResetRules: () => void;
  alertLog: TriggeredAlert[];
  onClearAlertLog: () => void;
  audibleAlarm: boolean;
  onToggleAudibleAlarm: () => void;
  onTestThermalSpike: () => void;
  hostStatus: {
    osLabel: string;
    cpuModel: string;
    cores: number;
    lhmConnected: boolean;
    lhmEndpoint?: string | null;
    sensorsCount: number;
    detectedSensors?: Array<{ category: string; text: string; value: string; path: string }>;
    loading: boolean;
  };
  onRefreshHostStatus: () => void;
}

export const AlertsAndOsBridgeView: React.FC<AlertsAndOsBridgeViewProps> = ({
  rules,
  onUpdateRule,
  onResetRules,
  alertLog,
  onClearAlertLog,
  audibleAlarm,
  onToggleAudibleAlarm,
  onTestThermalSpike,
  hostStatus,
  onRefreshHostStatus,
}) => {
  return (
    <div className="space-y-6">
      {/* Custom Overheating Thresholds */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E2636] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-100">
              Umbrales de Alertas Personalizadas (Sobrecalentamiento y Voltaje)
            </h2>
            <p className="text-xs text-slate-400">
              Ajusta los límites exactos de aviso preventivo y nivel crítico para tu equipo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleAudibleAlarm}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                audibleAlarm
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-[#0B0E14] border-[#283347] text-slate-300 hover:bg-[#192131]'
              }`}
            >
              {audibleAlarm ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>{audibleAlarm ? 'Aviso sonoro activo' : 'Aviso sonoro silenciado'}</span>
            </button>

            <button
              type="button"
              onClick={onTestThermalSpike}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-colors whitespace-nowrap"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Probar alerta crítica</span>
            </button>

            <button
              type="button"
              onClick={onResetRules}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0B0E14] border border-[#283347] text-slate-300 hover:bg-[#192131] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restablecer valores</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#1E2636]">
          {rules.map((rule) => {
            const step = rule.metric === 'rail12vDeviation' ? 0.5 : rule.metric === 'fanRunaway' ? 100 : 1;
            const minVal = rule.metric === 'rail12vDeviation' ? 1 : rule.metric === 'fanRunaway' ? 800 : 40;
            const maxVal = rule.metric === 'rail12vDeviation' ? 10 : rule.metric === 'fanRunaway' ? 3500 : 115;

            return (
              <div
                key={rule.id}
                className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => onUpdateRule(rule.id, { enabled: e.target.checked })}
                        className="rounded border-slate-600 bg-[#0B0E14] text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm font-semibold text-slate-100">{rule.label}</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">{rule.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`warn-${rule.id}`} className="text-xs text-amber-400 font-medium">
                      Aviso ({rule.unit})
                    </label>
                    <input
                      id={`warn-${rule.id}`}
                      type="number"
                      step={step}
                      min={minVal}
                      max={maxVal}
                      value={rule.warningThreshold}
                      onChange={(e) =>
                        onUpdateRule(rule.id, { warningThreshold: Number(e.target.value) })
                      }
                      className="w-20 rounded-lg bg-[#0B0E14] border border-[#283347] px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor={`crit-${rule.id}`} className="text-xs text-rose-400 font-medium">
                      Crítico ({rule.unit})
                    </label>
                    <input
                      id={`crit-${rule.id}`}
                      type="number"
                      step={step}
                      min={minVal}
                      max={maxVal}
                      value={rule.criticalThreshold}
                      onChange={(e) =>
                        onUpdateRule(rule.id, { criticalThreshold: Number(e.target.value) })
                      }
                      className="w-20 rounded-lg bg-[#0B0E14] border border-[#283347] px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Alert History Log */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E2636] flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm sm:text-base font-semibold text-slate-100">
              Historial de Eventos y Alertas Disparadas
            </h3>
            <p className="text-xs text-slate-400">
              {alertLog.length} eventos registrados en esta sesión
            </p>
          </div>

          {alertLog.length > 0 && (
            <button
              type="button"
              onClick={onClearAlertLog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 border border-[#283347] hover:bg-[#192131]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpiar historial</span>
            </button>
          )}
        </div>

        <div className="max-h-[260px] overflow-y-auto divide-y divide-[#1E2636]">
          {alertLog.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No se han disparado alertas todavía. Reduce un umbral o pulsa &ldquo;Probar alerta crítica&rdquo; para verificar.
            </p>
          ) : (
            alertLog.map((item) => (
              <div
                key={item.id}
                className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span
                    className={`font-mono text-xs font-semibold shrink-0 ${
                      item.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {item.severity === 'critical' ? '✖ CRÍTICO' : '▲ AVISO'}
                  </span>
                  <div>
                    <span className="font-medium text-slate-100">{item.title}</span>
                    <span className="text-slate-500 mx-2" aria-hidden="true">·</span>
                    <span className="text-xs text-slate-300">{item.detail}</span>
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                  {item.timeLabel}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Multi-OS / Windows 10 Bridge */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <span>Conexión Independiente del SO y Puente Windows 10</span>
            </h2>
            <p className="text-xs text-slate-400">
              El servidor Node.js funciona en Windows 10, Linux y macOS. En Windows 10 se enlaza automáticamente con LibreHardwareMonitor para leer GPU Hotspot, RPM y voltajes reales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefreshHostStatus}
              disabled={hostStatus.loading}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-[#283347] bg-[#0B0E14] text-slate-200 hover:bg-[#192131] transition-colors whitespace-nowrap"
            >
              {hostStatus.loading ? 'Comprobando...' : 'Re-escanear sensores locales'}
            </button>
            <a
              href="/api/telemetry/bridge-script"
              download="TermoLab-Windows10-Bridge.ps1"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 hover:bg-cyan-500/25 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar Script Windows 10 (.ps1)</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#1E2636] text-xs">
          <div className="space-y-1">
            <span className="text-slate-400">Sistema donde corre el servidor</span>
            <p className="font-mono text-slate-100">{hostStatus.osLabel}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400">CPU detectada por Node/SO</span>
            <p className="font-mono text-slate-100">
              {hostStatus.cpuModel} ({hostStatus.cores} hilos)
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400">Puente LibreHardwareMonitor (Puerto 8085)</span>
            <p className={`font-mono font-semibold ${hostStatus.lhmConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {hostStatus.lhmConnected
                ? `● Conectado (${hostStatus.sensorsCount} sensores)`
                : '▲ No detectado en 127.0.0.1:8085'}
            </p>
            {hostStatus.lhmEndpoint && (
              <p className="text-[11px] font-mono text-slate-500">{hostStatus.lhmEndpoint}</p>
            )}
          </div>
        </div>

        {!hostStatus.lhmConnected ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-100/90 space-y-1.5">
            <p className="font-semibold text-amber-200">
              ¿Tienes LibreHardwareMonitor abierto pero sigue apareciendo como no detectado?
            </p>
            <p className="text-amber-100/80 leading-relaxed">
              En la ventana de LibreHardwareMonitor debes activar su servidor web local: entra en{' '}
              <span className="font-mono text-amber-200">Options → Remote Web Server → Run</span> (puerto{' '}
              <span className="font-mono text-amber-200">8085</span>) y ejecutarlo como Administrador. Luego pulsa{' '}
              <strong>Re-escanear sensores locales</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-3 border-t border-[#1E2636]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-xs font-semibold text-slate-200">
                Sensores recibidos en directo desde LibreHardwareMonitor ({hostStatus.detectedSensors?.length ?? 0} mostrados)
              </span>
              <span className="text-[11px] text-slate-400">
                Si faltan ventiladores o raíles +12V/+5V, ejecuta LibreHardwareMonitor como Administrador y marca{' '}
                <span className="font-mono text-slate-300">File → Hardware → Motherboard</span>.
              </span>
            </div>

            {hostStatus.detectedSensors && hostStatus.detectedSensors.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-[#1E2636] bg-[#0B0E14]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2636] text-slate-400">
                      <th className="py-2 px-3 font-medium">Categoría</th>
                      <th className="py-2 px-3 font-medium">Sensor</th>
                      <th className="py-2 px-3 font-medium text-right">Lectura</th>
                      <th className="py-2 px-3 font-medium hidden md:table-cell">Ruta LHM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2636]">
                    {hostStatus.detectedSensors.map((s, idx) => (
                      <tr key={`${s.path}-${idx}`} className="hover:bg-[#121722]">
                        <td className="py-1.5 px-3 font-mono text-cyan-300 uppercase text-[11px]">
                          {s.category}
                        </td>
                        <td className="py-1.5 px-3 text-slate-200 font-medium">{s.text}</td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-300">
                          {s.value}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500 hidden md:table-cell truncate max-w-xs">
                          {s.path}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

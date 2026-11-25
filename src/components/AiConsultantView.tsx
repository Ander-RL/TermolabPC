import React, { useState } from 'react';
import { Bot, CheckSquare, Send, Sparkles, Square } from 'lucide-react';
import type {
  AiChatMessage,
  AiDiagnosisReport,
  HardwareComponent,
  TelemetrySample,
} from '../types/hardware';

interface AiConsultantViewProps {
  currentTelemetry: TelemetrySample;
  report: AiDiagnosisReport | null;
  isDiagnosing: boolean;
  diagnoseError: string | null;
  onRunDiagnose: (userNote?: string) => void;
  chatMessages: AiChatMessage[];
  isChatting: boolean;
  chatError: string | null;
  onSendChatMessage: (text: string) => void;
  completedTests: Record<string, boolean>;
  onToggleTestDone: (id: string) => void;
  preselectedComponent: HardwareComponent | null;
}

const QUICK_QUESTIONS = [
  'Mi PC está limpio de polvo pero los ventiladores van al 100%, ¿qué pruebo primero?',
  '¿Debo presionar el botón trasero Hybrid/Eco de mi fuente de alimentación?',
  '¿Cómo configuro FanControl o la BIOS para que vuelva a ser sigiloso en Windows 10?',
  '¿Qué te dicen los voltajes +12V y Vcore que estás viendo ahora mismo?',
];

export const AiConsultantView: React.FC<AiConsultantViewProps> = ({
  currentTelemetry,
  report,
  isDiagnosing,
  diagnoseError,
  onRunDiagnose,
  chatMessages,
  isChatting,
  chatError,
  onSendChatMessage,
  completedTests,
  onToggleTestDone,
  preselectedComponent,
}) => {
  const [noteInput, setNoteInput] = useState(
    preselectedComponent
      ? `Por favor revisa especialmente mi ${preselectedComponent.model} (${preselectedComponent.curiosity.title}).`
      : '',
  );
  const [chatInput, setChatInput] = useState('');

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;
    onSendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const fanCandidates = [currentTelemetry.fans.cpuFanRpm, currentTelemetry.fans.gpuFanRpm].filter(
    (v): v is number => v !== null,
  );
  const peakFanText = fanCandidates.length > 0 ? `${Math.max(...fanCandidates)} RPM` : 'N/A';

  return (
    <div className="space-y-6">
      {/* Context Summary & Trigger Bar */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Bot className="h-5 w-5 text-cyan-400" />
              <span>Diagnóstico Asistido con Telemetría en Vivo</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono tabular-nums">
              Contexto enviado a la IA: CPU {currentTelemetry.cpuTemp !== null ? `${currentTelemetry.cpuTemp}°C` : 'N/A'} · GPU Hotspot {currentTelemetry.gpuHotspot !== null ? `${currentTelemetry.gpuHotspot}°C` : 'N/A'} · Pico {peakFanText} · +12V {currentTelemetry.voltages.rail12v !== null ? `${currentTelemetry.voltages.rail12v.toFixed(3)}V` : 'N/A'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRunDiagnose(noteInput)}
            disabled={isDiagnosing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 hover:bg-cyan-500/25 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isDiagnosing ? 'Analizando sensores...' : 'Analizar con nota adicional'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="ai-user-note" className="sr-only">
            Contexto adicional sobre tu PC o modelo de fuente
          </label>
          <input
            id="ai-user-note"
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Opcional: escribe el modelo exacto de tu fuente, GPU o qué botón ves detrás de la PSU..."
            className="flex-1 rounded-lg bg-[#0B0E14] border border-[#283347] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {diagnoseError && (
          <div className="rounded-lg bg-rose-950/35 border border-rose-500/40 p-3.5 text-xs text-rose-200">
            <span className="font-semibold">Error al conectar con la IA: </span>
            {diagnoseError}
          </div>
        )}
      </section>

      {/* Structured AI Report */}
      {isDiagnosing && !report && (
        <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-6 space-y-3 animate-pulse">
          <div className="h-4 w-48 bg-slate-800 rounded" />
          <div className="h-3 w-full bg-slate-800/80 rounded" />
          <div className="h-3 w-5/6 bg-slate-800/80 rounded" />
          <div className="h-3 w-2/3 bg-slate-800/80 rounded" />
        </section>
      )}

      {report ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1E2636] pb-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                Informe Técnico de la IA
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Generado {report.generatedAt}
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                  Lo que observa en tus sensores
                </h4>
                <p className="text-slate-200 leading-relaxed">{report.resumenVisual}</p>
              </div>

              <div className="space-y-1 pt-3 border-t border-[#1E2636]">
                <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  Por qué los ventiladores están al máximo sin polvo
                </h4>
                <p className="text-slate-200 leading-relaxed">{report.causaRuidoVentiladores}</p>
              </div>

              <div className="space-y-1 pt-3 border-t border-[#1E2636]">
                <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                  Veredicto sobre el botón de tu fuente (PSU)
                </h4>
                <p className="text-slate-200 leading-relaxed">{report.veredictoBotonPsu}</p>
              </div>

              <div className="space-y-1 pt-3 border-t border-[#1E2636]">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Estado de los voltajes
                </h4>
                <p className="text-slate-300 leading-relaxed">{report.estadoVoltajes}</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {/* Interactive Tests Checklist */}
            <div className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                Pruebas recomendadas para hacer ahora
              </h3>
              <p className="text-xs text-slate-400">
                Marca cada prueba conforme la vayas ejecutando en tu equipo.
              </p>

              <div className="space-y-3 pt-2">
                {report.pruebasRecomendadas.map((step, idx) => {
                  const stepKey = step.id || `step-${idx}`;
                  const done = !!completedTests[stepKey];
                  return (
                    <button
                      key={stepKey}
                      type="button"
                      onClick={() => onToggleTestDone(stepKey)}
                      className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start gap-3 ${
                        done
                          ? 'bg-emerald-950/20 border-emerald-500/35'
                          : 'bg-[#0B0E14] border-[#1E2636] hover:border-[#2E3A52]'
                      }`}
                    >
                      {done ? (
                        <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className={`text-sm font-semibold ${done ? 'text-emerald-200 line-through' : 'text-slate-100'}`}>
                          {step.title}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{step.howTo}</p>
                        <p className="text-[11px] text-cyan-300/90">
                          Resultado esperado: {step.expectedOutcome}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recommended System Config */}
            <div className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                Configuración óptima sugerida
              </h3>
              <ol className="space-y-2 text-sm text-slate-300">
                {report.configuracionOptima.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="font-mono text-xs text-cyan-400 font-semibold mt-0.5">
                      0{i + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      ) : (
        <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-6 text-center space-y-3">
          <h3 className="font-display text-base font-semibold text-slate-100">
            Listo para analizar tu PC en tiempo real
          </h3>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Pulsa &ldquo;Analizar lo que ve ahora&rdquo; para que Gemini inspeccione tus temperaturas actuales, el delta de GPU Hotspot, la estabilidad de voltajes y el botón físico de tu fuente de alimentación.
          </p>
        </section>
      )}

      {/* Interactive Follow-Up Chat */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-100">
            Chat Técnico en Tiempo Real
          </h3>
          <p className="text-xs text-slate-400">
            Cuéntale a la IA el resultado de las pruebas o el modelo exacto de tus piezas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSendChatMessage(q)}
              disabled={isChatting}
              className="text-left text-xs px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-[#283347] text-slate-300 hover:text-cyan-200 hover:border-cyan-500/40 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {chatMessages.length > 0 && (
          <div className="space-y-3 max-h-[360px] overflow-y-auto p-3 rounded-lg bg-[#0B0E14] border border-[#1E2636]">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/12 border border-cyan-500/30 text-slate-100 ml-6'
                    : 'bg-[#121722] border border-[#1E2636] text-slate-200 mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>{msg.role === 'user' ? 'Tú' : 'TermoLab IA'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
          </div>
        )}

        {chatError && (
          <p className="text-xs text-rose-400">{chatError}</p>
        )}

        <form onSubmit={handleChatSubmit} className="flex gap-2.5">
          <label htmlFor="ai-chat-input" className="sr-only">
            Pregunta al consultor de hardware IA
          </label>
          <input
            id="ai-chat-input"
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ej. Probé pulsar el botón de la PSU y ahora..."
            className="flex-1 rounded-lg bg-[#0B0E14] border border-[#283347] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={isChatting || !chatInput.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isChatting ? 'Enviando...' : 'Enviar'}</span>
          </button>
        </form>
      </section>
    </div>
  );
};

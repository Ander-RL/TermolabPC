import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar, type NavTabId } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { LiveMonitorView } from './components/LiveMonitorView';
import { VoltageHistoryView } from './components/VoltageHistoryView';
import { ComponentsCuriositiesView } from './components/ComponentsCuriositiesView';
import { AlertsAndOsBridgeView } from './components/AlertsAndOsBridgeView';
import { AiConsultantView } from './components/AiConsultantView';
import { DEFAULT_HARDWARE_COMPONENTS } from './data/defaultHardware';
import type {
  AiChatMessage,
  AiDiagnosisReport,
  AlertRule,
  HardwareComponent,
  TelemetryProfileId,
  TelemetrySample,
  TriggeredAlert,
} from './types/hardware';
import {
  calculateVoltageStats,
  DEFAULT_ALERT_RULES,
  diagnoseFanAcousticCause,
  evaluateAlerts,
  formatTimeLabel,
  generateSimulationTick,
} from './utils/telemetryLogic';

const MAX_HISTORY = 45;
const STORAGE_COMPONENTS_KEY = 'termolab_components_v1';
const STORAGE_RULES_KEY = 'termolab_alert_rules_v1';

function buildInitialHistory(profile: Exclude<TelemetryProfileId, 'host-live'>): TelemetrySample[] {
  const now = Date.now();
  const samples: TelemetrySample[] = [];
  let prev: TelemetrySample | null = null;
  for (let i = 0; i < 20; i++) {
    const sample = generateSimulationTick(profile, prev, i, now - (19 - i) * 1000);
    samples.push(sample);
    prev = sample;
  }
  return samples;
}

function playAlertBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // Ignore audio context blocks when user has not interacted yet
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('monitor');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<TelemetryProfileId>('noisy-clean-pc');
  const [isStreaming, setIsStreaming] = useState(true);
  const [history, setHistory] = useState<TelemetrySample[]>(() =>
    buildInitialHistory('noisy-clean-pc'),
  );
  const tickRef = useRef(20);

  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RULES_KEY);
      if (saved) return JSON.parse(saved) as AlertRule[];
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_ALERT_RULES;
  });

  const [alertLog, setAlertLog] = useState<TriggeredAlert[]>([]);
  const lastLoggedRef = useRef<Record<string, number>>({});
  const [audibleAlarm, setAudibleAlarm] = useState(false);

  const [components, setComponents] = useState<HardwareComponent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COMPONENTS_KEY);
      if (saved) return JSON.parse(saved) as HardwareComponent[];
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_HARDWARE_COMPONENTS;
  });

  const [hostStatus, setHostStatus] = useState({
    osLabel: 'Detectando...',
    cpuModel: 'Detectando...',
    cores: 0,
    lhmConnected: false,
    sensorsCount: 0,
    loading: false,
  });

  // AI Consultant State
  const [aiReport, setAiReport] = useState<AiDiagnosisReport | null>(null);
  const [isAiDiagnosing, setIsAiDiagnosing] = useState(false);
  const [aiDiagnoseError, setAiDiagnoseError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([]);
  const [isAiChatting, setIsAiChatting] = useState(false);
  const [aiChatError, setAiChatError] = useState<string | null>(null);
  const [completedTests, setCompletedTests] = useState<Record<string, boolean>>({});
  const [preselectedComponent, setPreselectedComponent] = useState<HardwareComponent | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMPONENTS_KEY, JSON.stringify(components));
    } catch {
      // Ignore storage quota errors
    }
  }, [components]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RULES_KEY, JSON.stringify(alertRules));
    } catch {
      // Ignore storage quota errors
    }
  }, [alertRules]);

  const fetchHostSnapshot = useCallback(async (): Promise<TelemetrySample | null> => {
    try {
      const res = await fetch('/api/telemetry/host');
      if (!res.ok) return null;
      const data = await res.json();
      const osLabel = `${data.os?.distro || data.os?.platform || 'Host'} (${data.os?.arch || ''})`.trim();

      setHostStatus({
        osLabel,
        cpuModel: data.os?.cpuModel || 'CPU Host',
        cores: data.os?.cores || 0,
        lhmConnected: Boolean(data.bridge?.libreHardwareMonitorConnected),
        sensorsCount: data.bridge?.detectedSensorsCount || 0,
        loading: false,
      });

      const now = data.timestamp || Date.now();
      const m = data.metrics || {};
      const v = m.voltages || {};
      const cpuTemp = m.cpuTemp ?? 48;
      const gpuTemp = m.gpuTemp ?? 44;

      return {
        id: `host-${now}`,
        timestamp: now,
        timeLabel: formatTimeLabel(now),
        sourceLabel: data.bridge?.libreHardwareMonitorConnected
          ? 'LibreHardwareMonitor (Windows 10 en vivo)'
          : 'Host Real del Sistema (Sensores SO)',
        osPlatform: osLabel,
        cpuTemp,
        cpuHotspot: cpuTemp + 6,
        gpuTemp,
        gpuHotspot: m.gpuHotspot ?? gpuTemp + 8,
        vrmTemp: 46,
        nvmeTemp: 41,
        ambientTemp: 24,
        cpuLoad: m.cpuLoad ?? 12,
        gpuLoad: data.bridge?.libreHardwareMonitorConnected ? 18 : 0,
        ramUsedPct: m.ramUsedPct ?? 35,
        ramUsedGb: m.ramUsedGb ?? 8,
        ramTotalGb: m.ramTotalGb ?? 16,
        powerWatts: Math.round(55 + (m.cpuLoad ?? 10) * 1.4),
        fans: {
          cpuFanRpm: m.cpuFanRpm ?? 0,
          cpuFanPct: m.cpuFanRpm ? Math.min(100, Math.round((m.cpuFanRpm / 2200) * 100)) : 0,
          aioPumpRpm: 0,
          sysFan1Rpm: 0,
          sysFan2Rpm: 0,
          gpuFanRpm: m.gpuFanRpm ?? 0,
          gpuFanPct: m.gpuFanRpm ? Math.min(100, Math.round((m.gpuFanRpm / 2600) * 100)) : 0,
          psuFanRpm: 0,
        },
        voltages: {
          rail12v: v.rail12v ?? 12.01,
          rail5v: v.rail5v ?? 5.01,
          rail33v: v.rail33v ?? 3.31,
          vcore: v.vcore ?? 1.15,
          dramVdd: 1.35,
        },
      };
    } catch {
      setHostStatus((prev) => ({ ...prev, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    void fetchHostSnapshot();
  }, [fetchHostSnapshot]);

  // Real-time 1 Hz Telemetry Loop
  useEffect(() => {
    if (!isStreaming) return;

    const timer = window.setInterval(async () => {
      tickRef.current += 1;
      if (profile === 'host-live') {
        const hostSample = await fetchHostSnapshot();
        if (hostSample) {
          setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), hostSample]);
        }
      } else {
        setHistory((prev) => {
          const last = prev[prev.length - 1] ?? null;
          const next = generateSimulationTick(profile, last, tickRef.current);
          return [...prev.slice(-(MAX_HISTORY - 1)), next];
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isStreaming, profile, fetchHostSnapshot]);

  const currentSample = history[history.length - 1];
  const voltageStats = useMemo(() => calculateVoltageStats(history), [history]);
  const acousticDiagnosis = useMemo(
    () => diagnoseFanAcousticCause(currentSample),
    [currentSample],
  );
  const activeAlerts = useMemo(
    () => evaluateAlerts(currentSample, alertRules),
    [currentSample, alertRules],
  );

  // Append newly triggered alerts to the chronological alert log (debounced 15s per rule+severity)
  useEffect(() => {
    if (activeAlerts.length === 0) return;
    const now = Date.now();
    const fresh: TriggeredAlert[] = [];

    for (const alert of activeAlerts) {
      const key = `${alert.ruleId}:${alert.severity}`;
      const lastTs = lastLoggedRef.current[key] ?? 0;
      if (now - lastTs >= 15000) {
        lastLoggedRef.current[key] = now;
        fresh.push(alert);
      }
    }

    if (fresh.length > 0) {
      setAlertLog((prev) => [...fresh, ...prev].slice(0, 60));
      if (audibleAlarm && fresh.some((a) => a.severity === 'critical')) {
        playAlertBeep();
      }
    }
  }, [activeAlerts, audibleAlarm]);

  const handleChangeProfile = (nextProfile: TelemetryProfileId) => {
    setProfile(nextProfile);
    if (nextProfile !== 'host-live') {
      tickRef.current = 20;
      setHistory(buildInitialHistory(nextProfile));
    } else {
      void fetchHostSnapshot().then((sample) => {
        if (sample) {
          setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), sample]);
        }
      });
    }
  };

  const handleUpdateRule = (id: string, patch: Partial<AlertRule>) => {
    setAlertRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const handleTestThermalSpike = () => {
    const spikeSample: TelemetrySample = {
      ...currentSample,
      id: `spike-${Date.now()}`,
      timestamp: Date.now(),
      timeLabel: formatTimeLabel(Date.now()),
      cpuTemp: 94.5,
      gpuHotspot: 102.4,
      vrmTemp: 96.0,
      fans: {
        ...currentSample.fans,
        cpuFanRpm: 2750,
        cpuFanPct: 100,
        gpuFanRpm: 3250,
        gpuFanPct: 100,
      },
    };
    setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), spikeSample]);
    if (audibleAlarm) playAlertBeep();
  };

  const handleRunAiDiagnose = async (userNote?: string) => {
    setActiveTab('ai');
    setIsAiDiagnosing(true);
    setAiDiagnoseError(null);

    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetry: currentSample,
          voltageStats,
          alerts: activeAlerts,
          components,
          userNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiDiagnoseError(data.error || 'No se pudo completar el diagnóstico IA.');
      } else {
        setAiReport(data as AiDiagnosisReport);
      }
    } catch (err) {
      setAiDiagnoseError(
        err instanceof Error ? err.message : 'Error de red al conectar con el servidor.',
      );
    } finally {
      setIsAiDiagnosing(false);
    }
  };

  const handleSendChatMessage = async (text: string) => {
    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: formatTimeLabel(Date.now()),
    };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setIsAiChatting(true);
    setAiChatError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextHistory,
          telemetry: currentSample,
          components,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiChatError(data.error || 'Error respondiendo en el chat.');
      } else {
        const botMsg: AiChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: data.timestamp || formatTimeLabel(Date.now()),
        };
        setChatMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      setAiChatError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setIsAiChatting(false);
    }
  };

  const criticalAlertsCount = activeAlerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="min-h-screen flex bg-[#0B0E14] text-[#E6EDF7]">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeAlertsCount={activeAlerts.length}
        criticalAlertsCount={criticalAlertsCount}
        isStreaming={isStreaming}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onRunAiDiagnosis={() => void handleRunAiDiagnose()}
          isAiDiagnosing={isAiDiagnosing}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'monitor' && (
            <LiveMonitorView
              current={currentSample}
              history={history}
              profile={profile}
              onChangeProfile={handleChangeProfile}
              isStreaming={isStreaming}
              onToggleStream={() => setIsStreaming((prev) => !prev)}
              diagnosis={acousticDiagnosis}
              activeAlerts={activeAlerts}
              hostBridgeInfo={{
                osLabel: hostStatus.osLabel,
                lhmConnected: hostStatus.lhmConnected,
                hasRealSensors: hostStatus.lhmConnected,
              }}
              onGoToComponents={() => setActiveTab('components')}
              onGoToAi={() => void handleRunAiDiagnose()}
            />
          )}

          {activeTab === 'voltages' && (
            <VoltageHistoryView history={history} stats={voltageStats} />
          )}

          {activeTab === 'components' && (
            <ComponentsCuriositiesView
              components={components}
              onAddComponent={(comp) => setComponents((prev) => [comp, ...prev])}
              onDeleteComponent={(id) =>
                setComponents((prev) => prev.filter((c) => c.id !== id))
              }
              onAskAiAboutComponent={(comp) => {
                setPreselectedComponent(comp);
                void handleRunAiDiagnose(
                  `Analiza específicamente este componente de mi PC: ${comp.model} (${comp.curiosity.title}). Dime qué hacer con su botón o configuración.`,
                );
              }}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsAndOsBridgeView
              rules={alertRules}
              onUpdateRule={handleUpdateRule}
              onResetRules={() => setAlertRules(DEFAULT_ALERT_RULES)}
              alertLog={alertLog}
              onClearAlertLog={() => setAlertLog([])}
              audibleAlarm={audibleAlarm}
              onToggleAudibleAlarm={() => setAudibleAlarm((prev) => !prev)}
              onTestThermalSpike={handleTestThermalSpike}
              hostStatus={hostStatus}
              onRefreshHostStatus={() => {
                setHostStatus((prev) => ({ ...prev, loading: true }));
                void fetchHostSnapshot();
              }}
            />
          )}

          {activeTab === 'ai' && (
            <AiConsultantView
              currentTelemetry={currentSample}
              report={aiReport}
              isDiagnosing={isAiDiagnosing}
              diagnoseError={aiDiagnoseError}
              onRunDiagnose={(note) => void handleRunAiDiagnose(note)}
              chatMessages={chatMessages}
              isChatting={isAiChatting}
              chatError={aiChatError}
              onSendChatMessage={(msg) => void handleSendChatMessage(msg)}
              completedTests={completedTests}
              onToggleTestDone={(id) =>
                setCompletedTests((prev) => ({ ...prev, [id]: !prev[id] }))
              }
              preselectedComponent={preselectedComponent}
            />
          )}
        </main>
      </div>
    </div>
  );
}

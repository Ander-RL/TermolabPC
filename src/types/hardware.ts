export type TelemetryProfileId =
  | 'noisy-clean-pc'
  | 'gaming-load'
  | 'silent-idle'
  | 'thermal-stress'
  | 'host-live';

export interface VoltageReadings {
  rail12v: number | null; // Nominal 12.00V (ATX ±5%: 11.40V - 12.60V)
  rail5v: number | null;  // Nominal 5.00V  (ATX ±5%: 4.75V - 5.25V)
  rail33v: number | null; // Nominal 3.30V  (ATX ±5%: 3.135V - 3.465V)
  vcore: number | null;   // CPU Core Voltage (typically 0.80V - 1.45V)
  dramVdd: number | null; // DDR4/DDR5 VDD (typically 1.20V - 1.35V)
}

export interface FanReadings {
  cpuFanRpm: number | null;
  cpuFanPct: number | null;
  aioPumpRpm: number | null;
  sysFan1Rpm: number | null;
  sysFan2Rpm: number | null;
  gpuFanRpm: number | null;
  gpuFanPct: number | null;
  psuFanRpm: number | null;
}

export interface TelemetrySample {
  id: string;
  timestamp: number;
  timeLabel: string;
  sourceLabel: string;
  osPlatform: string;
  requiresLhm?: boolean;
  lhmConnected?: boolean;
  cpuTemp: number | null;
  cpuHotspot: number | null;
  gpuTemp: number | null;
  gpuHotspot: number | null;
  gpuMemoryTemp?: number | null;
  vrmTemp: number | null;
  nvmeTemp: number | null;
  ambientTemp: number | null;
  cpuLoad: number;
  gpuLoad: number | null;
  ramUsedPct: number;
  ramUsedGb: number;
  ramTotalGb: number;
  powerWatts: number | null;
  fans: FanReadings;
  voltages: VoltageReadings;
}

export type AlertMetricKey =
  | 'cpuTemp'
  | 'gpuHotspot'
  | 'vrmTemp'
  | 'nvmeTemp'
  | 'fanRunaway'
  | 'rail12vDeviation';

export type AlertSeverity = 'warning' | 'critical';

export interface AlertRule {
  id: string;
  metric: AlertMetricKey;
  label: string;
  unit: string;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
  description: string;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  metric: AlertMetricKey;
  severity: AlertSeverity;
  title: string;
  detail: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  timestamp: number;
  timeLabel: string;
}

export interface VoltageRailStats {
  key: keyof VoltageReadings;
  label: string;
  nominal: number;
  minAllowed: number;
  maxAllowed: number;
  current: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  deviationPct: number | null;
  inSpec: boolean | null;
}

export interface AcousticDiagnosis {
  headline: string;
  severity: 'nominal' | 'warning' | 'critical' | 'unavailable';
  primaryCause: string;
  explanation: string;
  hotspotDeltaGpu: number | null;
  hotspotDeltaCpu: number | null;
  isFanRunawayAtLowLoad: boolean;
}

export type ComponentCategory =
  | 'psu'
  | 'motherboard'
  | 'gpu'
  | 'cpu_cooling'
  | 'ram_storage';

export interface HardwareCuriosity {
  title: string;
  physicalControl: string;
  verdict: 'press' | 'keep_off' | 'check_position';
  verdictLabel: string;
  explanation: string;
  recommendedAction: string;
}

export interface HardwareComponent {
  id: string;
  category: ComponentCategory;
  categoryLabel: string;
  model: string;
  yearsOld: number;
  specs: string;
  curiosity: HardwareCuriosity;
  recommendedConfig: string[];
}

export interface AiTestStep {
  id: string;
  title: string;
  howTo: string;
  expectedOutcome: string;
}

export interface AiDiagnosisReport {
  resumenVisual: string;
  causaRuidoVentiladores: string;
  veredictoBotonPsu: string;
  estadoVoltajes: string;
  pruebasRecomendadas: AiTestStep[];
  configuracionOptima: string[];
  generatedAt: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

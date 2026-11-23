export type TelemetryProfileId =
  | 'noisy-clean-pc'
  | 'gaming-load'
  | 'silent-idle'
  | 'thermal-stress'
  | 'host-live';

export interface VoltageReadings {
  rail12v: number; // Nominal 12.00V (ATX ±5%: 11.40V - 12.60V)
  rail5v: number;  // Nominal 5.00V  (ATX ±5%: 4.75V - 5.25V)
  rail33v: number; // Nominal 3.30V  (ATX ±5%: 3.135V - 3.465V)
  vcore: number;   // CPU Core Voltage (typically 0.80V - 1.45V)
  dramVdd: number; // DDR4/DDR5 VDD (typically 1.20V - 1.35V)
}

export interface FanReadings {
  cpuFanRpm: number;
  cpuFanPct: number;
  aioPumpRpm: number;
  sysFan1Rpm: number;
  sysFan2Rpm: number;
  gpuFanRpm: number;
  gpuFanPct: number;
  psuFanRpm: number;
}

export interface TelemetrySample {
  id: string;
  timestamp: number;
  timeLabel: string;
  sourceLabel: string;
  osPlatform: string;
  cpuTemp: number;
  cpuHotspot: number;
  gpuTemp: number;
  gpuHotspot: number;
  vrmTemp: number;
  nvmeTemp: number;
  ambientTemp: number;
  cpuLoad: number;
  gpuLoad: number;
  ramUsedPct: number;
  ramUsedGb: number;
  ramTotalGb: number;
  powerWatts: number;
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
  current: number;
  min: number;
  max: number;
  avg: number;
  deviationPct: number;
  inSpec: boolean;
}

export interface AcousticDiagnosis {
  headline: string;
  severity: 'nominal' | 'warning' | 'critical';
  primaryCause: string;
  explanation: string;
  hotspotDeltaGpu: number;
  hotspotDeltaCpu: number;
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

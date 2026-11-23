import type {
  AcousticDiagnosis,
  AlertRule,
  TelemetryProfileId,
  TelemetrySample,
  TriggeredAlert,
  VoltageRailStats,
  VoltageReadings,
} from '../types/hardware';

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round3(val: number): number {
  return Math.round(val * 1000) / 1000;
}

export function formatTimeLabel(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-cpu-temp',
    metric: 'cpuTemp',
    label: 'Temperatura Paquete CPU',
    unit: '°C',
    warningThreshold: 78,
    criticalThreshold: 88,
    enabled: true,
    description: 'Detecta picos térmicos por pasta térmica seca o bomba degradada.',
  },
  {
    id: 'rule-gpu-hotspot',
    metric: 'gpuHotspot',
    label: 'Punto Caliente GPU (Hotspot)',
    unit: '°C',
    warningThreshold: 88,
    criticalThreshold: 98,
    enabled: true,
    description: 'El Hotspot > 95°C fuerza los ventiladores de la GPU al 100% aunque el núcleo parezca fresco.',
  },
  {
    id: 'rule-vrm-temp',
    metric: 'vrmTemp',
    label: 'Temperatura VRM Placa Base',
    unit: '°C',
    warningThreshold: 80,
    criticalThreshold: 95,
    enabled: true,
    description: 'Fases de alimentación sobrecalentadas por falta de flujo de aire en caja.',
  },
  {
    id: 'rule-nvme-temp',
    metric: 'nvmeTemp',
    label: 'Temperatura SSD NVMe',
    unit: '°C',
    warningThreshold: 62,
    criticalThreshold: 72,
    enabled: true,
    description: 'Evita estrangulamiento térmico (thermal throttling) en unidades M.2.',
  },
  {
    id: 'rule-fan-runaway',
    metric: 'fanRunaway',
    label: 'Ventiladores al Máximo en Reposo',
    unit: 'RPM',
    warningThreshold: 1900,
    criticalThreshold: 2400,
    enabled: true,
    description: 'Alerta cuando los ventiladores superan el umbral con carga baja (< 35%).',
  },
  {
    id: 'rule-12v-dev',
    metric: 'rail12vDeviation',
    label: 'Desviación Raíl +12V (ATX)',
    unit: '%',
    warningThreshold: 3.0,
    criticalThreshold: 4.5,
    enabled: true,
    description: 'La norma ATX exige mantener el raíl +12V dentro de ±5% (11.40V - 12.60V).',
  },
];

export function evaluateAlerts(
  sample: TelemetrySample,
  rules: AlertRule[],
): TriggeredAlert[] {
  const triggered: TriggeredAlert[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    let currentValue = 0;
    let shouldEvaluate = true;

    switch (rule.metric) {
      case 'cpuTemp':
        currentValue = sample.cpuTemp;
        break;
      case 'gpuHotspot':
        currentValue = sample.gpuHotspot;
        break;
      case 'vrmTemp':
        currentValue = sample.vrmTemp;
        break;
      case 'nvmeTemp':
        currentValue = sample.nvmeTemp;
        break;
      case 'fanRunaway': {
        const peakFan = Math.max(sample.fans.cpuFanRpm, sample.fans.gpuFanRpm);
        const lowLoad = sample.cpuLoad < 35 && sample.gpuLoad < 35;
        shouldEvaluate = lowLoad;
        currentValue = peakFan;
        break;
      }
      case 'rail12vDeviation':
        currentValue = round1(Math.abs(((sample.voltages.rail12v - 12.0) / 12.0) * 100));
        break;
    }

    if (!shouldEvaluate) continue;

    if (currentValue >= rule.criticalThreshold) {
      triggered.push({
        id: `${rule.id}-${sample.timestamp}`,
        ruleId: rule.id,
        metric: rule.metric,
        severity: 'critical',
        title: `${rule.label}: Nivel Crítico`,
        detail: `Lectura de ${currentValue}${rule.unit} supera el umbral crítico (${rule.criticalThreshold}${rule.unit}).`,
        currentValue,
        thresholdValue: rule.criticalThreshold,
        unit: rule.unit,
        timestamp: sample.timestamp,
        timeLabel: sample.timeLabel,
      });
    } else if (currentValue >= rule.warningThreshold) {
      triggered.push({
        id: `${rule.id}-${sample.timestamp}`,
        ruleId: rule.id,
        metric: rule.metric,
        severity: 'warning',
        title: `${rule.label}: Advertencia`,
        detail: `Lectura de ${currentValue}${rule.unit} supera el aviso preventivo (${rule.warningThreshold}${rule.unit}).`,
        currentValue,
        thresholdValue: rule.warningThreshold,
        unit: rule.unit,
        timestamp: sample.timestamp,
        timeLabel: sample.timeLabel,
      });
    }
  }

  return triggered;
}

export function calculateVoltageStats(history: TelemetrySample[]): VoltageRailStats[] {
  const specs: Array<{
    key: keyof VoltageReadings;
    label: string;
    nominal: number;
    minAllowed: number;
    maxAllowed: number;
  }> = [
    { key: 'rail12v', label: 'Raíl +12V (ATX Principal)', nominal: 12.0, minAllowed: 11.4, maxAllowed: 12.6 },
    { key: 'rail5v', label: 'Raíl +5V (USB / SATA)', nominal: 5.0, minAllowed: 4.75, maxAllowed: 5.25 },
    { key: 'rail33v', label: 'Raíl +3.3V (Chipset / NVMe)', nominal: 3.3, minAllowed: 3.135, maxAllowed: 3.465 },
    { key: 'vcore', label: 'CPU Vcore (Núcleo)', nominal: 1.25, minAllowed: 0.75, maxAllowed: 1.48 },
    { key: 'dramVdd', label: 'DRAM VDD (Memoria)', nominal: 1.35, minAllowed: 1.15, maxAllowed: 1.45 },
  ];

  return specs.map((spec) => {
    if (history.length === 0) {
      return {
        ...spec,
        current: spec.nominal,
        min: spec.nominal,
        max: spec.nominal,
        avg: spec.nominal,
        deviationPct: 0,
        inSpec: true,
      };
    }

    const values = history.map((s) => s.voltages[spec.key]);
    const current = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    const deviationPct = round1(((current - spec.nominal) / spec.nominal) * 100);
    const inSpec = current >= spec.minAllowed && current <= spec.maxAllowed;

    return {
      ...spec,
      current: round3(current),
      min: round3(min),
      max: round3(max),
      avg: round3(avg),
      deviationPct,
      inSpec,
    };
  });
}

export function diagnoseFanAcousticCause(sample: TelemetrySample): AcousticDiagnosis {
  const hotspotDeltaGpu = round1(sample.gpuHotspot - sample.gpuTemp);
  const hotspotDeltaCpu = round1(sample.cpuHotspot - sample.cpuTemp);
  const lowLoad = sample.cpuLoad < 35 && sample.gpuLoad < 35;
  const peakFan = Math.max(sample.fans.cpuFanRpm, sample.fans.gpuFanRpm);
  const isFanRunawayAtLowLoad = lowLoad && peakFan >= 1900;

  if (hotspotDeltaGpu >= 18 && sample.gpuHotspot >= 88) {
    return {
      headline: 'Delta térmico GPU elevado: pasta térmica degradada (efecto pump-out)',
      severity: 'critical',
      primaryCause: 'Degradación térmica interna tras años de uso (no polvo)',
      explanation: `Aunque el núcleo GPU marca ${sample.gpuTemp}°C, el Hotspot alcanza ${sample.gpuHotspot}°C (diferencia de ${hotspotDeltaGpu}°C). Cuando el delta supera 15-18°C en un PC limpio, la pasta térmica de fábrica se ha secado o desplazado, disparando los ventiladores al ${sample.fans.gpuFanPct}% (${sample.fans.gpuFanRpm} RPM).`,
      hotspotDeltaGpu,
      hotspotDeltaCpu,
      isFanRunawayAtLowLoad,
    };
  }

  if (isFanRunawayAtLowLoad) {
    return {
      headline: 'Ventiladores desbocados con carga baja: curva BIOS / modo DC vs PWM',
      severity: 'warning',
      primaryCause: 'Control PWM mal configurado o curva agresiva tras actualización/reset de BIOS',
      explanation: `La carga del sistema es baja (CPU ${sample.cpuLoad}%, GPU ${sample.gpuLoad}%), pero los ventiladores giran a ${peakFan} RPM. Si el PC está limpio, revisa si un cabezal de placa base cambió de PWM a modo DC (voltaje fijo a 12V) o si el botón Eco/Hybrid de tu fuente está desactivado.`,
      hotspotDeltaGpu,
      hotspotDeltaCpu,
      isFanRunawayAtLowLoad,
    };
  }

  if (sample.cpuTemp >= 85 || sample.vrmTemp >= 85) {
    return {
      headline: 'Carga térmica sostenida: Vcore elevado o flujo de aire restringido',
      severity: 'critical',
      primaryCause: 'Voltaje automático agresivo (Vcore/PBO) o transferencia térmica deficiente',
      explanation: `CPU a ${sample.cpuTemp}°C (Vcore ${sample.voltages.vcore.toFixed(3)}V) y VRM a ${sample.vrmTemp}°C. Aplicar un ligero undervolt y suavizar la histéresis de los ventiladores reducirá drásticamente el ruido sin perder rendimiento.`,
      hotspotDeltaGpu,
      hotspotDeltaCpu,
      isFanRunawayAtLowLoad,
    };
  }

  return {
    headline: 'Acústica equilibrada y transferencia térmica estable',
    severity: 'nominal',
    primaryCause: 'Curva térmica dentro de parámetros normales',
    explanation: `Delta GPU Hotspot de ${hotspotDeltaGpu}°C y ventiladores en régimen moderado (${sample.fans.cpuFanRpm} RPM CPU / ${sample.fans.gpuFanRpm} RPM GPU).`,
    hotspotDeltaGpu,
    hotspotDeltaCpu,
    isFanRunawayAtLowLoad: false,
  };
}

interface ProfileTargets {
  label: string;
  cpuLoad: number;
  gpuLoad: number;
  cpuTemp: number;
  cpuHotspotOffset: number;
  gpuTemp: number;
  gpuHotspotOffset: number;
  vrmTemp: number;
  nvmeTemp: number;
  cpuFanRpm: number;
  cpuFanPct: number;
  aioPumpRpm: number;
  sysFan1Rpm: number;
  sysFan2Rpm: number;
  gpuFanRpm: number;
  gpuFanPct: number;
  psuFanRpm: number;
  vcore: number;
  rail12v: number;
  powerWatts: number;
}

const PROFILE_TARGETS: Record<Exclude<TelemetryProfileId, 'host-live'>, ProfileTargets> = {
  'noisy-clean-pc': {
    label: 'Simulación: PC Limpio con Ventiladores al 100% (Caso Reportado)',
    cpuLoad: 24,
    gpuLoad: 18,
    cpuTemp: 69,
    cpuHotspotOffset: 14,
    gpuTemp: 68,
    gpuHotspotOffset: 24, // 92°C Hotspot -> triggers 95%+ fan curve despite low load & clean dust!
    vrmTemp: 64,
    nvmeTemp: 51,
    cpuFanRpm: 2380,
    cpuFanPct: 96,
    aioPumpRpm: 2650,
    sysFan1Rpm: 1840,
    sysFan2Rpm: 1810,
    gpuFanRpm: 2890,
    gpuFanPct: 94,
    psuFanRpm: 1420,
    vcore: 1.385,
    rail12v: 11.88,
    powerWatts: 195,
  },
  'gaming-load': {
    label: 'Simulación: Carga Gaming 4K Exigente',
    cpuLoad: 64,
    gpuLoad: 97,
    cpuTemp: 76,
    cpuHotspotOffset: 10,
    gpuTemp: 74,
    gpuHotspotOffset: 15,
    vrmTemp: 71,
    nvmeTemp: 56,
    cpuFanRpm: 1620,
    cpuFanPct: 68,
    aioPumpRpm: 2680,
    sysFan1Rpm: 1320,
    sysFan2Rpm: 1290,
    gpuFanRpm: 2050,
    gpuFanPct: 66,
    psuFanRpm: 980,
    vcore: 1.312,
    rail12v: 11.91,
    powerWatts: 435,
  },
  'silent-idle': {
    label: 'Simulación: Objetivo Silencioso Optimizado (Tras Ajustes)',
    cpuLoad: 9,
    gpuLoad: 4,
    cpuTemp: 39,
    cpuHotspotOffset: 6,
    gpuTemp: 36,
    gpuHotspotOffset: 9,
    vrmTemp: 41,
    nvmeTemp: 39,
    cpuFanRpm: 720,
    cpuFanPct: 28,
    aioPumpRpm: 2150,
    sysFan1Rpm: 620,
    sysFan2Rpm: 600,
    gpuFanRpm: 0, // Zero RPM fan stop active!
    gpuFanPct: 0,
    psuFanRpm: 0, // PSU Eco / Hybrid mode active!
    vcore: 1.045,
    rail12v: 12.03,
    powerWatts: 74,
  },
  'thermal-stress': {
    label: 'Simulación: Prueba de Estrés Térmico Máximo',
    cpuLoad: 96,
    gpuLoad: 99,
    cpuTemp: 91,
    cpuHotspotOffset: 8,
    gpuTemp: 82,
    gpuHotspotOffset: 19,
    vrmTemp: 87,
    nvmeTemp: 65,
    cpuFanRpm: 2540,
    cpuFanPct: 100,
    aioPumpRpm: 2780,
    sysFan1Rpm: 1980,
    sysFan2Rpm: 1950,
    gpuFanRpm: 3120,
    gpuFanPct: 100,
    psuFanRpm: 1690,
    vcore: 1.415,
    rail12v: 11.72,
    powerWatts: 560,
  },
};

export function getProfileLabel(profile: TelemetryProfileId): string {
  if (profile === 'host-live') {
    return 'Host Real del Sistema (Sensores SO)';
  }
  return PROFILE_TARGETS[profile].label;
}

export function generateSimulationTick(
  profile: Exclude<TelemetryProfileId, 'host-live'>,
  prev: TelemetrySample | null,
  tickIndex: number,
  nowMs: number = Date.now(),
): TelemetrySample {
  const target = PROFILE_TARGETS[profile];
  // Deterministic organic oscillation + small micro-jitter
  const wave = Math.sin(tickIndex * 0.45);
  const fastWave = Math.cos(tickIndex * 1.15);

  const smooth = (prevVal: number | undefined, targetVal: number, amplitude: number, min: number, max: number) => {
    const base = prevVal === undefined ? targetVal : prevVal * 0.65 + targetVal * 0.35;
    return round1(clamp(base + wave * amplitude + fastWave * (amplitude * 0.4), min, max));
  };

  const cpuLoad = smooth(prev?.cpuLoad, target.cpuLoad, 3.2, 2, 100);
  const gpuLoad = smooth(prev?.gpuLoad, target.gpuLoad, 2.5, 0, 100);
  const cpuTemp = smooth(prev?.cpuTemp, target.cpuTemp, 1.4, 28, 105);
  const gpuTemp = smooth(prev?.gpuTemp, target.gpuTemp, 1.1, 26, 98);
  const gpuHotspot = round1(clamp(gpuTemp + target.gpuHotspotOffset + fastWave * 0.8, gpuTemp + 4, 112));
  const cpuHotspot = round1(clamp(cpuTemp + target.cpuHotspotOffset + wave * 0.6, cpuTemp + 3, 108));
  const vrmTemp = smooth(prev?.vrmTemp, target.vrmTemp, 0.9, 30, 110);
  const nvmeTemp = smooth(prev?.nvmeTemp, target.nvmeTemp, 0.4, 28, 85);

  const cpuFanRpm = Math.round(clamp(target.cpuFanRpm + wave * 35 + fastWave * 15, 0, 3200));
  const gpuFanRpm = target.gpuFanRpm === 0 ? 0 : Math.round(clamp(target.gpuFanRpm + wave * 42, 0, 3600));
  const psuFanRpm = target.psuFanRpm === 0 ? 0 : Math.round(clamp(target.psuFanRpm + fastWave * 22, 0, 2400));

  const rail12v = round3(clamp(target.rail12v + wave * 0.018 + fastWave * 0.008, 11.2, 12.7));
  const rail5v = round3(clamp(5.015 + fastWave * 0.011, 4.7, 5.3));
  const rail33v = round3(clamp(3.312 + wave * 0.007, 3.1, 3.5));
  const vcore = round3(clamp(target.vcore + wave * 0.016 - fastWave * 0.009, 0.72, 1.52));
  const dramVdd = round3(clamp(1.352 + fastWave * 0.003, 1.18, 1.42));

  return {
    id: `sim-${nowMs}-${tickIndex}`,
    timestamp: nowMs,
    timeLabel: formatTimeLabel(nowMs),
    sourceLabel: target.label,
    osPlatform: 'Windows 10 Pro (Perfil Diagnóstico)',
    cpuTemp,
    cpuHotspot,
    gpuTemp,
    gpuHotspot,
    vrmTemp,
    nvmeTemp,
    ambientTemp: 24.5,
    cpuLoad,
    gpuLoad,
    ramUsedPct: profile === 'silent-idle' ? 31.4 : profile === 'gaming-load' ? 68.2 : 44.8,
    ramUsedGb: profile === 'silent-idle' ? 10.1 : profile === 'gaming-load' ? 21.8 : 14.3,
    ramTotalGb: 32,
    powerWatts: Math.round(clamp(target.powerWatts + wave * 11, 45, 750)),
    fans: {
      cpuFanRpm,
      cpuFanPct: target.cpuFanPct,
      aioPumpRpm: Math.round(target.aioPumpRpm + fastWave * 18),
      sysFan1Rpm: Math.round(target.sysFan1Rpm + wave * 24),
      sysFan2Rpm: Math.round(target.sysFan2Rpm + fastWave * 20),
      gpuFanRpm,
      gpuFanPct: target.gpuFanPct,
      psuFanRpm,
    },
    voltages: {
      rail12v,
      rail5v,
      rail33v,
      vcore,
      dramVdd,
    },
  };
}

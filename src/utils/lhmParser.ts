export interface LhmNode {
  Text?: string;
  Value?: string;
  Type?: string;
  SensorId?: string;
  Children?: LhmNode[];
}

export interface FlattenedLhmSensor {
  path: string;
  category: string;
  text: string;
  value: string;
  sensorId?: string;
}

export interface ParsedLhmMetrics {
  cpuTemp: number | null;
  cpuHotspot: number | null;
  gpuTemp: number | null;
  gpuHotspot: number | null;
  gpuMemoryTemp: number | null;
  vrmTemp: number | null;
  nvmeTemp: number | null;
  gpuLoad: number | null;
  powerWatts: number | null;
  cpuFanRpm: number | null;
  aioPumpRpm: number | null;
  sysFan1Rpm: number | null;
  sysFan2Rpm: number | null;
  gpuFanRpm: number | null;
  gpuFanPct: number | null;
  psuFanRpm: number | null;
  rail12v: number | null;
  rail5v: number | null;
  rail33v: number | null;
  vcore: number | null;
  dramVdd: number | null;
}

export function parseLhmNumber(val?: string): number | null {
  if (!val) return null;
  // Ignore invalid placeholder values like "-" or "N/A"
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-' || /^n\/a$/i.test(trimmed)) return null;
  // LibreHardwareMonitor formats decimals with ',' in Spanish locale (e.g. "44,0 °C", "0,963 V")
  const normalized = trimmed.replace(',', '.');
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

const KNOWN_CATEGORIES = new Set([
  'voltages',
  'temperatures',
  'fans',
  'controls',
  'load',
  'powers',
  'clocks',
  'factors',
  'data',
  'throughput',
  'levels',
]);

export function flattenLhmNodes(
  node: LhmNode,
  trail: string[] = [],
  acc: FlattenedLhmSensor[] = [],
): FlattenedLhmSensor[] {
  const nextTrail = node.Text ? [...trail, node.Text] : trail;
  if (node.Value && node.Text) {
    // Infer category from ancestor folder name (e.g. "Temperatures", "Voltages", "Fans") or Type
    const categoryFromTrail = [...trail]
      .reverse()
      .find((segment) => KNOWN_CATEGORIES.has(segment.toLowerCase()));
    const category = (node.Type || categoryFromTrail || '').toLowerCase();

    acc.push({
      path: nextTrail.join(' > '),
      category,
      text: node.Text,
      value: node.Value,
      sensorId: node.SensorId,
    });
  }
  if (Array.isArray(node.Children)) {
    for (const child of node.Children) {
      flattenLhmNodes(child, nextTrail, acc);
    }
  }
  return acc;
}

interface SensorQuery {
  category?: string;
  unitRegex?: RegExp;
  patterns: RegExp[];
  excludePatterns?: RegExp[];
}

export function findLhmSensorValue(
  sensors: FlattenedLhmSensor[],
  query: SensorQuery,
): number | null {
  const candidates = sensors.filter((s) => {
    if (query.category) {
      const catMatch =
        s.category === query.category.toLowerCase() ||
        s.path.toLowerCase().includes(`> ${query.category.toLowerCase()} >`);
      if (!catMatch) return false;
    }
    if (query.unitRegex && !query.unitRegex.test(s.value)) {
      return false;
    }
    if (
      query.excludePatterns &&
      query.excludePatterns.some((ex) => ex.test(s.text) || ex.test(s.path))
    ) {
      return false;
    }
    return true;
  });

  for (const pattern of query.patterns) {
    const match = candidates.find(
      (s) => pattern.test(s.text) || pattern.test(s.path),
    );
    if (match) {
      const parsed = parseLhmNumber(match.value);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

export function extractLhmMetrics(sensors: FlattenedLhmSensor[]): ParsedLhmMetrics {
  const cpuTemp = findLhmSensorValue(sensors, {
    category: 'temperatures',
    unitRegex: /°[CF]/i,
    patterns: [
      /^Core \(Tctl\/Tdie\)$/i,
      /^CPU Package$/i,
      /^Package$/i,
      /^Core Max$/i,
      /^Tdie$/i,
      /^CPU$/i,
      /CPU.*Temp/i,
      /Core Average/i,
    ],
    excludePatterns: [/GPU/i],
  });

  const cpuHotspot = findLhmSensorValue(sensors, {
    category: 'temperatures',
    unitRegex: /°[CF]/i,
    patterns: [
      /^Core Max$/i,
      /^CCD1 \(Tdie\)$/i,
      /^CCD2 \(Tdie\)$/i,
      /CCD\d/i,
      /CPU.*Hot/i,
      /^Core \(Tctl\/Tdie\)$/i,
    ],
    excludePatterns: [/GPU/i],
  });

  const gpuTemp = findLhmSensorValue(sensors, {
    category: 'temperatures',
    unitRegex: /°[CF]/i,
    patterns: [/^GPU Core$/i, /GPU Core/i, /GPU Edge/i, /GPU Temperature/i],
  });

  const gpuHotspot = findLhmSensorValue(sensors, {
    category: 'temperatures',
    unitRegex: /°[CF]/i,
    patterns: [/^GPU Hot Spot$/i, /Hot ?Spot/i],
  });

  const gpuMemoryTemp = findLhmSensorValue(sensors, {
    category: 'temperatures',
    unitRegex: /°[CF]/i,
    patterns: [/GPU Memory Junction/i, /Memory Junction/i],
  });

  const vrmTemp = findLhmSensorValue(sensors, {
    category: 'temperatures',
    unitRegex: /°[CF]/i,
    patterns: [/VRM/i, /VR MOS/i, /MOSFET/i, /System/i, /Motherboard/i],
    excludePatterns: [/GPU/i],
  });

  const nvmeTemp = findLhmSensorValue(sensors, {
    category: 'temperatures',
    unitRegex: /°[CF]/i,
    patterns: [
      /NVMe/i,
      /Composite Temperature/i,
      /Samsung|WD|Western Digital|Crucial|Kingston|Sabrent|Corsair|Kioxia/i,
    ],
    excludePatterns: [/KHX|Memory|RAM|DIMM/i],
  });

  const gpuLoad = findLhmSensorValue(sensors, {
    category: 'load',
    unitRegex: /%/,
    patterns: [/^GPU Core$/i, /GPU Core/i, /D3D 3D/i],
  });

  const cpuPower = findLhmSensorValue(sensors, {
    category: 'powers',
    unitRegex: /\bW\b/i,
    patterns: [/^Package$/i, /CPU Package/i, /Core/i],
    excludePatterns: [/GPU/i],
  });
  const gpuPower = findLhmSensorValue(sensors, {
    category: 'powers',
    unitRegex: /\bW\b/i,
    patterns: [/^GPU Package$/i, /^GPU Power$/i, /GPU/i],
  });
  const powerWatts =
    cpuPower !== null || gpuPower !== null
      ? Math.round((cpuPower ?? 0) + (gpuPower ?? 0))
      : null;

  const cpuFanRpm = findLhmSensorValue(sensors, {
    category: 'fans',
    unitRegex: /RPM/i,
    patterns: [/^CPU Fan$/i, /CPU.*Fan/i, /^Fan #1$/i],
    excludePatterns: [/GPU/i, /PSU/i],
  });

  const aioPumpRpm = findLhmSensorValue(sensors, {
    category: 'fans',
    unitRegex: /RPM/i,
    patterns: [/Pump/i, /AIO/i, /CPU_OPT/i],
  });

  const sysFan1Rpm = findLhmSensorValue(sensors, {
    category: 'fans',
    unitRegex: /RPM/i,
    patterns: [/^System Fan #1$/i, /^Chassis Fan #1$/i, /^Case Fan #1$/i, /^Fan #2$/i],
  });

  const sysFan2Rpm = findLhmSensorValue(sensors, {
    category: 'fans',
    unitRegex: /RPM/i,
    patterns: [/^System Fan #2$/i, /^Chassis Fan #2$/i, /^Case Fan #2$/i, /^Fan #3$/i],
  });

  const gpuFanRpm = findLhmSensorValue(sensors, {
    category: 'fans',
    unitRegex: /RPM/i,
    patterns: [/^GPU Fan/i, /GPU.*Fan/i],
  });

  const gpuFanPct = findLhmSensorValue(sensors, {
    category: 'controls',
    unitRegex: /%/,
    patterns: [/^GPU Fan/i, /GPU.*Fan/i],
  });

  const psuFanRpm = findLhmSensorValue(sensors, {
    category: 'fans',
    unitRegex: /RPM/i,
    patterns: [/PSU Fan/i, /Power Supply/i],
  });

  const rail12v = findLhmSensorValue(sensors, {
    category: 'voltages',
    unitRegex: /\bV\b/i,
    patterns: [/^\+12V$/i, /\+12V/i, /^12V$/i],
  });

  const rail5v = findLhmSensorValue(sensors, {
    category: 'voltages',
    unitRegex: /\bV\b/i,
    patterns: [/^\+5V$/i, /\+5V/i, /^5V$/i],
    excludePatterns: [/5VSB/i],
  });

  const rail33v = findLhmSensorValue(sensors, {
    category: 'voltages',
    unitRegex: /\bV\b/i,
    patterns: [/^\+3\.3V$/i, /\+3\.3V/i, /^3\.3V$/i, /VCC3V/i, /3VCC/i],
  });

  const vcore = findLhmSensorValue(sensors, {
    category: 'voltages',
    unitRegex: /\bV\b/i,
    patterns: [
      /^Core \(SVI2 TFN\)$/i,
      /^Vcore$/i,
      /^CPU VCore$/i,
      /^CPU Core$/i,
      /^VID$/i,
      /^Core #1 VID$/i,
    ],
    excludePatterns: [/GPU/i],
  });

  const dramVdd = findLhmSensorValue(sensors, {
    category: 'voltages',
    unitRegex: /\bV\b/i,
    patterns: [/DRAM/i, /VDDQ/i, /DIMM/i],
  });

  return {
    cpuTemp,
    cpuHotspot,
    gpuTemp,
    gpuHotspot,
    gpuMemoryTemp,
    vrmTemp,
    nvmeTemp,
    gpuLoad,
    powerWatts,
    cpuFanRpm,
    aioPumpRpm,
    sysFan1Rpm,
    sysFan2Rpm,
    gpuFanRpm,
    gpuFanPct,
    psuFanRpm,
    rail12v,
    rail5v,
    rail33v,
    vcore,
    dramVdd,
  };
}

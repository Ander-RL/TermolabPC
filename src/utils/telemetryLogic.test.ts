import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVoltageStats,
  DEFAULT_ALERT_RULES,
  diagnoseFanAcousticCause,
  evaluateAlerts,
  generateSimulationTick,
} from './telemetryLogic';
import type { TelemetrySample } from '../types/hardware';

function createBaseSample(overrides: Partial<TelemetrySample> = {}): TelemetrySample {
  return {
    id: 'test-1',
    timestamp: 1700000000000,
    timeLabel: '12:00:00',
    sourceLabel: 'Test Rig',
    osPlatform: 'Windows 10',
    cpuTemp: 45,
    cpuHotspot: 52,
    gpuTemp: 42,
    gpuHotspot: 50,
    vrmTemp: 48,
    nvmeTemp: 40,
    ambientTemp: 24,
    cpuLoad: 15,
    gpuLoad: 10,
    ramUsedPct: 35,
    ramUsedGb: 11.2,
    ramTotalGb: 32,
    powerWatts: 90,
    fans: {
      cpuFanRpm: 900,
      cpuFanPct: 35,
      aioPumpRpm: 2200,
      sysFan1Rpm: 750,
      sysFan2Rpm: 740,
      gpuFanRpm: 0,
      gpuFanPct: 0,
      psuFanRpm: 0,
    },
    voltages: {
      rail12v: 12.02,
      rail5v: 5.01,
      rail33v: 3.31,
      vcore: 1.12,
      dramVdd: 1.35,
    },
    ...overrides,
  };
}

test('evaluateAlerts detects critical GPU Hotspot and fan runaway at low load', () => {
  const sample = createBaseSample({
    cpuLoad: 18,
    gpuLoad: 12,
    gpuTemp: 70,
    gpuHotspot: 99,
    fans: {
      cpuFanRpm: 2450,
      cpuFanPct: 98,
      aioPumpRpm: 2600,
      sysFan1Rpm: 1800,
      sysFan2Rpm: 1800,
      gpuFanRpm: 2950,
      gpuFanPct: 95,
      psuFanRpm: 1300,
    },
  });

  const alerts = evaluateAlerts(sample, DEFAULT_ALERT_RULES);
  const metrics = alerts.map((a) => `${a.metric}:${a.severity}`);

  assert.ok(metrics.includes('gpuHotspot:critical'));
  assert.ok(metrics.includes('fanRunaway:critical'));
});

test('evaluateAlerts flags out-of-spec 12V rail deviation', () => {
  const sample = createBaseSample({
    voltages: {
      rail12v: 11.38,
      rail5v: 5.0,
      rail33v: 3.3,
      vcore: 1.2,
      dramVdd: 1.35,
    },
  });

  const alerts = evaluateAlerts(sample, DEFAULT_ALERT_RULES);
  const railAlert = alerts.find((a) => a.metric === 'rail12vDeviation');

  assert.ok(railAlert);
  assert.equal(railAlert.severity, 'critical');
});

test('evaluateAlerts ignores null sensors when LibreHardwareMonitor is not installed', () => {
  const sample = createBaseSample({
    requiresLhm: true,
    cpuTemp: null,
    cpuHotspot: null,
    gpuTemp: null,
    gpuHotspot: null,
    vrmTemp: null,
    nvmeTemp: null,
    fans: {
      cpuFanRpm: null,
      cpuFanPct: null,
      aioPumpRpm: null,
      sysFan1Rpm: null,
      sysFan2Rpm: null,
      gpuFanRpm: null,
      gpuFanPct: null,
      psuFanRpm: null,
    },
    voltages: {
      rail12v: null,
      rail5v: null,
      rail33v: null,
      vcore: null,
      dramVdd: null,
    },
  });

  const alerts = evaluateAlerts(sample, DEFAULT_ALERT_RULES);
  assert.equal(alerts.length, 0);
});

test('calculateVoltageStats computes min, max, avg and ATX tolerance accurately and returns null when unavailable', () => {
  const s1 = createBaseSample({
    voltages: { rail12v: 12.0, rail5v: 5.0, rail33v: 3.3, vcore: 1.2, dramVdd: 1.35 },
  });
  const s2 = createBaseSample({
    voltages: { rail12v: 11.3, rail5v: 5.04, rail33v: 3.32, vcore: 1.3, dramVdd: 1.35 },
  });

  const stats = calculateVoltageStats([s1, s2]);
  const rail12 = stats.find((r) => r.key === 'rail12v');
  assert.ok(rail12);
  assert.equal(rail12.min, 11.3);
  assert.equal(rail12.max, 12.0);
  assert.equal(rail12.avg, 11.65);
  assert.equal(rail12.inSpec, false);

  const nullSample = createBaseSample({
    voltages: { rail12v: null, rail5v: null, rail33v: null, vcore: null, dramVdd: null },
  });
  const nullStats = calculateVoltageStats([nullSample]);
  assert.equal(nullStats[0].current, null);
  assert.equal(nullStats[0].inSpec, null);
});

test('diagnoseFanAcousticCause identifies unavailable sensors when LHM is missing', () => {
  const sample = createBaseSample({
    requiresLhm: true,
    cpuTemp: null,
    gpuTemp: null,
    gpuHotspot: null,
    fans: {
      cpuFanRpm: null,
      cpuFanPct: null,
      aioPumpRpm: null,
      sysFan1Rpm: null,
      sysFan2Rpm: null,
      gpuFanRpm: null,
      gpuFanPct: null,
      psuFanRpm: null,
    },
    voltages: {
      rail12v: null,
      rail5v: null,
      rail33v: null,
      vcore: null,
      dramVdd: null,
    },
  });

  const diagnosis = diagnoseFanAcousticCause(sample);
  assert.equal(diagnosis.severity, 'unavailable');
  assert.match(diagnosis.headline, /LibreHardwareMonitor/i);
});

test('diagnoseFanAcousticCause identifies dried thermal paste pump-out when GPU hotspot delta >= 18C', () => {
  const noisySample = generateSimulationTick('noisy-clean-pc', null, 1, 1700000000000);
  const diagnosis = diagnoseFanAcousticCause(noisySample);

  assert.equal(diagnosis.severity, 'critical');
  assert.ok(diagnosis.hotspotDeltaGpu !== null && diagnosis.hotspotDeltaGpu >= 18);
  assert.match(diagnosis.headline, /Delta térmico GPU/i);
});

test('diagnoseFanAcousticCause identifies nominal quiet operation on silent-idle profile', () => {
  const quietSample = generateSimulationTick('silent-idle', null, 2, 1700000000000);
  const diagnosis = diagnoseFanAcousticCause(quietSample);

  assert.equal(diagnosis.severity, 'nominal');
  assert.equal(diagnosis.isFanRunawayAtLowLoad, false);
});

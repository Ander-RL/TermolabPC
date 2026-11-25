import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLhmMetrics,
  flattenLhmNodes,
  parseLhmNumber,
  type LhmNode,
} from './lhmParser';

test('parseLhmNumber parses Spanish comma decimals and units cleanly', () => {
  assert.equal(parseLhmNumber('44,0 °C'), 44);
  assert.equal(parseLhmNumber('0,963 V'), 0.963);
  assert.equal(parseLhmNumber('2,0 %'), 2);
  assert.equal(parseLhmNumber('-'), null);
});

test('extractLhmMetrics accurately reads AMD Ryzen + NVIDIA RTX 3080 tree without Clocks shadowing Temperatures', () => {
  const sampleTree: LhmNode = {
    Text: 'Sensor',
    Children: [
      {
        Text: 'DESKTOP-PC',
        Children: [
          {
            Text: 'MSI B450 TOMAHAWK',
            Children: [
              {
                Text: 'Nuvoton NCT6797D',
                Children: [
                  {
                    Text: 'Voltages',
                    Children: [
                      { Text: '+12V', Value: '12,096 V' },
                      { Text: '+5V', Value: '5,040 V' },
                      { Text: '3VCC', Value: '3,328 V' },
                    ],
                  },
                  {
                    Text: 'Temperatures',
                    Children: [{ Text: 'VRM MOS', Value: '47,0 °C' }],
                  },
                  {
                    Text: 'Fans',
                    Children: [
                      { Text: 'CPU Fan', Value: '1150 RPM' },
                      { Text: 'System Fan #1', Value: '890 RPM' },
                    ],
                  },
                  {
                    Text: 'Controls',
                    Children: [{ Text: 'CPU Fan', Value: '45,0 %' }],
                  },
                ],
              },
            ],
          },
          {
            Text: 'AMD Ryzen 5 3600',
            Children: [
              {
                Text: 'Voltages',
                Children: [
                  { Text: 'Core (SVI2 TFN)', Value: '0,963 V' },
                  { Text: 'SoC (SVI2 TFN)', Value: '0,969 V' },
                ],
              },
              {
                Text: 'Powers',
                Children: [{ Text: 'Package', Value: '38,5 W' }],
              },
              {
                Text: 'Temperatures',
                Children: [
                  { Text: 'Core (Tctl/Tdie)', Value: '30,5 °C' },
                  { Text: 'CCD2 (Tdie)', Value: '26,3 °C' },
                ],
              },
            ],
          },
          {
            Text: 'NVIDIA GeForce RTX 3080',
            Children: [
              {
                Text: 'Voltages',
                Children: [{ Text: 'GPU Core Voltage', Value: '0,725 V' }],
              },
              {
                Text: 'Powers',
                Children: [{ Text: 'GPU Package', Value: '24,2 W' }],
              },
              {
                Text: 'Clocks',
                // Deliberately placed BEFORE Temperatures to verify Clocks never shadow Temperatures!
                Children: [{ Text: 'GPU Core', Value: '210,0 MHz' }],
              },
              {
                Text: 'Temperatures',
                Children: [
                  { Text: 'GPU Core', Value: '44,0 °C' },
                  { Text: 'GPU Hot Spot', Value: '54,0 °C' },
                  { Text: 'GPU Memory Junction', Value: '50,0 °C' },
                ],
              },
              {
                Text: 'Load',
                Children: [{ Text: 'GPU Core', Value: '2,0 %' }],
              },
              {
                Text: 'Fans',
                Children: [{ Text: 'GPU Fan 1', Value: '0 RPM' }],
              },
              {
                Text: 'Controls',
                Children: [{ Text: 'GPU Fan', Value: '0,0 %' }],
              },
            ],
          },
        ],
      },
    ],
  };

  const flattened = flattenLhmNodes(sampleTree);
  const metrics = extractLhmMetrics(flattened);

  assert.equal(metrics.cpuTemp, 30.5);
  assert.equal(metrics.cpuHotspot, 26.3);
  assert.equal(metrics.gpuTemp, 44);
  assert.equal(metrics.gpuHotspot, 54);
  assert.equal(metrics.gpuMemoryTemp, 50);
  assert.equal(metrics.gpuLoad, 2);
  assert.equal(metrics.vcore, 0.963);
  assert.equal(metrics.rail12v, 12.096);
  assert.equal(metrics.rail5v, 5.04);
  assert.equal(metrics.rail33v, 3.328);
  assert.equal(metrics.vrmTemp, 47);
  assert.equal(metrics.cpuFanRpm, 1150);
  assert.equal(metrics.sysFan1Rpm, 890);
  assert.equal(metrics.gpuFanRpm, 0);
  assert.equal(metrics.gpuFanPct, 0);
  assert.equal(metrics.powerWatts, 63); // 38.5 + 24.2 rounded
});

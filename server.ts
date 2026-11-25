import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import si from 'systeminformation';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  extractLhmMetrics,
  flattenLhmNodes,
  type FlattenedLhmSensor,
  type LhmNode,
} from './src/utils/lhmParser';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function fetchLhmJson(url: string, timeoutMs = 800): Promise<LhmNode | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as LhmNode;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function probeLibreHardwareMonitor(): Promise<{
  connected: boolean;
  endpoint: string | null;
  sensors: FlattenedLhmSensor[];
}> {
  const endpoints = [
    'http://127.0.0.1:8085/data.json',
    'http://localhost:8085/data.json',
  ];

  for (const url of endpoints) {
    const data = await fetchLhmJson(url, 800);
    if (data) {
      const sensors = flattenLhmNodes(data);
      if (sensors.length > 0) {
        return { connected: true, endpoint: url, sensors };
      }
    }
  }

  return { connected: false, endpoint: null, sensors: [] };
}

async function probeNvidiaSmi(): Promise<{
  gpuTemp: number | null;
  gpuLoad: number | null;
  gpuFanPct: number | null;
  powerWatts: number | null;
}> {
  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi',
      [
        '--query-gpu=temperature.gpu,utilization.gpu,fan.speed,power.draw',
        '--format=csv,noheader,nounits',
      ],
      { timeout: 500 },
    );
    const firstLine = stdout.trim().split('\n')[0];
    if (!firstLine) return { gpuTemp: null, gpuLoad: null, gpuFanPct: null, powerWatts: null };
    const [t, u, f, p] = firstLine.split(',').map((part) => {
      const n = Number(part.trim());
      return Number.isFinite(n) ? n : null;
    });
    return { gpuTemp: t ?? null, gpuLoad: u ?? null, gpuFanPct: f ?? null, powerWatts: p ?? null };
  } catch {
    return { gpuTemp: null, gpuLoad: null, gpuFanPct: null, powerWatts: null };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get('/api/telemetry/host', async (_req: Request, res: Response) => {
    try {
      const [cpu, load, temp, mem, osInfo, lhm] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
        si.cpuTemperature(),
        si.mem(),
        si.osInfo(),
        probeLibreHardwareMonitor(),
      ]);

      const nvidia = lhm.connected ? null : await probeNvidiaSmi();

      const now = Date.now();
      const lhmSensors = lhm.sensors;
      const parsed = extractLhmMetrics(lhmSensors);

      const realCpuTemp =
        parsed.cpuTemp ?? (temp.main && temp.main > 0 ? temp.main : null);
      const realCpuHotspot = parsed.cpuHotspot;
      const realGpuTemp = parsed.gpuTemp ?? nvidia?.gpuTemp ?? null;
      const realGpuHotspot = parsed.gpuHotspot;
      const realGpuMemoryTemp = parsed.gpuMemoryTemp;
      const realVrmTemp = parsed.vrmTemp;
      const realNvmeTemp = parsed.nvmeTemp;
      const realGpuLoad = parsed.gpuLoad ?? nvidia?.gpuLoad ?? null;
      const realPowerWatts = parsed.powerWatts ?? nvidia?.powerWatts ?? null;

      const realCpuFan = parsed.cpuFanRpm;
      const realAioPump = parsed.aioPumpRpm;
      const realSysFan1 = parsed.sysFan1Rpm;
      const realSysFan2 = parsed.sysFan2Rpm;
      const realGpuFan = parsed.gpuFanRpm;
      const realGpuFanPct = parsed.gpuFanPct ?? nvidia?.gpuFanPct ?? null;
      const realPsuFan = parsed.psuFanRpm;

      const real12v = parsed.rail12v;
      const real5v = parsed.rail5v;
      const real33v = parsed.rail33v;
      const realVcore = parsed.vcore;
      const realDramVdd = parsed.dramVdd;

      const ramTotalGb = Math.round((mem.total / (1024 ** 3)) * 10) / 10;
      const ramUsedGb = Math.round((mem.active / (1024 ** 3)) * 10) / 10;
      const ramUsedPct = Math.round((mem.active / mem.total) * 1000) / 10;

      const previewCategories = new Set([
        'temperatures',
        'voltages',
        'fans',
        'controls',
        'powers',
        'load',
      ]);
      const prioritizedSensors = lhmSensors.filter((s) =>
        previewCategories.has(s.category),
      );
      const detectedSensorsPreview = (
        prioritizedSensors.length > 0 ? prioritizedSensors : lhmSensors
      )
        .slice(0, 60)
        .map((s) => ({
          category: s.category || 'sensor',
          text: s.text,
          value: s.value,
          path: s.path,
        }));

      res.json({
        timestamp: now,
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          arch: osInfo.arch,
          hostname: osInfo.hostname,
          cpuModel: `${cpu.manufacturer} ${cpu.brand}`.trim(),
          cores: cpu.cores,
        },
        bridge: {
          libreHardwareMonitorConnected: lhm.connected,
          endpoint: lhm.endpoint,
          detectedSensorsCount: lhmSensors.length,
          detectedSensorsPreview,
          hasThermalSensors: realCpuTemp !== null || realGpuTemp !== null,
          hasVoltageSensors: real12v !== null || realVcore !== null,
          hasFanSensors: realCpuFan !== null || realGpuFan !== null,
        },
        metrics: {
          cpuLoad: Math.round(load.currentLoad * 10) / 10,
          gpuLoad: realGpuLoad,
          ramUsedPct,
          ramUsedGb,
          ramTotalGb,
          powerWatts: realPowerWatts,
          cpuTemp: realCpuTemp,
          cpuHotspot: realCpuHotspot,
          gpuTemp: realGpuTemp,
          gpuHotspot: realGpuHotspot,
          gpuMemoryTemp: realGpuMemoryTemp,
          vrmTemp: realVrmTemp,
          nvmeTemp: realNvmeTemp,
          cpuFanRpm: realCpuFan,
          aioPumpRpm: realAioPump,
          sysFan1Rpm: realSysFan1,
          sysFan2Rpm: realSysFan2,
          gpuFanRpm: realGpuFan,
          gpuFanPct: realGpuFanPct,
          psuFanRpm: realPsuFan,
          voltages: {
            rail12v: real12v,
            rail5v: real5v,
            rail33v: real33v,
            vcore: realVcore,
            dramVdd: realDramVdd,
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error leyendo sensores del sistema';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/telemetry/bridge-script', (_req: Request, res: Response) => {
    const scriptContent = `# TermoLab PC — Puente de Sensores Windows 10 (Independiente del SO en Node.js)
# 1. Descarga LibreHardwareMonitor (https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases)
# 2. Ejecútalo como Administrador -> Options -> Remote Web Server -> Run (puerto 8085)
# 3. Este script verifica el endpoint local de sensores y también lee temperatura WMI/ACPI si está disponible:

Write-Host "Comprobando LibreHardwareMonitor en http://127.0.0.1:8085/data.json ..." -ForegroundColor Cyan
try {
  $lhm = Invoke-RestMethod -Uri "http://127.0.0.1:8085/data.json" -TimeoutSec 2
  Write-Host "CONECTADO: LibreHardwareMonitor activo. TermoLab PC leerá voltajes, RPM y Hotspot reales." -ForegroundColor Green
} catch {
  Write-Host "AVISO: LibreHardwareMonitor no responde en el puerto 8085." -ForegroundColor Yellow
  Write-Host "Activa 'Options -> Remote Web Server -> Run' en LibreHardwareMonitor." -ForegroundColor Gray
}

Write-Host "\nResumen rápido WMI Windows 10:" -ForegroundColor Cyan
Get-CimInstance Win32_Processor | Select-Object Name, LoadPercentage, CurrentClockSpeed | Format-Table -AutoSize
Get-CimInstance Win32_Fan | Select-Object Name, DesiredSpeed, Status | Format-Table -AutoSize
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="TermoLab-Windows10-Bridge.ps1"');
    res.send(scriptContent);
  });

  app.post('/api/ai/diagnose', async (req: Request, res: Response) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(400).json({
        error: 'No se detectó GEMINI_API_KEY configurada en el servidor.',
        code: 'MISSING_API_KEY',
      });
      return;
    }

    const { telemetry, voltageStats, alerts, components, userNote } = req.body ?? {};
    if (!telemetry) {
      res.status(400).json({ error: 'Faltan datos de telemetría para analizar.' });
      return;
    }

    try {
      const prompt = `Eres un ingeniero senior especialista en hardware PC Master Race, termodinámica de chasis, fuentes ATX y electrónica de placas base.
Responde siempre en ESPAÑOL claro, directo, práctico y técnico.

El usuario tiene un PC montado hace unos años que está COMPLETAMENTE LIMPIO DE POLVO, pero los ventiladores parecen estar al 100% haciendo mucho ruido (antes era sigiloso). Tiene Windows 10 y también tiene un botón curioso en su fuente de alimentación (PSU) que no recuerda para qué sirve.

Analiza los datos EN TIEMPO REAL que estás viendo ahora mismo:

=== TELEMETRÍA ACTUAL ===
${JSON.stringify(telemetry, null, 2)}

=== ESTADÍSTICAS DE VOLTAJES ===
${JSON.stringify(voltageStats ?? [], null, 2)}

=== ALERTAS ACTIVAS ===
${JSON.stringify(alerts ?? [], null, 2)}

=== COMPONENTES E INVENTARIO DEL USUARIO ===
${JSON.stringify(components ?? [], null, 2)}

=== NOTA ADICIONAL DEL USUARIO ===
${userNote || 'Ninguna nota extra.'}

Proporciona un diagnóstico preciso basado en los números reales que ves:
1. Qué ves en las temperaturas, deltas (especialmente GPU Edge vs GPU Hotspot y CPU Temp vs Load) y RPM.
2. Por qué los ventiladores están al máximo aunque el PC esté limpio de polvo.
3. Qué hace el botón físico de su fuente de alimentación (Hybrid/Eco/Zero-RPM o similar) y si DEBE presionarlo o dejarlo desactivado según sus lecturas actuales.
4. Qué ves en los voltajes (+12V, +5V, +3.3V, Vcore).
5. Pruebas seguras concretas que el usuario puede hacer ahora mismo en su PC para aislar el culpable.
6. Configuración recomendada paso a paso (BIOS, Windows 10, FanControl/Afterburner) para recuperar el silencio original sin perder rendimiento.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres un consultor experto en hardware PC, diagnóstico térmico y acústico. Responde únicamente con JSON válido según el esquema proporcionado.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumenVisual: {
                type: Type.STRING,
                description: 'Resumen concreto de lo que observa la IA en la telemetría actual.',
              },
              causaRuidoVentiladores: {
                type: Type.STRING,
                description: 'Explicación técnica de por qué suenan al máximo aunque no haya polvo.',
              },
              veredictoBotonPsu: {
                type: Type.STRING,
                description: 'Explicación del botón de la fuente y recomendación clara de presionarlo o no.',
              },
              estadoVoltajes: {
                type: Type.STRING,
                description: 'Valoración de estabilidad de los raíles +12V, +5V, +3.3V y Vcore.',
              },
              pruebasRecomendadas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    howTo: { type: Type.STRING },
                    expectedOutcome: { type: Type.STRING },
                  },
                },
                description: 'Lista de 3 a 4 pruebas prácticas paso a paso para comprobar el problema.',
              },
              configuracionOptima: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista de 4 a 6 pasos concretos de configuración recomendada (BIOS, Windows 10, curvas).',
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({
        ...parsed,
        generatedAt: new Date().toLocaleTimeString('es-ES', { hour12: false }),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error consultando a Gemini AI';
      const status = (err as { status?: number })?.status || 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
        code: status === 403 || status === 400 ? 'API_KEY_ERROR' : 'GEMINI_UPSTREAM_ERROR',
      });
    }
  });

  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(400).json({
        error: 'No se detectó GEMINI_API_KEY configurada en el servidor.',
        code: 'MISSING_API_KEY',
      });
      return;
    }

    const { message, history, telemetry, components } = req.body ?? {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'El mensaje está vacío.' });
      return;
    }

    try {
      const formattedHistory = Array.isArray(history)
        ? history
            .slice(-8)
            .map((m: { role: string; content: string }) =>
              `${m.role === 'user' ? 'Usuario' : 'Consultor IA'}: ${m.content}`,
            )
            .join('\n')
        : '';

      const prompt = `Contexto actual de telemetría del PC:
${JSON.stringify(telemetry ?? {}, null, 2)}

Componentes registrados:
${JSON.stringify(components ?? [], null, 2)}

Historial reciente de la conversación:
${formattedHistory}

Nueva pregunta o resultado de prueba del usuario:
${message}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres TermoLab IA, un ingeniero senior de hardware PC en español. Das respuestas claras, prácticas y seguras sobre BIOS, ventiladores PWM/DC, botones de fuente de alimentación (Hybrid/Eco), voltajes ATX, pasta térmica y Windows 10. Haz referencia directa a los valores de telemetría que ves.',
        },
      });

      res.json({
        reply: response.text ?? 'No se pudo generar una respuesta.',
        timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false }),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en chat con Gemini AI';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TermoLab PC server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TermoLab PC server:', err);
  process.exit(1);
});

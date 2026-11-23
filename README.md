# TermoLab PC — Monitorización Térmica, Voltajes y Diagnóstico con IA

Panel de control multiplataforma en modo oscuro diseñado para diagnosticar problemas reales de hardware en ordenadores de sobremesa (**PC Master Race**): ventiladores al 100% incluso con el equipo limpio de polvo, degradación térmica tras años de uso, estabilidad de voltajes ATX, curiosidades físicas de componentes (como el botón trasero de la fuente de alimentación) y análisis en tiempo real asistido por **Gemini AI**.

---

## Tabla de contenidos

1. [Qué incluye la aplicación](#qué-incluye-la-aplicación)
2. [Requisitos previos](#requisitos-previos)
3. [Instalación y puesta en marcha en local (Paso a paso)](#instalación-y-puesta-en-marcha-en-local-paso-a-paso)
4. [Leer sensores reales en Windows 10 (LibreHardwareMonitor)](#leer-sensores-reales-en-windows-10-librehardwaremonitor)
5. [Uso en Linux y macOS](#uso-en-linux-y-macos)
6. [Guía rápida para diagnosticar ventiladores al 100% y el botón de la PSU](#guía-rápida-para-diagnosticar-ventiladores-al-100-y-el-botón-de-la-psu)
7. [Scripts de desarrollo y pruebas](#scripts-de-desarrollo-y-pruebas)
8. [Arquitectura del proyecto](#arquitectura-del-proyecto)
9. [Solución de problemas frecuentes](#solución-de-problemas-frecuentes)

---

## Qué incluye la aplicación

- **Monitor en Vivo (`1 Hz`)**: gráficas interactivas de temperatura (`CPU`, `GPU Core`, `GPU Hotspot`, `VRM`), carga del sistema, velocidad de ventiladores (`RPM` y `% PWM`) y detección automática de anomalías acústicas (como delta elevado de Hotspot o desajuste PWM/DC).
- **Historial de Voltajes ATX**: seguimiento en tiempo real de los raíles **+12V, +5V, +3.3V, CPU Vcore y DRAM VDD** con bandas de tolerancia oficial ATX (±5%), estadísticas de mínimo/máximo/desviación y registro cronológico filtrable por caídas de tensión.
- **Componentes, Curiosidades y Configuración Recomendada**:
  - Explicación detallada del **botón físico trasero de la fuente de alimentación** (*Hybrid Mode / Eco Mode / Zero RPM*) y veredicto claro de cuándo presionarlo o dejarlo desactivado.
  - Revisión de **Switch Dual-BIOS** en GPU, cabezales **PWM vs DC** en placa base, efecto *pump-out* de pasta térmica tras 3–5 años y perfil XMP/DOCP.
  - Posibilidad de registrar los modelos exactos de tu PC (guardados localmente en el navegador).
  - Guías detalladas de configuración óptima para **BIOS**, **Windows 10** y mantenimiento térmico.
- **Alertas Personalizadas y Puente SO**: umbrales configurables de aviso y nivel crítico para sobrecalentamientos, ventiladores desbocados en reposo o desviación de voltaje, con aviso sonoro opcional y registro de eventos.
- **Consultor de Hardware IA**: integrado en el servidor Express mediante `@google/genai` (`gemini-4-hydrogen`). Envía tus lecturas actuales, voltajes, alertas y componentes a la IA para recibir un informe técnico estructurado, una lista interactiva de pruebas paso a paso y un chat técnico de seguimiento.

---

## Requisitos previos

Antes de empezar, asegúrate de tener instalado en tu ordenador:

1. **Node.js (versión 20 LTS o 22 LTS recomendada)** — incluye `npm`.
   - En Windows 10, descárgalo desde [nodejs.org](https://nodejs.org/) (instalador `.msi` oficial, deja marcada la opción *"Add to PATH"*).
   - Para comprobar si ya lo tienes instalado, abre **PowerShell** o **CMD** y ejecuta:
     ```bash
     node -v
     npm -v
     ```
2. **Una clave de API de Gemini (`GEMINI_API_KEY`)** *(necesaria únicamente para el módulo **Consultor IA**; el resto del panel funciona sin ella)*:
   - Puedes crear una gratuitamente en [Google AI Studio](https://aistudio.google.com/apikey).
3. **Opcional (muy recomendado en Windows 10 para sensores físicos completos)**:
   - [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases) (gratuito y de código abierto) para exponer temperaturas de placa, GPU Hotspot, RPM de ventiladores y voltajes ATX reales al servidor local.

---

## Instalación y puesta en marcha en local (Paso a paso)

### 1. Descarga o clona el proyecto

Si tienes el archivo comprimido (`.zip`), descomprímelo en una carpeta cómoda, por ejemplo:

```text
C:\Proyectos\termolab-pc
```

Si usas Git:

```bash
git clone <URL_DE_TU_REPOSITORIO> termolab-pc
cd termolab-pc
```

### 2. Abre una terminal dentro de la carpeta del proyecto

En Windows 10 puedes abrir la carpeta en el Explorador de archivos, hacer clic en la barra de direcciones, escribir `powershell` (o `cmd`) y pulsar **Enter**.

### 3. Instala las dependencias

Ejecuta una sola vez:

```bash
npm install
```

Esto instalará React, Vite, Express, `tsx`, `systeminformation`, `@google/genai`, Tailwind CSS y Lucide Icons.

### 4. Configura tu archivo `.env`

Crea un archivo llamado exactamente `.env` en la raíz del proyecto (al mismo nivel que `package.json` y `.env.example`). Puedes copiar `.env.example` y editarlo:

**En PowerShell (Windows 10):**
```powershell
Copy-Item .env.example .env
notepad .env
```

**En Linux / macOS:**
```bash
cp .env.example .env
nano .env
```

Dentro del archivo `.env`, sustituye `MY_GEMINI_API_KEY` por tu clave real de Google AI Studio:

```env
GEMINI_API_KEY="AIzaSyTuClaveRealDeGeminiAqui"
APP_URL="http://localhost:3000"
```

> **Seguridad:** el archivo `.env` está ignorado por `.gitignore` para no subir nunca tu clave privada a GitHub. El navegador nunca recibe esta clave; todas las peticiones a Gemini se ejecutan exclusivamente desde `server.ts`.

### 5. Arranca la aplicación

Ejecuta:

```bash
npm run dev
```

Verás en la terminal:

```text
TermoLab PC server running at http://localhost:3000
```

### 6. Abre la interfaz en tu navegador

Entra en:

```text
http://localhost:3000
```

La aplicación ya estará funcionando en tiempo real con los perfiles de diagnóstico y lista para conectar con tus sensores locales o con Gemini AI.

### (Opcional) Ejecutar en modo producción compilado en local

Si prefieres compilar primero el frontend estático para que arranque aún más rápido en tu PC:

1. Compila el frontend:
   ```bash
   npm run build
   ```
2. Arranca el servidor sirviendo `dist/`:
   - **En PowerShell (Windows 10):**
     ```powershell
     $env:NODE_ENV="production"; npx tsx server.ts
     ```
   - **En CMD (Windows 10):**
     ```cmd
     set NODE_ENV=production&& npx tsx server.ts
     ```
   - **En Linux / macOS:**
     ```bash
     NODE_ENV=production npx tsx server.ts
     ```

---

## Leer sensores reales en Windows 10 (LibreHardwareMonitor)

Por seguridad y arquitectura del sistema operativo, Node.js por sí solo en Windows 10 puede leer el modelo de CPU, carga por núcleo y memoria RAM (`systeminformation`), pero **no tiene acceso directo a los chips Super I/O de la placa base** (RPM de ventiladores, +12V/+5V/+3.3V, Vcore o GPU Hotspot) sin un driver de anillo 0.

TermoLab PC resuelve esto automáticamente conectándose al servidor web integrado de **LibreHardwareMonitor**:

1. Descarga la última versión desde [LibreHardwareMonitor Releases](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases) (archivo `LibreHardwareMonitor-net472.zip`).
2. Descomprímelo y haz clic derecho en **`LibreHardwareMonitor.exe` → Ejecutar como administrador** *(imprescindible para que lea los sensores de la placa y fuente)*.
3. En la ventana de LibreHardwareMonitor, ve al menú superior:
   - **`Options` → `Remote Web Server` → `Port`**: asegúrate de que esté en **`8085`** (es el puerto por defecto).
   - **`Options` → `Remote Web Server` → `Run`**: márcalo para activar el servidor local (`http://127.0.0.1:8085/data.json`).
   - *(Opcional)* Marca también **`Options` → `Run On Windows Startup`** y **`Minimize To Tray`** para tenerlo siempre en segundo plano.
4. En **TermoLab PC** (`http://localhost:3000`):
   - En la barra superior del **Monitor en Vivo**, selecciona el perfil **`Host Real (SO)`**.
   - También puedes ir a **`Alertas y Puente SO`** y pulsar **`Re-escanear sensores locales`** para confirmar que aparece **`● Conectado`**.

### Script de comprobación rápida para Windows 10

Desde la pestaña **`Alertas y Puente SO`** puedes pulsar **`Descargar Script Windows 10 (.ps1)`** para bajar `TermoLab-Windows10-Bridge.ps1`. Para ejecutarlo en PowerShell sin cambiar permisos permanentes del sistema:

```powershell
powershell -ExecutionPolicy Bypass -File .\TermoLab-Windows10-Bridge.ps1
```

---

## Uso en Linux y macOS

El servidor (`server.ts`) es independiente del sistema operativo:

- **Linux**: instala `lm-sensors` y ejecuta `sudo sensors-detect` para que el kernel exponga temperaturas y ventiladores; `systeminformation` los leerá automáticamente cuando selecciones **`Host Real (SO)`**.
  ```bash
  sudo apt install lm-sensors
  sudo sensors-detect
  ```
- **macOS**: `systeminformation` lee carga de CPU, memoria y sensores térmicos disponibles en el sistema al seleccionar **`Host Real (SO)`**.

---

## Guía rápida para diagnosticar ventiladores al 100% y el botón de la PSU

Si tu PC está limpio de polvo pero hace ruido como el primer día de carga máxima, sigue este orden dentro de la app:

1. **Comprueba la diferencia GPU Core vs GPU Hotspot** en **Monitor en Vivo** (con el perfil `Host Real (SO)` conectado a LibreHardwareMonitor):
   - Si el núcleo marca ~65–70°C pero el **Hotspot pasa de 88–95°C** (delta ≥ 18°C), la pasta térmica de fábrica de la tarjeta gráfica se ha secado o desplazado (*pump-out*). Eso fuerza los ventiladores de la GPU al 95–100% aunque el radiador esté impoluto.
2. **Revisa el modo PWM vs DC en BIOS**:
   - Entra en la sección **Componentes y PSU** y revisa la guía de la placa base. Si un cabezal de 4 pines quedó en modo `DC` tras un reinicio de BIOS, recibe 12V constantes y gira al 100% sin importar la carga.
3. **Identifica el botón trasero de tu fuente de alimentación (PSU)**:
   - En **Componentes y PSU**, revisa la ficha de la fuente (**Botón Hybrid / Eco / Zero-RPM**). En muchas fuentes (Seasonic, EVGA, Corsair), ese botón decide si el ventilador de la fuente se apaga en reposo o gira siempre.
   - Si conoces el modelo exacto de tu fuente, regístralo en **Componentes y PSU → `Añadir mi componente exacto`** y pulsa **`Consultar modelo con IA`** para saber exactamente qué posición activa el modo silencioso en tu modelo concreto.
4. **Pregunta a la IA con tus datos reales**:
   - Pulsa **`Diagnosticar con IA`** en la cabecera superior. La IA recibirá tus temperaturas, RPM, voltajes y componentes actuales y te indicará qué pruebas seguras hacer y qué curva ajustar.

---

## Scripts de desarrollo y pruebas

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia Express + Vite en modo desarrollo en `http://localhost:3000`. |
| `npm run build` | Compila la aplicación React/Vite en la carpeta `dist/`. |
| `npm run lint` | Comprueba errores de TypeScript (`tsc --noEmit`). |
| `npx tsx --test src/utils/telemetryLogic.test.ts` | Ejecuta las pruebas unitarias de alertas, voltajes ATX y diagnóstico acústico. |

---

## Arquitectura del proyecto

```text
├── server.ts                          # Servidor Express: endpoints /api/telemetry/host, /api/ai/* y middleware Vite
├── index.html                         # Entrada HTML, fuentes tipográficas y configuración modo oscuro
├── .env.example                       # Plantilla de variables de entorno (copiar a .env)
├── src/
│   ├── App.tsx                        # Estado global, bucle de telemetría 1 Hz y enrutamiento de vistas
│   ├── types/hardware.ts              # Tipos TypeScript de telemetría, voltajes, alertas e inventario
│   ├── data/defaultHardware.ts        # Inventario base, curiosidades (botón PSU, Dual-BIOS, PWM/DC) y guías
│   ├── utils/
│   │   ├── telemetryLogic.ts          # Lógica pura: alertas, estadísticas ATX, simulación y diagnóstico
│   │   └── telemetryLogic.test.ts     # Pruebas unitarias con node:test
│   └── components/
│       ├── Sidebar.tsx                # Barra lateral de navegación y estado del flujo
│       ├── TopBar.tsx                 # Cabecera superior con acción principal de diagnóstico IA
│       ├── TelemetryChart.tsx         # Gráficas SVG interactivas con crosshair y tooltips
│       ├── LiveMonitorView.tsx        # Vista principal de temperaturas, carga y canales RPM
│       ├── VoltageHistoryView.tsx     # Historial de raíles +12V/+5V/+3.3V/Vcore y tabla de eventos
│       ├── ComponentsCuriositiesView.tsx # Lista de componentes, botón PSU y guías BIOS/Windows 10
│       ├── AlertsAndOsBridgeView.tsx  # Editor de umbrales térmicos y puente LibreHardwareMonitor
│       └── AiConsultantView.tsx       # Informe estructurado de Gemini AI, checklist y chat técnico
```

---

## Solución de problemas frecuentes

- **Error `No se detectó GEMINI_API_KEY configurada en el servidor`:**
  - Verifica que el archivo se llama `.env` (no `.env.txt`), que está en la raíz del proyecto junto a `package.json`, y que reiniciaste `npm run dev` después de guardarlo.
- **El perfil `Host Real (SO)` muestra `0 RPM` o no muestra voltajes en Windows 10:**
  - LibreHardwareMonitor debe abrirse **como Administrador** y tener activada la opción `Options → Remote Web Server → Run` en el puerto `8085`.
  - Puedes comprobar que responde abriendo `http://127.0.0.1:8085/data.json` directamente en tu navegador.
- **Error `EADDRINUSE: address already in use :::3000`:**
  - Ya tienes otro proceso usando el puerto `3000`. Ciérralo o arranca en otro puerto ejecutando en PowerShell:
    ```powershell
    $env:PORT=3005; npm run dev
    ```
- **Windows PowerShell bloquea `npm` o el script `.ps1`:**
  - Si ves un error de directiva de ejecución (*ExecutionPolicy*), abre PowerShell y ejecuta:
    ```powershell
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
    ```

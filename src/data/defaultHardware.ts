import type { HardwareComponent } from '../types/hardware';

export const DEFAULT_HARDWARE_COMPONENTS: HardwareComponent[] = [
  {
    id: 'comp-psu',
    category: 'psu',
    categoryLabel: 'Fuente de Alimentación (PSU)',
    model: 'Fuente Modular 750W / 850W 80+ Gold (Seasonic / Corsair / EVGA)',
    yearsOld: 4,
    specs: '850W · Raíl único +12V (70.8A) · Botón trasero físico Hybrid / Eco Mode',
    curiosity: {
      title: 'Botón trasero "Hybrid Mode / Eco Mode / Zero RPM"',
      physicalControl: 'Interruptor físico en la parte trasera junto al conector AC (I/O)',
      verdict: 'check_position',
      verdictLabel: 'Verificar posición según temperatura de la fuente',
      explanation:
        'Ese botón misterioso detrás de muchas fuentes de gama alta (Seasonic Focus/Prime, EVGA SuperNOVA, Corsair RM/HX antiguas) activa o desactiva el modo Zero-RPM (Hybrid/Eco). Cuando está activado, el ventilador de la fuente permanece completamente apagado por debajo del 30-40% de carga o 45°C internos. OJO: en algunos modelos, el botón PRESIONADO (hacia adentro) = modo normal siempre encendido, y SIN PRESIONAR (salido) = modo Hybrid silencioso (en Seasonic suele estar serigrafiado "Hybrid Mode"). Si está desactivado o atascado en modo test/siempre encendido, añade zumbido constante.',
      recommendedAction:
        'Comprueba si el ventilador de tu fuente gira en reposo y si la carcasa de la PSU está fría o muy caliente. Si la fuente está fría y montada con la rejilla hacia abajo tomando aire fresco, ACTIVA el modo Hybrid/Eco (silencio total en reposo). Si notas la fuente muy caliente al tacto o montada sin filtro/aire fresco, mantén el ventilador ACTIVO (modo normal) para evitar desgaste de condensadores.',
    },
    recommendedConfig: [
      'Asegúrate de que el ventilador de la fuente tome aire desde la rejilla inferior de la caja (con filtro limpio) y no del interior caliente.',
      'Revisa el cableado ATX 24-pin y EPS 8-pin: un conector flojo provoca caídas de voltaje en el raíl +12V (< 11.75V) bajo carga.',
      'Evita adaptadores Molex/SATA para la GPU; usa cables PCIe independientes desde la fuente para minimizar rizado y calor.',
    ],
  },
  {
    id: 'comp-gpu',
    category: 'gpu',
    categoryLabel: 'Tarjeta Gráfica (GPU)',
    model: 'GPU Dedicada PCIe (Series RTX 20/30/40 o RX 5000/6000/7000)',
    yearsOld: 4,
    specs: 'Triple ventilador · Switch Dual-BIOS lateral · Sensor Edge + Hotspot',
    curiosity: {
      title: 'Switch físico Dual-BIOS (Performance / Quiet) + Efecto Pump-Out',
      physicalControl: 'Micro-interruptor deslizante en el borde superior del PCB (cerca de los conectores PCIe)',
      verdict: 'press',
      verdictLabel: 'Recomendado: Cambiar a BIOS "Quiet / Silent" si está en OC',
      explanation:
        'Casi todas las tarjetas gráficas de gama media-alta tienen un pequeño interruptor físico con dos posiciones: OC/Performance y Silent/Quiet. En modo Performance, la curva de fábrica es agresiva y busca más MHz a costa de subir los ventiladores al 80-100%. Además, tras 3-5 años (incluso sin polvo), la pasta térmica entre el silicio y el disipador sufre "pump-out" (se desplaza por ciclos térmicos), disparando el sensor Hotspot por encima de 95°C aunque el sensor normal marque 70°C.',
      recommendedAction:
        'Con el PC completamente apagado y desenchufado, desliza el switch físico de la GPU a la posición "Quiet / Silent". Luego verifica en el monitor en vivo la diferencia entre GPU Core y GPU Hotspot: si supera los 18°C, reemplaza la pasta térmica por una de alta viscosidad o lámina PTM7950.',
    },
    recommendedConfig: [
      'Aplica Undervolt suave en MSI Afterburner (ej. limitar a 925-950 mV manteniendo la frecuencia boost): reduce entre 8°C y 12°C y baja los ventiladores un 30% sin perder FPS.',
      'Activa una curva personalizada con histéresis (0% por debajo de 48°C, rampa lineal hasta 60% a 75°C).',
      'Comprueba en Windows 10 que el modo de energía del panel NVIDIA/AMD esté en "Normal" y no en "Máximo rendimiento preferido" en escritorio.',
    ],
  },
  {
    id: 'comp-mobo',
    category: 'motherboard',
    categoryLabel: 'Placa Base (Motherboard)',
    model: 'Placa Base ATX Gaming (Chipset B450/B550/X570 o Z390/Z490/Z590)',
    yearsOld: 4,
    specs: 'Cabezales SYS_FAN híbridos (PWM/DC) · VRM con disipador pasivo · BIOS Flashback',
    curiosity: {
      title: 'Cabezales en modo DC vs PWM + Botón trasero BIOS Flashback / Clear CMOS',
      physicalControl: 'Configuración de pines en BIOS (4 pines PWM vs 3 pines DC) y botón trasero I/O',
      verdict: 'keep_off',
      verdictLabel: 'NO presionar botones traseros (Flashback/Clear CMOS) salvo emergencia',
      explanation:
        'Un error clásico cuando un PC limpio empieza a sonar al 100% tras un corte de luz o actualización de BIOS es que los cabezales de ventiladores (CPU_FAN / SYS_FAN) se restablecen a modo "DC / Auto" enviando 12V constantes a ventiladores PWM de 4 pines, poniéndolos al máximo todo el tiempo. Además, en el panel trasero suele haber un botón "BIOS Flashback" o "Clear CMOS": no lo pulses en uso normal porque borra tus perfiles XMP y curvas de ventilación.',
      recommendedAction:
        'Entra a la BIOS (Supr / F2 al arrancar) → Hardware Monitor / Q-Fan / Smart Fan. Fuerza manualmente cada conector de 4 pines a modo "PWM", cambia la fuente de temperatura de "CPU" a "CPU Package" con tiempo de respuesta (Step-Up / Hysteresis) de 0.7s o más para evitar acelerones bruscos.',
    },
    recommendedConfig: [
      'Cambia los encabezados de ventiladores de "Auto/DC" a "PWM" explícitamente en la BIOS.',
      'Aumenta el retardo de subida (Fan Step-Up / Hysteresis) a 2-3 segundos para que los picos de 1 segundo en Chrome o Windows Update no disparen los ventiladores.',
      'Comprueba si el pequeño ventilador del chipset (en placas X570) está bloqueado al 100% y selecciona el perfil "Silent" para el PCH.',
    ],
  },
  {
    id: 'comp-cpu',
    category: 'cpu_cooling',
    categoryLabel: 'CPU y Refrigeración',
    model: 'Procesador Multi-Núcleo + Disipador Torre o Líquida AIO 240/360mm',
    yearsOld: 4,
    specs: 'Pasta térmica de 3-5 años · Control de bomba en AIO_PUMP / CPU_OPT',
    curiosity: {
      title: 'Degradación de pasta térmica (3-5 años) y burbujas/cavitación en AIO',
      physicalControl: 'Montaje del bloque / orientación de tubos del radiador y cabezal AIO_PUMP',
      verdict: 'check_position',
      verdictLabel: 'Revisar curvas y estado térmico del compuesto tras > 3 años',
      explanation:
        'Incluso con el ordenador impoluto y sin polvo, la pasta térmica tradicional se seca, endurece o sufre microfisuras a los 3-4 años. Si tienes refrigeración líquida (AIO), también puede haberse evaporado parte del líquido por permeación, dejando aire en la bomba (zumbido agudo) y subiendo la CPU a 70°C en tareas ligeras.',
      recommendedAction:
        'Toca con cuidado ambos tubos de la AIO si usas líquida bajo carga: si uno quema y el otro está frío, la bomba está obstruida o tiene aire atrapado. Si usas disipador por aire y la CPU sube > 65°C abriendo un navegador, toca renovar pasta térmica.',
    },
    recommendedConfig: [
      'En Windows 10, ve a Panel de control → Opciones de energía y selecciona "Equilibrado" (Balanced) en lugar de "Alto rendimiento" (que bloquea la CPU al 100% de reloj y voltaje en reposo).',
      'En BIOS, activa "Curve Optimizer" negativo (-15 a -20 en AMD Ryzen) o un offset de Vcore (-0.050V a -0.075V en Intel) para reducir temperatura en 7-12°C.',
      'Usa el software gratuito "FanControl" (Windows 10) para vincular los ventiladores de la caja al sensor promedio de CPU+GPU y eliminar acelerones.',
    ],
  },
  {
    id: 'comp-ram',
    category: 'ram_storage',
    categoryLabel: 'Memoria RAM y NVMe',
    model: '32 GB DDR4/DDR5 (Perfil XMP/DOCP) + SSD NVMe PCIe',
    yearsOld: 4,
    specs: 'Dual Channel (Slots A2/B2) · Disipador M.2 pasivo',
    curiosity: {
      title: 'Perfil XMP/DOCP reseteado y estrangulamiento del controlador NVMe',
      physicalControl: 'Voltaje DRAM VDD (1.35V XMP) y pad térmico del slot M.2',
      verdict: 'check_position',
      verdictLabel: 'Comprobar que XMP siga activo y el controlador NVMe < 65°C',
      explanation:
        'A veces los ventiladores de la placa suben porque un SSD NVMe sin flujo de aire supera los 65-70°C y dispara el sensor de temperatura del sistema (System/PCH Temp) al que están atados los ventiladores de la caja.',
      recommendedAction:
        'Verifica en este panel si tu NVMe supera los 60°C y asegúrate en la BIOS de que los ventiladores frontales no respondan al sensor equivocado.',
    },
    recommendedConfig: [
      'Activa XMP / DOCP / EXPO en BIOS para mantener el rendimiento nominal de la memoria sin subir voltaje VSOC innecesariamente.',
      'Mantén al menos un ventilador frontal metiendo aire suave (650-800 RPM) sobre la zona de los slots M.2 y VRM.',
    ],
  },
];

export const SYSTEM_OPTIMIZATION_GUIDES = [
  {
    id: 'guide-bios',
    title: '1. Ajustes críticos en BIOS (Independiente del SO)',
    summary: 'Corrige la causa #1 de ventiladores al 100% en PCs limpios.',
    steps: [
      'Cambia los cabezales CPU_FAN y SYS_FAN de "Auto / DC" a modo "PWM" para que respondan al porcentaje real y no giren a 12V fijos.',
      'Configura 4 puntos de curva: 30% hasta 50°C · 45% a 65°C · 70% a 78°C · 100% a 88°C.',
      'Sube el parámetro "Fan Step-Up / Hysteresis" a 2.0–3.6 segundos para ignorar picos instantáneos de CPU.',
      'Si usas procesador AMD Ryzen o Intel serie K, desactiva "Multi-Core Enhancement / PBO Fmax Enhancer" si mete voltajes > 1.42V.',
    ],
  },
  {
    id: 'guide-win10',
    title: '2. Configuración recomendada en Windows 10',
    summary: 'Evita que el sistema mantenga los núcleos y voltajes altos en reposo.',
    steps: [
      'Opciones de energía → Selecciona "Equilibrado" (Balanced). En "Configuración avanzada", fija el "Estado mínimo del procesador" en 5% y el máximo en 100%.',
      'Administrador de tareas → Inicio: deshabilita overlays o utilidades RGB duplicadas (Armoury Crate, Dragon Center, iCUE en bucle) que mantienen un hilo al 15% y disparan los ventiladores.',
      'Configuración → Juegos → Desactiva grabaciones en segundo plano innecesarias si no las usas.',
      'Si quieres curvas silenciosas maestras desde Windows 10, instala "FanControl" (código abierto) con sensor mixto CPU + GPU.',
    ],
  },
  {
    id: 'guide-thermal',
    title: '3. Mantenimiento térmico cuando ya está limpio de polvo',
    summary: 'Qué revisar físicamente tras 3-5 años de montaje.',
    steps: [
      'Comprueba el delta entre GPU Core y GPU Hotspot: si supera 15-18°C, toca cambiar pasta térmica de la GPU (idealmente lámina de cambio de fase PTM7950 o pasta densa).',
      'Si tienes CPU > 65°C en reposo y ventilador al máximo, cambia la pasta térmica del procesador (Arctic MX-6 o Thermal Grizzly Kryonaut).',
      'En la fuente de alimentación (PSU): prueba el botón físico Hybrid/Eco Mode con el PC en reposo y comprueba si la fuente permanece fresca y silenciosa.',
    ],
  },
];

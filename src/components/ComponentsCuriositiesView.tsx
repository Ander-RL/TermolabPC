import React, { useState } from 'react';
import { Check, Plus, Trash2, Wrench } from 'lucide-react';
import type { ComponentCategory, HardwareComponent } from '../types/hardware';
import { SYSTEM_OPTIMIZATION_GUIDES } from '../data/defaultHardware';

interface ComponentsCuriositiesViewProps {
  components: HardwareComponent[];
  onAddComponent: (comp: HardwareComponent) => void;
  onDeleteComponent: (id: string) => void;
  onAskAiAboutComponent: (comp: HardwareComponent) => void;
}

const CATEGORY_FILTERS: Array<{ id: 'all' | ComponentCategory; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'psu', label: 'Fuente (PSU)' },
  { id: 'gpu', label: 'GPU' },
  { id: 'motherboard', label: 'Placa Base' },
  { id: 'cpu_cooling', label: 'CPU y Refrigeración' },
  { id: 'ram_storage', label: 'RAM y NVMe' },
];

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  psu: 'Fuente de Alimentación (PSU)',
  gpu: 'Tarjeta Gráfica (GPU)',
  motherboard: 'Placa Base (Motherboard)',
  cpu_cooling: 'CPU y Refrigeración',
  ram_storage: 'Memoria RAM y NVMe',
};

export const ComponentsCuriositiesView: React.FC<ComponentsCuriositiesViewProps> = ({
  components,
  onAddComponent,
  onDeleteComponent,
  onAskAiAboutComponent,
}) => {
  const [filter, setFilter] = useState<'all' | ComponentCategory>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeGuideId, setActiveGuideId] = useState<string>(SYSTEM_OPTIMIZATION_GUIDES[0].id);

  // Add component form state
  const [category, setCategory] = useState<ComponentCategory>('psu');
  const [model, setModel] = useState('');
  const [yearsOld, setYearsOld] = useState('4');
  const [specs, setSpecs] = useState('');
  const [curiosityNote, setCuriosityNote] = useState('');
  const [formError, setFormError] = useState('');

  const visibleComponents =
    filter === 'all' ? components : components.filter((c) => c.category === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) {
      setFormError('Introduce el modelo exacto del componente (ej. Corsair RM850x).');
      return;
    }

    const newComp: HardwareComponent = {
      id: `comp-custom-${Date.now()}`,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      model: model.trim(),
      yearsOld: Math.max(0, Number(yearsOld) || 1),
      specs: specs.trim() || 'Registrado manualmente por el usuario',
      curiosity: {
        title: curiosityNote.trim()
          ? 'Curiosidad o botón físico reportado'
          : 'Inspección pendiente con Consultor IA',
        physicalControl: curiosityNote.trim() || 'Pendiente de identificar botones/interruptores físicos',
        verdict: 'check_position',
        verdictLabel: 'Consultar con IA según tu modelo exacto',
        explanation:
          curiosityNote.trim() ||
          'Pulsa "Consultar modelo con IA" para que el asistente analice los interruptores, curvas PWM o fallos típicos de este modelo exacto.',
        recommendedAction:
          'Usa el botón de consulta IA para obtener recomendaciones específicas para tu modelo y años de uso.',
      },
      recommendedConfig: [
        'Verificar curvas de ventilación PWM y temperaturas bajo carga.',
        'Consultar configuración óptima con el asistente IA usando tu modelo exacto.',
      ],
    };

    onAddComponent(newComp);
    setModel('');
    setSpecs('');
    setCuriosityNote('');
    setFormError('');
    setShowAddForm(false);
  };

  const activeGuide =
    SYSTEM_OPTIMIZATION_GUIDES.find((g) => g.id === activeGuideId) ?? SYSTEM_OPTIMIZATION_GUIDES[0];

  return (
    <div className="space-y-6">
      {/* Filter & Add Component Toolbar */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#121722] border border-[#1E2636] rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0E14] border border-[#1E2636] rounded-lg" role="group" aria-label="Filtrar componentes por categoría">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B0E14] border border-[#283347] text-slate-100 hover:bg-[#192131] transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="h-4 w-4 text-cyan-400" />
          <span>{showAddForm ? 'Cerrar formulario' : 'Añadir mi componente exacto'}</span>
        </button>
      </section>

      {/* Add Component Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#121722] border border-cyan-500/35 rounded-xl p-5 space-y-4"
        >
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Registrar componente de tu PC
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Añade el modelo exacto de tu fuente, GPU o placa para que la IA verifique sus botones físicos y curvas ideales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="comp-category" className="block text-xs font-medium text-slate-300">
                Categoría
              </label>
              <select
                id="comp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ComponentCategory)}
                className="w-full rounded-lg bg-[#0B0E14] border border-[#283347] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="comp-model" className="block text-xs font-medium text-slate-300">
                Modelo exacto
              </label>
              <input
                id="comp-model"
                type="text"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setFormError('');
                }}
                placeholder="Ej. Seasonic Focus GX-750"
                className="w-full rounded-lg bg-[#0B0E14] border border-[#283347] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="comp-years" className="block text-xs font-medium text-slate-300">
                Años desde montaje
              </label>
              <input
                id="comp-years"
                type="number"
                min={0}
                max={20}
                value={yearsOld}
                onChange={(e) => setYearsOld(e.target.value)}
                className="w-full rounded-lg bg-[#0B0E14] border border-[#283347] px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="comp-specs" className="block text-xs font-medium text-slate-300">
                Especificaciones / Notas (opcional)
              </label>
              <input
                id="comp-specs"
                type="text"
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                placeholder="Ej. 750W 80+ Gold, montada con ventilador hacia abajo"
                className="w-full rounded-lg bg-[#0B0E14] border border-[#283347] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="comp-curiosity" className="block text-xs font-medium text-slate-300">
                Botón, interruptor o curiosidad observada (opcional)
              </label>
              <input
                id="comp-curiosity"
                type="text"
                value={curiosityNote}
                onChange={(e) => setCuriosityNote(e.target.value)}
                placeholder="Ej. Tiene un botón trasero que pone Hybrid Mode"
                className="w-full rounded-lg bg-[#0B0E14] border border-[#283347] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {formError && <p className="text-xs text-rose-400">{formError}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              Guardar componente
            </button>
          </div>
        </form>
      )}

      {/* Components & Curiosities List */}
      <section className="space-y-4">
        {visibleComponents.map((comp) => {
          const verdictColor =
            comp.curiosity.verdict === 'press'
              ? 'text-emerald-400'
              : comp.curiosity.verdict === 'keep_off'
                ? 'text-rose-400'
                : 'text-amber-400';

          const verdictGlyph =
            comp.curiosity.verdict === 'press'
              ? '●'
              : comp.curiosity.verdict === 'keep_off'
                ? '✖'
                : '▲';

          return (
            <article
              key={comp.id}
              className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="text-cyan-300 font-medium">{comp.categoryLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{comp.yearsOld} años de uso</span>
                    <span aria-hidden="true">·</span>
                    <span>{comp.specs}</span>
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-semibold text-slate-100">
                    {comp.model}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAskAiAboutComponent(comp)}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 hover:bg-cyan-500/25 transition-colors whitespace-nowrap"
                  >
                    Consultar modelo con IA
                  </button>
                  {comp.id.startsWith('comp-custom-') && (
                    <button
                      type="button"
                      onClick={() => onDeleteComponent(comp.id)}
                      aria-label={`Eliminar ${comp.model}`}
                      className="p-2 rounded-lg border border-[#283347] text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[#1E2636]">
                {/* Physical Curiosity & Button Verdict */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">
                      Curiosidad detectada: {comp.curiosity.title}
                    </h4>
                    <span className={`font-mono text-xs font-semibold ${verdictColor}`}>
                      {verdictGlyph} {comp.curiosity.verdictLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Ubicación física: <span className="text-slate-300">{comp.curiosity.physicalControl}</span>
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {comp.curiosity.explanation}
                  </p>
                  <div className="pt-2 text-xs text-cyan-200/90 leading-relaxed">
                    <span className="font-semibold text-cyan-300">¿Presionar o ajustar?: </span>
                    {comp.curiosity.recommendedAction}
                  </div>
                </div>

                {/* Recommended Component Configuration */}
                <div className="space-y-2.5 lg:border-l lg:border-[#1E2636] lg:pl-6">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-slate-400" />
                    <span>Configuración recomendada para silencio y rendimiento</span>
                  </h4>
                  <ul className="space-y-2">
                    {comp.recommendedConfig.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Master System Configuration Guide (BIOS, Windows 10, Thermal) */}
      <section className="bg-[#121722] border border-[#1E2636] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-100">
              Guía Detallada de Optimización del Sistema
            </h2>
            <p className="text-xs text-slate-400">
              Pasos independientes del sistema operativo y ajustes específicos para Windows 10
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0E14] border border-[#1E2636] rounded-lg">
            {SYSTEM_OPTIMIZATION_GUIDES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGuideId(g.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeGuideId === g.id
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {g.title.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-[#1E2636] space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{activeGuide.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeGuide.summary}</p>
          </div>
          <ol className="space-y-2.5">
            {activeGuide.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed">
                <span className="font-mono text-xs text-cyan-400 font-semibold mt-0.5 shrink-0">
                  0{idx + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { Menu, Sparkles } from 'lucide-react';
import type { NavTabId } from './Sidebar';

interface TopBarProps {
  activeTab: NavTabId;
  onOpenMobileMenu: () => void;
  onRunAiDiagnosis: () => void;
  isAiDiagnosing: boolean;
}

const TAB_BREADCRUMBS: Record<NavTabId, { section: string; title: string }> = {
  monitor: { section: 'Telemetría', title: 'Monitor Térmico y Carga' },
  voltages: { section: 'Alimentación ATX', title: 'Historial de Voltajes' },
  components: { section: 'Inventario', title: 'Componentes, Curiosidades y BIOS' },
  alerts: { section: 'Vigilancia', title: 'Alertas Personalizadas y Puente SO' },
  ai: { section: 'Diagnóstico', title: 'Consultor de Hardware IA' },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onRunAiDiagnosis,
  isAiDiagnosing,
}) => {
  const crumb = TAB_BREADCRUMBS[activeTab];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5 bg-[#0B0E14]/95 backdrop-blur-sm border-b border-[#1E2636]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú de navegación"
          className="lg:hidden rounded-lg p-2 text-slate-300 border border-[#1E2636] hover:bg-[#161C29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0 truncate">
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap">{crumb.section}</span>
          <span className="hidden sm:inline text-slate-600" aria-hidden="true">/</span>
          <h1 className="font-display text-base sm:text-lg font-semibold text-slate-100 truncate">
            {crumb.title}
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={onRunAiDiagnosis}
        disabled={isAiDiagnosing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0E14]"
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>{isAiDiagnosing ? 'Analizando...' : 'Diagnosticar con IA'}</span>
      </button>
    </header>
  );
};

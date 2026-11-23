import React from 'react';
import {
  Activity,
  BellRing,
  Bot,
  Cpu,
  X,
  Zap,
} from 'lucide-react';

export type NavTabId =
  | 'monitor'
  | 'voltages'
  | 'components'
  | 'alerts'
  | 'ai';

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  isStreaming: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'monitor', label: 'Monitor en Vivo', icon: Activity },
  { id: 'voltages', label: 'Historial de Voltajes', icon: Zap },
  { id: 'components', label: 'Componentes y PSU', icon: Cpu },
  { id: 'alerts', label: 'Alertas y Puente SO', icon: BellRing },
  { id: 'ai', label: 'Consultor IA', icon: Bot },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeAlertsCount,
  criticalAlertsCount,
  isStreaming,
  mobileOpen,
  onCloseMobile,
}) => {
  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#0E121B] border-r border-[#1E2636]">
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#1E2636]">
          <span className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            TermoLab PC
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar menú lateral"
            className="lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Navegación principal" className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showAlertCount = item.id === 'alerts' && activeAlertsCount > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  isActive
                    ? 'bg-cyan-500/12 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#161C29] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {showAlertCount && (
                  <span
                    className={`font-mono text-xs tabular-nums ml-2 ${
                      criticalAlertsCount > 0 ? 'text-rose-400 font-semibold' : 'text-amber-400 font-semibold'
                    }`}
                  >
                    {activeAlertsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-5 py-4 border-t border-[#1E2636] text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Flujo de datos</span>
          <span className={`font-mono font-medium ${isStreaming ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isStreaming ? '● En vivo (1 Hz)' : '❚❚ Pausado'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Modo</span>
          <span className="text-slate-300">Multiplataforma</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[248px] shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[260px] max-w-[85vw] h-full">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  SearchCheck,
  Route,
  FolderKanban,
  Landmark,
  Database,
  Bot,
  History,
  MoreHorizontal
} from 'lucide-react';
import { ThemeMode } from '../i18n/translations';

interface ProductNavProps {
  theme: ThemeMode;
}

const desktopItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Новый анализ проекта', icon: SearchCheck, active: true },
  { label: 'Funding Navigator', icon: Route },
  { label: 'Проекты', icon: FolderKanban },
  { label: 'Программы финансирования', icon: Landmark },
  { label: 'База знаний', icon: Database },
  { label: 'AI Expert', icon: Bot },
  { label: 'История анализов', icon: History }
];

export const ProductNav: React.FC<ProductNavProps> = ({ theme }) => {
  const isLight = theme === 'light';

  return (
    <>
      <aside className={\`hidden xl:flex w-60 shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r flex-col justify-between p-3 \${
        isLight ? 'bg-white/95 border-neutral-200' : 'bg-[#060814]/95 border-[#172036]'
      }\`}>
        <nav className="space-y-1">
          {desktopItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              aria-disabled={!active}
              className={\`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold border transition-all \${
                active
                  ? isLight
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-cyan-950/40 text-[#00E5FF] border-cyan-500/30 shadow-[0_0_12px_-3px_rgba(0,229,255,0.35)]'
                  : isLight
                    ? 'text-neutral-500 border-transparent'
                    : 'text-slate-500 border-transparent'
              }\`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </nav>

        <div className={\`rounded-xl border px-3 py-3 \${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-[#080A1A] border-[#172036]'}\`}>
          <div className={\`text-[10px] uppercase tracking-[0.14em] font-bold \${isLight ? 'text-neutral-500' : 'text-slate-500'}\`}>
            NC Decision
          </div>
          <div className={\`text-xs font-semibold mt-1 \${isLight ? 'text-neutral-900' : 'text-[#F4F7FF]'}\`}>
            Funding intelligence
          </div>
        </div>
      </aside>

      <nav className={\`md:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 \${
        isLight ? 'bg-white/95 border-neutral-200' : 'bg-[#060814]/95 border-[#172036]'
      }\`}>
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {[
            ['Анализ', SearchCheck, true],
            ['Проекты', FolderKanban, false],
            ['Программы', Landmark, false],
            ['AI Expert', Bot, false],
            ['Ещё', MoreHorizontal, false]
          ].map(([label, Icon, active]: any) => (
            <button key={label} type="button" aria-disabled={!active} className={\`min-h-[48px] rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold \${
              active
                ? isLight ? 'text-neutral-950 bg-neutral-100' : 'text-[#00E5FF] bg-cyan-950/30'
                : isLight ? 'text-neutral-400' : 'text-slate-500'
            }\`}>
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

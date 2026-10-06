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
  Sun,
  Moon,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';
import { NcConsultingLogo } from './Logo';
import { ThemeMode, Language } from '../i18n/translations';

interface ProductNavProps {
  theme: ThemeMode;
  language: Language;
  onSelectLanguage: (language: Language) => void;
  onToggleTheme: () => void;
  onReset: () => void;
}

const desktopItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Новый анализ проекта', icon: SearchCheck, active: true },
  { label: 'Funding Navigator', icon: Route },
  { label: 'Проекты', icon: FolderKanban },
  { label: 'Программы', icon: Landmark },
  { label: 'База знаний', icon: Database },
  { label: 'AI Expert', icon: Bot, ai: true },
  { label: 'История', icon: History }
];

export const ProductNav: React.FC<ProductNavProps> = ({
  theme,
  language,
  onSelectLanguage,
  onToggleTheme,
  onReset
}) => {
  const isLight = theme === 'light';

  return (
    <>
      <aside className={\`hidden lg:flex w-52 xl:w-60 shrink-0 sticky top-0 h-screen border-r flex-col justify-between z-30 \${
        isLight ? 'bg-white border-neutral-200' : 'bg-[#0D1127] border-[#1E223D]'
      }\`}>
        <div className="min-h-0">
          <div className={\`px-3.5 py-3 border-b \${isLight ? 'border-neutral-200' : 'border-[#1E223D]'}\`}>
            <NcConsultingLogo className="h-9" theme={theme} />
          </div>

          <nav className="p-2 space-y-0.5 overflow-y-auto">
            {desktopItems.map(({ label, icon: Icon, active, ai }) => (
              <button
                key={label}
                type="button"
                aria-disabled={!active}
                className={\`relative w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold border transition-all \${
                  active
                    ? isLight
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-[#131938] text-[#00E5FF] border-cyan-500/30 shadow-[0_0_16px_-6px_rgba(0,229,255,0.45)]'
                    : isLight
                      ? 'text-neutral-500 border-transparent hover:bg-neutral-100'
                      : 'text-slate-400 border-transparent hover:bg-[#131938] hover:text-[#F8FAFC]'
                }\`}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r bg-[#00E5FF]" />}
                <Icon className={\`w-3.5 h-3.5 shrink-0 \${ai && !active ? 'text-[#8B5CFF]' : ''}\`} />
                <span className="truncate">{label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />}
                {ai && <span className="ml-auto px-1.5 py-0.5 text-[8px] rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">AI</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className={\`p-2.5 border-t space-y-2 \${isLight ? 'border-neutral-200 bg-neutral-50' : 'border-[#1E223D] bg-[#080A1A]/70'}\`}>
          <div className={\`grid grid-cols-4 gap-0.5 rounded-lg p-0.5 border text-[10px] font-bold \${
            isLight ? 'bg-white border-neutral-200' : 'bg-[#131938] border-[#1E223D]'
          }\`}>
            {([
              ['ru','РУС'],['kk','ҚАЗ'],['en','ENG'],['zh','中文']
            ] as [Language,string][]).map(([code,label]) => (
              <button
                key={code}
                type="button"
                onClick={() => onSelectLanguage(code)}
                className={\`px-1.5 py-1 rounded-md transition-all \${
                  language === code
                    ? isLight ? 'bg-neutral-900 text-white' : 'bg-[#00E5FF] text-[#080A1A]'
                    : isLight ? 'text-neutral-500' : 'text-slate-400'
                }\`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className={\`flex items-center gap-1.5 text-[11px] px-1 py-1 transition-colors \${
                isLight ? 'text-neutral-600 hover:text-neutral-950' : 'text-slate-400 hover:text-[#CBA13A]'
              }\`}
            >
              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-[#CBA13A]" />}
              <span>{isLight ? 'Тёмная' : 'Светлая'}</span>
            </button>
            <button
              type="button"
              onClick={onReset}
              className={\`flex items-center gap-1.5 text-[11px] px-1 py-1 transition-colors \${
                isLight ? 'text-neutral-600 hover:text-neutral-950' : 'text-slate-400 hover:text-[#F8FAFC]'
              }\`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Сбросить</span>
            </button>
          </div>

          <div className={\`flex items-center gap-2 pt-2 border-t \${isLight ? 'border-neutral-200' : 'border-[#1E223D]'}\`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#2F8BFF] to-[#8B5CFF] flex items-center justify-center text-[10px] font-bold text-white">NC</div>
            <div className="min-w-0">
              <div className={\`text-[11px] font-semibold truncate \${isLight ? 'text-neutral-900' : 'text-[#F8FAFC]'}\`}>Инвестор / Аналитик</div>
              <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Сессия активна
              </div>
            </div>
          </div>
        </div>
      </aside>

      <nav className={\`md:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 \${
        isLight ? 'bg-white/95 border-neutral-200' : 'bg-[#0D1127]/95 border-[#1E223D]'
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

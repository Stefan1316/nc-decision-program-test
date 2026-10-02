import React, { useState } from 'react';
import { EvaluationSummary } from '../logic/decisionEngine';
import { generateDocxReport, CoreProgramExport } from '../logic/docxExport';
import { 
  X, Copy, Check, Download, FileText, 
  ExternalLink, Sparkles, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { ThemeMode, Language, translations } from '../i18n/translations';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: EvaluationSummary;
  theme?: ThemeMode;
  language?: Language;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({ 
  isOpen, 
  onClose, 
  summary,
  theme = 'neon',
  language = 'ru'
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  if (!isOpen) return null;

  const t = translations[language].report;
  const isLight = theme === 'light';
  const { query } = summary;

  // Единый отчёт по результатам decisionEngine для всех программ базы.
  const cleanCode = query.oked_code.trim().replace(/,/g, '.').replace(/\s+/g, '');
  const okedName = cleanCode;

  const eligibleResults = [
    ...summary.exact_matches,
    ...summary.possible_matches,
    ...summary.needs_clarification,
    ...summary.needs_verification
  ];
  const excludedResults = summary.not_applicable;

  const passedCorePrograms: CoreProgramExport[] = eligibleResults.map((result) => {
    const p = result.program;
    const primarySource = result.sources?.[0];
    const reasonParts = [
      ...result.matched_reasons,
      ...(result.missing_inputs.length > 0 ? ['Требуется уточнить: ' + result.missing_inputs.join('; ')] : [])
    ];

    return {
      id: p.id,
      title: p.name_ru,
      category: p.instrument_type + ' · ' + result.status_label_ru,
      applicable: result.status !== 'not_applicable',
      limit: p.amount_max_text || 'По условиям программы',
      rate: p.borrower_rate_text || p.subsidy_text || 'По условиям программы',
      term: p.term_text || 'Не указано',
      purposes: p.purpose_short || 'Уточняется по регламенту',
      financier: p.institution_id === 'damu' ? 'АО «ФРП «Даму» / партнёрские финансовые организации' : p.institution_id,
      sourceId: primarySource?.source_id || p.source_ids?.[0] || 'SOURCE',
      url: primarySource?.url || '',
      note: reasonParts.join(' ') || 'Программа требует дополнительной проверки условий.'
    };
  });

  const excludedProgramRows = excludedResults.map((result) => ({
    id: result.program.id,
    title: result.program.name_ru,
    instrument: result.program.instrument_type,
    reasons: result.restrictions.length > 0 ? result.restrictions : ['Не соответствует текущим параметрам запроса.'],
    sourceId: result.sources?.[0]?.source_id || result.program.source_ids?.[0] || 'SOURCE',
    url: result.sources?.[0]?.url || ''
  }));
  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      const blob = await generateDocxReport(query, okedName, passedCorePrograms);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NC_Decision_Report_${cleanCode}_${query.location_name || 'RK'}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate DOCX', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const markdownReport = `
# ${t.title}
*${t.subtitle} (${new Date().toLocaleDateString(language === 'kk' ? 'kk-KZ' : 'ru-RU')})*

### ${t.paramsTitle}
- **${t.okedLabel}** \`${cleanCode}\` (${okedName})
- **${language === 'kk' ? 'Өңір:' : 'Регион:'}** ${query.region_name || query.location_name || (language === 'kk' ? 'Көрсетілмеген' : 'Не указан')}
${query.district_name ? `- **${language === 'kk' ? 'Аудан / қала:' : 'Район / город:'}** ${query.district_name}` : ''}
- **${t.financierLabel}** ${t.financierValue}

---

### ${t.programsTitle}
${!isIskerPass && query.region_id ? `> **«Іскер аймақ»:** ${iskerNegativeReason}\n\n` : ''}${passedCorePrograms.map((p, i) => `
#### ${i + 1}. ${p.title}
- **${language === 'kk' ? 'Санаты:' : 'Категория:'}** ${p.category}
- **${t.limitLabel}** ${p.limit}
- **${t.rateLabel}** ${p.rate}
- **${t.termPurposeLabel}** ${p.term} | ${p.purposes}
- **${t.whoFinancesLabel}** ${p.financier}
- **${t.justificationLabel}** ${p.note}
- **${t.officialSource}** [${p.sourceId}](${p.url})
`).join('\n')}

---
*${t.legalNoteDesc}*
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`border rounded-2xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ${
        isLight 
          ? 'bg-white border-neutral-300 text-neutral-900 shadow-neutral-400/30' 
          : 'bg-[#060814] border-[#172036] text-[#F4F7FF] shadow-[0_0_50px_rgba(0,0,0,0.9)]'
      }`}>
        
        {/* Шапка отчёта */}
        <div className={`px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 ${
          isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-[#02040A] border-[#172036]'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <FileText className={`w-5 h-5 shrink-0 ${isLight ? 'text-black' : 'text-[#00E5FF]'}`} />
            <div className="min-w-0">
              <h2 className={`text-sm sm:text-base font-bold tracking-tight truncate ${isLight ? 'text-neutral-900' : 'text-[#F4F7FF]'}`}>
                {t.title}
              </h2>
              <span className={`text-xs font-mono truncate block ${isLight ? 'text-neutral-500' : 'text-slate-400'}`}>
                OKED: {cleanCode} · {query.region_name || query.location_name || (language === 'kk' ? 'Қазақстан' : language === 'en' ? 'Kazakhstan' : language === 'zh' ? '哈萨克斯坦' : 'Казахстан')}{query.district_name ? ` · ${query.district_name}` : ''}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
              isLight 
                ? 'text-neutral-500 hover:text-black hover:bg-neutral-200' 
                : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#201850]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело отчёта */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          
          {/* Сводка параметров */}
          <div className={`p-3.5 sm:p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs ${
            isLight 
              ? 'bg-neutral-50 border-neutral-200' 
              : 'bg-[#080A1A]/80 border-[#2A2360]'
          }`}>
            <div className="space-y-0.5">
              <span className={`text-[11px] ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                {t.okedLabel}
              </span>
              <div className={`font-mono font-bold text-sm ${isLight ? 'text-neutral-900' : 'text-[#00E5FF]'}`}>
                {cleanCode}
              </div>
              <span className={`text-[11px] block leading-tight ${isLight ? 'text-neutral-600' : 'text-slate-400'}`}>
                {okedName}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className={`text-[11px] ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                {t.territoryLabel}
              </span>
              <div className={`font-medium ${isLight ? 'text-neutral-900' : 'text-[#F4F7FF]'}`}>
                {query.region_name || query.location_name || (language === 'kk' ? 'Көрсетілмеген' : language === 'en' ? 'Not specified' : language === 'zh' ? '未指定' : 'Не указан')}
              </div>
              <span className={`text-[11px] font-mono block ${isLight ? 'text-blue-600' : 'text-[#2F8BFF]'}`}>
                {query.district_name
                  ? `${language === 'kk' ? 'Аудан/қала' : language === 'en' ? 'District/city' : language === 'zh' ? '区/城市' : 'Район/город'}: ${query.district_name}`
                  : (query.location_level === 'city'
                      ? (language === 'kk' ? 'Қала (city)' : language === 'en' ? 'City' : language === 'zh' ? '城市' : 'Город (city)')
                      : (language === 'kk' ? 'Облыс (region)' : language === 'en' ? 'Region' : language === 'zh' ? '州' : 'Область (region)'))}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className={`text-[11px] ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                {t.whoFinancesLabel}
              </span>
              <div className={`font-medium flex items-center gap-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>БВУ РК + Фонд «Даму»</span>
              </div>
              <span className={`text-[11px] block ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                Halyk, Forte, БЦК, Bereke, Jusan
              </span>
            </div>
          </div>

          {/* Предупреждение об исключении торговли в городах республиканского значения */}
          {isRepCity && isTradeOked && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
              isLight 
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs' 
                : 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            }`}>
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold">
                  {language === 'kk' 
                    ? 'Аумақтық шектеу: Республикалық маңызы бар қала (Астана / Алматы / Шымкент)'
                    : language === 'en'
                      ? `Territorial restriction: City of republican significance (${query.location_name})`
                      : language === 'zh'
                        ? `区域政策限制：直辖市（${query.location_name}）`
                        : `Ограничение локализации: Город республиканского значения (${query.location_name})`}
                </strong>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {language === 'kk'
                    ? '«Даму» Қорының ресми ережесі бойынша ішкі сауда саласындағы (ЭҚЖЖ 46, 47, 68.20) несиелердің сыйақы мөлшерлемесін субсидиялау Астана, Алматы және Шымкент қалаларында ҚОЛДАНЫЛМАЙДЫ. Сауда бойынша жеңілдіктер тек облыстарда, моноқалаларда және ауылдық аумақтарда жұмыс істейді. Республикалық маңызы бар қалалардағы сауда субъектілері үшін 85%-ға дейінгі несие кепілдігі (1-ші Кепілдік қоры) қолжетімді, бірақ пайыздық мөлшерлемені субсидиялау берілмейді.'
                    : language === 'en'
                      ? 'According to official regulations of Damu Fund, interest rate subsidies for internal trade loans (OKED 46, 47, 68.20) ARE NOT PROVIDED in cities of republican significance (Astana, Almaty, Shymkent). Trade subsidy programs operate strictly in regional areas, monotowns, and rural areas. For trade enterprises in republican cities, loan guarantees are available (Damu Guarantee Fund 1 up to 85%), but interest rate subsidies are excluded.'
                      : language === 'zh'
                        ? '根据哈萨克斯坦“达姆”基金官方规程，针对国内商业贸易领域贷款（OKED代码 46, 47, 68.20）的利率贴息政策在直辖市（阿斯塔纳、阿拉木图、奇姆肯特）不予执行。贸易贴息政策仅在各州、单一产业城市及农村地区实施。直辖市内的商贸企业可申请达姆第一担保基金（最高85%的抵押贷款担保），但无法享受贷款利息贴息。'
                        : `По официальному регламенту АО «ФРП «Даму» субсидирование процентной ставки по кредитам в сфере внутренней торговли (ОКЭД 46, 47, 68.20) в городах Астана, Алматы и Шымкент НЕ ПРЕДОСТАВЛЯЕТСЯ. Программа субсидирования торговли действует исключительно в областях, моногородах и сельских населенных пунктах. Для торговых предприятий в городах республиканского значения доступно гарантирование займов (Гарантийный фонд 1 Даму до 85%), но не субсидирование ставки.`}
                </p>
              </div>
            </div>
          )}

          {!isIskerPass && query.region_id && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-[#0B1020] border-[#334155] text-slate-300'
            }`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isLight ? 'text-slate-600' : 'text-amber-400'}`} />
              <div className="space-y-1">
                <strong className={`block font-bold ${isLight ? 'text-neutral-900' : 'text-[#F4F7FF]'}`}>
                  {language === 'kk' ? '«Іскер аймақ» бойынша сәйкестік расталмады' : language === 'en' ? 'Isker Aymak eligibility not confirmed' : language === 'zh' ? '未确认符合“Іскер аймақ”条件' : '«Іскер аймақ»: не соответствует выбранным параметрам'}
                </strong>
                <p className="text-[11px] leading-relaxed">
                  {iskerNegativeReason}
                </p>
              </div>
            </div>
          )}

          {/* ЦЕЛЕВЫЕ ПРОГРАММЫ ПО ПРЕДОСТАВЛЕННЫМ ДАННЫМ */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h3 className={`text-xs sm:text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-neutral-900' : 'text-[#00E5FF]'
              }`}>
                <Sparkles className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLight ? 'text-amber-500' : 'text-[#8B5CFF]'}`} />
                <span>{t.programsTitle}</span>
              </h3>
              <span className={`text-[11px] sm:text-xs font-mono ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                {passedCorePrograms.length} {passedCorePrograms.length === 1 ? t.programsCountOne : t.programsCount}
              </span>
            </div>

            {passedCorePrograms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {passedCorePrograms.map((prog, idx) => (
                  <div 
                    key={prog.id}
                    className={`p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between space-y-2.5 sm:space-y-3 transition-all ${
                      isLight 
                        ? 'bg-neutral-50 border-neutral-300 hover:border-black' 
                        : 'bg-[#080A1A] border-[#8B5CFF]/30 hover:border-[#8B5CFF]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className={`flex items-center justify-between gap-2 border-b pb-2 ${
                        isLight ? 'border-neutral-200' : 'border-[#2A2360]'
                      }`}>
                        <span className={`text-[10px] sm:text-[11px] font-mono uppercase tracking-wider truncate ${
                          isLight ? 'text-amber-700 font-semibold' : 'text-[#CBA13A]'
                        }`}>
                          #{idx + 1} {prog.category}
                        </span>
                        <a
                          href={prog.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={`text-[11px] font-mono flex items-center gap-1 shrink-0 ${
                            isLight ? 'text-blue-600 hover:text-black' : 'text-[#2F8BFF] hover:text-[#00E5FF]'
                          }`}
                        >
                          <span>{prog.sourceId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <h4 className={`text-xs sm:text-sm font-bold leading-snug ${isLight ? 'text-neutral-900' : 'text-[#F4F7FF]'}`}>
                        {prog.title}
                      </h4>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className={`text-[11px] block ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                            {t.limitLabel}
                          </span>
                          <strong className={`font-mono text-xs ${isLight ? 'text-neutral-900 font-extrabold' : 'text-[#00E5FF]'}`}>
                            {prog.limit}
                          </strong>
                        </div>

                        <div>
                          <span className={`text-[11px] block ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                            {t.rateLabel}
                          </span>
                          <span className={`leading-relaxed block ${isLight ? 'text-neutral-700' : 'text-slate-300'}`}>
                            {prog.rate}
                          </span>
                        </div>

                        <div>
                          <span className={`text-[11px] block ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                            {t.termPurposeLabel}
                          </span>
                          <span className={`leading-relaxed block ${isLight ? 'text-neutral-700' : 'text-slate-300'}`}>
                            {prog.term} · {prog.purposes}
                          </span>
                        </div>

                        <div>
                          <span className={`text-[11px] block ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
                            {t.whoFinancesLabel}
                          </span>
                          <span className={`leading-relaxed block ${isLight ? 'text-neutral-700' : 'text-slate-300'}`}>
                            {prog.financier}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`pt-2 border-t text-[11px] ${
                      isLight ? 'border-neutral-200 text-neutral-500' : 'border-[#2A2360]/60 text-[#94A3B8]'
                    }`}>
                      {prog.note}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-4 rounded-xl border text-xs ${
                isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-600' : 'bg-[#080A1A] border-[#2A2360] text-[#94A3B8]'
              }`}>
                {t.noPrograms}
              </div>
            )}
          </div>
        </div>

        {/* Подвал отчёта */}
        <div className={`px-4 sm:px-6 py-3 sm:py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs ${
          isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-[#080A1A] border-[#2A2360]'
        }`}>
          <span className={`hidden sm:inline ${isLight ? 'text-neutral-500' : 'text-[#94A3B8]'}`}>
            NC Consulting · {t.subtitle}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-initial justify-center px-3.5 py-2.5 sm:py-2 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                isLight 
                  ? 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300' 
                  : 'bg-[#201850] hover:bg-[#2A2360] text-[#F4F7FF] border-[#8B5CFF]/30'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-black' : 'text-[#00E5FF]'}`} />}
              <span className="text-xs">{copied ? t.copiedBtn : t.copyBtn}</span>
            </button>

            {/* Скачать DOCX файл */}
            <button
              onClick={handleDownloadDocx}
              disabled={isExportingDocx}
              className={`flex-1 sm:flex-initial justify-center px-4 py-2.5 sm:py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-bold disabled:opacity-50 touch-manipulation active:scale-95 ${
                isLight
                  ? 'bg-neutral-900 hover:bg-black text-white shadow-sm'
                  : 'bg-[#00E5FF] hover:bg-[#33ebff] text-slate-950 shadow-[0_0_15px_rgba(0,229,255,0.4)]'
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="text-xs">{isExportingDocx ? t.generatingDocx : t.downloadDocxBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

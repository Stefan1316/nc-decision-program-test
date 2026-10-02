import { damuKnowledgeBase } from '../data/damuDatabase';
import { DamuProgram, ProgramMatchResult, ProgramStatus, UserQuery } from '../types/damu';
import { checkOrleuEligibility } from '../data/orleuPriorityOkeds';
import { checkIskerDistrictEligibility } from './iskerEligibility';

export interface EvaluationSummary {
  query: UserQuery;
  total_checked: number;
  exact_matches: ProgramMatchResult[];
  possible_matches: ProgramMatchResult[];
  needs_clarification: ProgramMatchResult[];
  needs_verification: ProgramMatchResult[];
  not_applicable: ProgramMatchResult[];
  is_broad_oked: boolean;
  broad_oked_warning?: string;
  identified_clarifications: string[];
}

export const REPUBLICAN_CITIES = ['алматы', 'астана', 'шымкент'];

export function normalizeOked(code: string): { cleanCode: string; isBroad: boolean; warning?: string } {
  const trimmed = code.trim().replace(/,/g, '.').replace(/\s+/g, '');
  if (!trimmed) {
    return { cleanCode: '', isBroad: true, warning: 'Код ОКЭД не указан' };
  }
  
  // Single letter section like 'C', 'A', 'G'
  if (/^[A-Za-zА-Яа-я]$/i.test(trimmed)) {
    return {
      cleanCode: trimmed.toUpperCase(),
      isBroad: true,
      warning: `Указан только буквенный раздел («${trimmed.toUpperCase()}»). Для точного подбора программ Фонда Damu требуется указать 4- или 5-значный код ОКЭД.`
    };
  }

  // Pure 2-digit class like '10' or '46'
  if (/^\d{2}$/.test(trimmed)) {
    return {
      cleanCode: trimmed,
      isBroad: true,
      warning: `Указан 2-значный раздел («${trimmed}»). Результат носит предварительный характер; отдельные программы требуют детальный подкласс (например, 10.51 или 46.73).`
    };
  }

  return { cleanCode: trimmed, isBroad: false };
}

export function isRepublicanCity(locationName: string, level?: string): boolean {
  if (!locationName) return false;
  const lower = locationName.toLowerCase().trim();
  
  // Исключаем Алматинскую область (это область, не город республиканского значения)
  if (lower.includes('алматинская') || lower.includes('алматы облысы') || lower === 'almaty-region') {
    return false;
  }
  
  // Проверяем прямое указание на города республиканского значения
  if (
    lower.includes('астана') ||
    lower.includes('astana') ||
    lower.includes('шымкент') ||
    lower.includes('shymkent') ||
    lower === 'almaty-city' ||
    lower === 'astana-city' ||
    lower === 'shymkent-city' ||
    (lower.includes('алматы') && (level === 'city' || lower.includes('г.') || lower.includes('город') || lower.includes('қ.') || lower.includes('city') || lower === 'алматы'))
  ) {
    return true;
  }

  return false;
}

export function evaluatePrograms(query: UserQuery): EvaluationSummary {
  const { cleanCode, isBroad, warning } = normalizeOked(query.oked_code);
  const geographyName = query.region_name || query.location_name;
  const geographyLevel = query.location_level === 'district' ? 'region' : query.location_level;
  const isRepCity = isRepublicanCity(geographyName, geographyLevel);
  
  const exact_matches: ProgramMatchResult[] = [];
  const possible_matches: ProgramMatchResult[] = [];
  const needs_clarification: ProgramMatchResult[] = [];
  const needs_verification: ProgramMatchResult[] = [];
  const not_applicable: ProgramMatchResult[] = [];
  const clarificationSet = new Set<string>();

  for (const prog of damuKnowledgeBase.programs) {
    const matched_reasons: string[] = [];
    const restrictions: string[] = [];
    const missing_inputs: string[] = [];
    let okedMatchLevel: string = 'compatible';

    // 1. Geography evaluation
    if (prog.id === 'damu.subsidy.isker_aymak') {
      if (isRepCity) {
        restrictions.push(`Программа «Іскер аймақ» действует исключительно в регионах, моногородах и малых городах. Города республиканского значения (${query.location_name}) исключены из программы.`);
      } else {
        matched_reasons.push(`Территория проекта (${query.location_name || 'Регион'}) соответствует условиям программы «Іскер аймақ».`);
      }
    }

    // 2. Settlement type evaluation
    if (prog.id === 'damu.loan.micro_regional') {
      if (query.settlement_type === 'village' || query.settlement_type === 'monotown') {
        matched_reasons.push(`Тип населенного пункта (${query.settlement_type === 'village' ? 'Село' : 'Моногород'}) получает максимальный приоритет и льготные условия.`);
      }
    }

    // 3. OKED evaluation
    // Special program: Inner Trade subsidy (Субсидирование внутренней торговли)
    if (prog.id === 'damu.subsidy.inner_trade' || prog.id === 'damu.subsidy.retail_trade') {
      const isTradeOked = cleanCode.startsWith('46') || cleanCode.startsWith('47') || cleanCode.startsWith('68.20');
      if (isRepCity) {
        okedMatchLevel = 'excluded';
        restrictions.push(`По официальному регламенту АО «ФРП «Даму» субсидирование ставки вознаграждения по кредитам в сфере внутренней торговли (ОКЭД 46, 47, 68.20) в городах республиканского значения (Астана, Алматы, Шымкент) НЕ ПРЕДОСТАВЛЯЕТСЯ. Поддержка внутренней торговли действует исключительно в регионах, областных центрах, моно- и малых городах и сельских населенных пунктах.`);
      } else if (isTradeOked) {
        okedMatchLevel = 'exact';
        matched_reasons.push(`ОКЭД ${cleanCode} входит в перечень внутренней торговли (разделы 46, 47) и сопутствующей аренды торговой недвижимости (68.20.3-68.20.5).`);
      } else {
        okedMatchLevel = 'excluded';
        restrictions.push(`Программа доступна исключительно для субъектов торговли (ОКЭД разделов 46, 47, а также 68.20.3-68.20.5).`);
      }
    } 
    
    // Isker Aymak: точная проверка по региону + району/городу + иерархии ОКЭД
    else if (prog.id === 'damu.subsidy.isker_aymak') {
      const isExcluded23 = cleanCode.startsWith('23.63');
      const isExcluded24 = ['24.10', '24.46', '24.51', '24.52'].some(ex => cleanCode.startsWith(ex));

      if (isExcluded23) {
        okedMatchLevel = 'excluded';
        restrictions.push('ОКЭД 23.63 (Производство товарного бетона) прямо исключен из программы «Іскер аймақ».');
      } else if (isExcluded24) {
        okedMatchLevel = 'excluded';
        restrictions.push(`ОКЭД ${cleanCode} (первичная металлургия) исключен из программы «Іскер аймақ».`);
      } else if (query.region_id) {
        const iskerCheck = checkIskerDistrictEligibility(
          query.region_id,
          query.district_name,
          cleanCode
        );

        if (query.district_name) {
          if (!iskerCheck.districtFound) {
            okedMatchLevel = 'verification_needed';
            missing_inputs.push('Проверка выбранного города/района по официальной матрице МИО');
            matched_reasons.push(iskerCheck.reason);
          } else if (iskerCheck.matched) {
            okedMatchLevel = 'exact';
            matched_reasons.push(iskerCheck.reason);
          } else {
            okedMatchLevel = 'excluded';
            restrictions.push(iskerCheck.reason);
          }
        } else {
          if (iskerCheck.matched) {
            okedMatchLevel = 'compatible';
            matched_reasons.push(iskerCheck.reason);
            missing_inputs.push('Конкретный город/район для точной проверки «Іскер аймақ»');
            clarificationSet.add('location');
          } else {
            okedMatchLevel = 'excluded';
            restrictions.push(iskerCheck.reason);
          }
        }
      } else {
        okedMatchLevel = 'verification_needed';
        missing_inputs.push('Регион и конкретный город/район для проверки матрицы «Іскер аймақ»');
        matched_reasons.push('Для программы «Іскер аймақ» требуется территориальная проверка по матрице МИО.');
        clarificationSet.add('location');
      }
    }

    // Agro subsidy
    else if (prog.id === 'damu.subsidy.agro_processing') {
      const isAgro = cleanCode.startsWith('10') || cleanCode.startsWith('01') || cleanCode.startsWith('11.06') || cleanCode.startsWith('11.07');
      if (isAgro) {
        okedMatchLevel = 'exact';
        matched_reasons.push(`ОКЭД ${cleanCode} относится к агропромышленному комплексу и переработке сельхозпродукции.`);
      } else {
        okedMatchLevel = 'compatible';
        matched_reasons.push(`Программа ориентирована на АПК. Требуется подтверждение связи проекта с сельхозпроизводством.`);
        missing_inputs.push('Подтверждение принадлежности проекта к субъектам АПК');
        clarificationSet.add('purpose');
      }
    }

    // Orleu Loan: Проверка по официальному Перечню приоритетных видов экономической деятельности программы «Өрлеу»
    else if (prog.id === 'damu.loan.orleu') {
      const orleuCheck = checkOrleuEligibility(cleanCode);

      if (orleuCheck.isExcluded) {
        okedMatchLevel = 'excluded';
        restrictions.push(orleuCheck.exclusionReason || `ОКЭД ${cleanCode} исключен из программы «Өрлеу».`);
      } else if (orleuCheck.matched) {
        okedMatchLevel = 'exact';
        matched_reasons.push(orleuCheck.reason || `ОКЭД ${cleanCode} входит в утвержденный перечень приоритетных отраслей программы «Өрлеу».`);
      } else {
        const okedNum = parseInt(cleanCode.slice(0, 2), 10);
        const isMfg = !isNaN(okedNum) && okedNum >= 10 && okedNum <= 33;
        if (isMfg) {
          okedMatchLevel = 'compatible';
          matched_reasons.push(`ОКЭД ${cleanCode} относится к обрабатывающей промышленности (раздел ${okedNum}). Требуется подтверждение соответствия детальному перечню программы «Өрлеу».`);
        } else {
          okedMatchLevel = 'excluded';
          restrictions.push(`ОКЭД ${cleanCode} не входит в утвержденный перечень приоритетных направлений «Өрлеу» (обрабатывающая промышленность, транспорт и логистика).`);
        }
      }
    }

    // Orleu Leasing: Секция C (ОКЭД 10-33) + транспорт и спецтехника программы «Өрлеу»
    else if (prog.id === 'damu.leasing.orleu') {
      const orleuCheck = checkOrleuEligibility(cleanCode);

      if (orleuCheck.isExcluded) {
        okedMatchLevel = 'excluded';
        restrictions.push(orleuCheck.exclusionReason || `ОКЭД ${cleanCode} исключен из программы «Өрлеу-Лизинг».`);
      } else if (orleuCheck.matched) {
        okedMatchLevel = 'exact';
        matched_reasons.push(orleuCheck.reason || `ОКЭД ${cleanCode} входит в перечень приоритетных видов деятельности «Өрлеу-Лизинг».`);
      } else {
        const isAlcohol = ['11.01', '11.02', '11.03', '11.04', '11.05'].some(ex => cleanCode.startsWith(ex));
        const isTobacco = cleanCode.startsWith('12');
        const isWeapons = cleanCode.startsWith('25.4');

        if (isAlcohol || isTobacco || isWeapons) {
          okedMatchLevel = 'excluded';
          restrictions.push(`Производство подакцизной продукции или оружия (${cleanCode}) прямо исключено из программы «Өрлеу-Лизинг».`);
        } else {
          const okedNum = parseInt(cleanCode.slice(0, 2), 10);
          if (!isNaN(okedNum) && okedNum >= 10 && okedNum <= 33) {
            okedMatchLevel = 'compatible';
            matched_reasons.push(`ОКЭД ${cleanCode} относится к Секции C «Обрабатывающая промышленность».`);
          } else {
            okedMatchLevel = 'excluded';
            restrictions.push(`Программа «Өрлеу-Лизинг» поддерживает исключительно обрабатывающую промышленность и транспортную инфраструктуру.`);
          }
        }
      }
    }

    // Social enterprise programs
    else if (prog.id.includes('.social')) {
      okedMatchLevel = 'social_only';
      matched_reasons.push('Без отраслевых ограничений при наличии статуса в реестре социального предпринимательства.');
      if (query.social_enterprise_registry === false) {
        restrictions.push('Требуется обязательное нахождение в Реестре субъектов социального предпринимательства.');
      } else if (query.social_enterprise_registry === true) {
        matched_reasons.push('Включение в Реестр субъектов социального предпринимательства подтверждено.');
      } else {
        missing_inputs.push('Наличие записи в реестре субъектов социального предпринимательства');
        clarificationSet.add('social_enterprise_registry');
      }
    }

    // General Damu programs (Guarantee Fund 1, EKP Micro/SME/Large)
    else {
      okedMatchLevel = 'compatible';
      matched_reasons.push('Программа доступна для широкого круга субъектов частного предпринимательства.');
    }

    // 4. Unified eligibility checks shared by ALL programs
    // Instrument preference
    if (query.instrument_preference) {
      const instrument = (prog.instrument_type || '').toLowerCase();
      const requested = query.instrument_preference.toLowerCase();
      const instrumentMatches =
        (requested.includes('субсид') && instrument.includes('субсид')) ||
        (requested.includes('гарант') && instrument.includes('гарант')) ||
        (requested.includes('кредит') && (instrument.includes('кредит') || instrument.includes('займ'))) ||
        (requested.includes('лизинг') && instrument.includes('лизинг'));

      if (!instrumentMatches) {
        restrictions.push(`Выбран предпочтительный инструмент «${query.instrument_preference}», а программа относится к инструменту «${prog.instrument_type}».`);
      } else {
        matched_reasons.push(`Инструмент программы соответствует предпочтению: ${query.instrument_preference}.`);
      }
    }

    // Financing purpose
    if (query.purpose) {
      const purposeText = (prog.purpose_short || '').toLowerCase();
      const requestedPurpose = query.purpose.toLowerCase();
      const purposeMatches =
        (requestedPurpose.includes('инвест') && purposeText.includes('инвест')) ||
        (requestedPurpose.includes('оборот') && (purposeText.includes('оборот') || purposeText.includes('пополн'))) ||
        (requestedPurpose.includes('рефин') && purposeText.includes('рефин')) ||
        (requestedPurpose.includes('лизинг') && (purposeText.includes('лизинг') || (prog.instrument_type || '').toLowerCase().includes('лизинг')));

      if (!purposeMatches && prog.purpose_short) {
        restrictions.push(`Цель «${query.purpose}» не подтверждена условиями программы: ${prog.purpose_short}.`);
      } else if (purposeMatches) {
        matched_reasons.push(`Цель финансирования «${query.purpose}» соответствует назначению программы.`);
      }
    }

    // Geography completeness: regional programs that depend on a district must have it selected.
    if (prog.id === 'damu.subsidy.isker_aymak' && query.region_id && !query.district_name) {
      missing_inputs.push('Конкретный район/город для точной территориальной проверки программы «Іскер аймақ»');
      clarificationSet.add('location');
    }

    // 5. Clarification Evaluation (Step 2 checks if filled)
    if (query.tax_arrears === true) {
      if (prog.id === 'damu.loan.orleu' || prog.id === 'damu.leasing.orleu' || prog.id.includes('guarantee_fund')) {
        restrictions.push('Наличие непогашенной налоговой задолженности прямо запрещает участие в данной программе.');
      }
    }

    if (query.overdue_debt_days && query.overdue_debt_days > 60) {
      if (prog.id === 'damu.loan.orleu') {
        restrictions.push(`Просроченная задолженность свыше 60 дней (${query.overdue_debt_days} дн.) исключает финансирование по программе «Өрлеу».`);
      }
    }

    if (query.operating_years !== null && query.operating_years !== undefined) {
      if (prog.id === 'damu.leasing.orleu' && query.operating_years < 1) {
        restrictions.push('Для «Өрлеу-Лизинг» требуется не менее одного полного операционного календарного года деятельности.');
      }
    }

    if (query.amount_kzt && prog.amount_max_kzt) {
      if (query.amount_kzt > prog.amount_max_kzt) {
        restrictions.push(`Запрашиваемая сумма (${(query.amount_kzt / 1e6).toLocaleString('ru-RU')} млн тг) превышает максимальный лимит программы (${prog.amount_max_text}).`);
      }
    }

    if (prog.id === 'damu.guarantee.guarantee_fund_2' && query.amount_kzt) {
      if (query.amount_kzt <= 1000000000) {
        restrictions.push(`Сумма кредита до 1 млрд тенге обслуживается по базовой программе «Гарантийный фонд 1». Фонд 2 предназначен для крупных займов от 1 до 7 млрд тенге.`);
      }
    }

    // 5. Final Status Calculation
    let status: ProgramStatus = 'possible_match';
    let status_label_ru = 'Возможное соответствие';

    if (restrictions.length > 0 && restrictions.some(r => r.includes('исключен') || r.includes('запрещает') || r.includes('превышает') || r.includes('исключает') || r.includes('не подтверждена условиями программы') || r.includes('предпочтительный инструмент'))) {
      status = 'not_applicable';
      status_label_ru = 'Не применимо';
    } else if (okedMatchLevel === 'exact' && restrictions.length === 0) {
      status = 'exact_match';
      status_label_ru = 'Точное соответствие';
    } else if (okedMatchLevel === 'excluded') {
      status = 'not_applicable';
      status_label_ru = 'Не применимо';
    } else if (missing_inputs.length > 0) {
      status = 'needs_clarification';
      status_label_ru = 'Требуется уточнение';
    } else if (okedMatchLevel === 'verification_needed') {
      status = 'needs_verification';
      status_label_ru = 'Требуется верификация';
    } else {
      status = 'possible_match';
      status_label_ru = 'Возможное соответствие';
    }

    const result: ProgramMatchResult = {
      program: prog,
      status,
      status_label_ru,
      matched_reasons,
      restrictions,
      missing_inputs,
      confidence: prog.data_quality === 'high' ? 'high' : 'medium',
      sources: prog.sources
    };

    if (status === 'exact_match') exact_matches.push(result);
    else if (status === 'possible_match') possible_matches.push(result);
    else if (status === 'needs_clarification') needs_clarification.push(result);
    else if (status === 'needs_verification') needs_verification.push(result);
    else not_applicable.push(result);
  }

  return {
    query,
    total_checked: damuKnowledgeBase.programs.length,
    exact_matches,
    possible_matches,
    needs_clarification,
    needs_verification,
    not_applicable,
    is_broad_oked: isBroad,
    broad_oked_warning: warning,
    identified_clarifications: Array.from(clarificationSet)
  };
}

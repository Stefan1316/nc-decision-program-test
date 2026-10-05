import { EvaluationSummary } from './decisionEngine';
import { resolveOked } from '../data/okedMaster';

export interface FundingFallbackRoute {
  show: boolean;
  headline: string;
  explanation: string;
  routes: Array<{
    id: 'commercial_bvu' | 'damu_guarantee' | 'leasing' | 'regional_other';
    title: string;
    status: 'available_route' | 'needs_verification';
    description: string;
  }>;
  okedRecognized: boolean;
  okedName?: string;
}

export function buildFundingFallback(summary: EvaluationSummary): FundingFallbackRoute {
  const resolution = resolveOked(summary.query.oked_code);
  const hasConfirmedConcession =
    summary.exact_matches.some((r) =>
      ['Субсидирование ставки', 'Льготное кредитование', 'Лизинг'].includes(r.program.instrument_type)
    ) ||
    summary.possible_matches.some((r) =>
      ['Субсидирование ставки', 'Льготное кредитование'].includes(r.program.instrument_type)
    );

  const guaranteeCandidate = [...summary.exact_matches, ...summary.possible_matches, ...summary.needs_clarification, ...summary.needs_verification]
    .some((r) => r.program.instrument_type.toLowerCase().includes('гарант'));

  const routes: FundingFallbackRoute['routes'] = [];

  if (!hasConfirmedConcession && resolution.found) {
    routes.push({
      id: 'commercial_bvu',
      title: 'Стандартное банковское финансирование',
      status: 'available_route',
      description: 'Льготная ставка по подключённым программам не подтверждена. Возможен кредит БВУ по коммерческой ставке, определяемой банком по проекту, сроку и риск-профилю. NC Decision не подставляет фиксированную ставку без подтверждённого банковского источника.'
    });

    routes.push({
      id: 'damu_guarantee',
      title: 'Гарантийные инструменты Фонда «Даму»',
      status: guaranteeCandidate ? 'needs_verification' : 'needs_verification',
      description: 'Если проблема проекта — недостаточность залогового обеспечения, следует отдельно проверить применимость гарантии Фонда «Даму». Гарантия не означает автоматического снижения процентной ставки.'
    });

    routes.push({
      id: 'leasing',
      title: 'Коммерческий лизинг',
      status: 'needs_verification',
      description: 'Для оборудования и техники возможен отдельный маршрут через лизинговые компании. Ставка и условия проверяются по конкретному предмету лизинга и финансирующей организации.'
    });

    routes.push({
      id: 'regional_other',
      title: 'Региональные и иные институты',
      status: 'needs_verification',
      description: 'После подключения модулей СПК, СЭЗ и других институтов этот блок будет автоматически проверять дополнительные маршруты по территории и виду деятельности.'
    });
  }

  return {
    show: !hasConfirmedConcession && resolution.found,
    headline: 'Льготная программа по текущим параметрам не подтверждена',
    explanation: 'Отсутствие подходящей льготной программы не означает отсутствие финансирования. Система переводит проект на альтернативный маршрут без присвоения ОКЭД абсолютного статуса «неприоритетный».',
    routes,
    okedRecognized: resolution.found,
    okedName: resolution.record?.nameRu
  };
}

import type { WindowRigelCalculationResult } from '@/domain/window-rigel/model/window-rigel-output'

function formatNumber(value: number, fractionDigits = 3): string {
  return value.toFixed(fractionDigits).replace('.', ',')
}

function formatCandidateLine(
  rank: number,
  candidate: WindowRigelCalculationResult['bottomCandidates'][number],
): string {
  return [
    `${rank}. ${candidate.profile} / ${candidate.steelGrade}`,
    `масса=${formatNumber(candidate.massKg, 4)} кг`,
    `гибк=${formatNumber(candidate.utilization.flexibility, 4)}`,
    `прочн=${formatNumber(candidate.utilization.strength, 4)}`,
    `прогиб=${formatNumber(candidate.utilization.deflection, 4)}`,
  ].join(' | ')
}

export function formatWindowRigelDemoReport(result: WindowRigelCalculationResult): string {
  const lines: string[] = []

  lines.push('Оконные ригели')
  lines.push('')
  lines.push('Входные данные')
  lines.push(`Город: ${result.input.city}`)
  lines.push(`Высота окна: ${formatNumber(result.input.windowHeightM)} м`)
  lines.push(`Шаг рам: ${formatNumber(result.input.frameStepM)} м`)
  lines.push(`Тип окна: ${result.input.windowType}`)
  lines.push(`Конструкция: ${result.input.windowConstruction}`)
  lines.push(`Тип местности: ${result.input.terrainType}`)
  lines.push(`Макс. к-т использования: ${formatNumber(result.input.maxUtilization, 2)}`)
  lines.push('')
  lines.push('Нагрузки')
  lines.push(`Ветер: ${formatNumber(result.loads.windLoadKpa)} кПа`)
  lines.push(`Вертикальная: ${formatNumber(result.loads.verticalLoadKpa)} кПа`)
  lines.push(`Горизонтальная I ПС: ${formatNumber(result.loads.horizontalLoadCase1Kpa, 6)} кПа`)
  lines.push(`Горизонтальная II ПС: ${formatNumber(result.loads.horizontalLoadCase2Kpa, 6)} кПа`)
  lines.push('')
  lines.push('Длины')
  lines.push(`Из плоскости: ${formatNumber(result.lengths.outOfPlaneM)} м`)
  lines.push(`В плоскости: ${formatNumber(result.lengths.inPlaneM)} м`)
  lines.push('')
  lines.push('Нижний ригель')
  for (const [index, candidate] of result.bottomCandidates.entries()) {
    lines.push(formatCandidateLine(index + 1, candidate))
  }
  lines.push('')
  lines.push('Верхний ригель')
  for (const [index, candidate] of result.topCandidates.entries()) {
    lines.push(formatCandidateLine(index + 1, candidate))
  }

  return lines.join('\n')
}

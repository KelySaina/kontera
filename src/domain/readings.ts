/**
 * Validation et calcul des relevés de sous-compteurs.
 *
 *   consommation = relevé_final − relevé_initial
 *
 * Règles : valeurs >= 0, final >= initial, signaler les relevés manquants ou
 * incohérents. Les estimations ne sont jamais traitées comme des relevés réels.
 */
import type { ApartmentKey, ReadingIssue, Readings, ReadingsResult } from './types'

function validatePair(
  apartment: ApartmentKey,
  start: number | null,
  end: number | null,
): { consumption: number | null; issues: ReadingIssue[] } {
  const issues: ReadingIssue[] = []

  if (start === null || Number.isNaN(start)) {
    issues.push({ apartment, field: 'start', message: `Relevé initial ${apartment} manquant.` })
  } else if (start < 0) {
    issues.push({ apartment, field: 'start', message: `Relevé initial ${apartment} négatif.` })
  }

  if (end === null || Number.isNaN(end)) {
    issues.push({ apartment, field: 'end', message: `Relevé final ${apartment} manquant.` })
  } else if (end < 0) {
    issues.push({ apartment, field: 'end', message: `Relevé final ${apartment} négatif.` })
  }

  if (
    start !== null &&
    end !== null &&
    !Number.isNaN(start) &&
    !Number.isNaN(end) &&
    start >= 0 &&
    end >= 0
  ) {
    if (end < start) {
      issues.push({
        apartment,
        field: 'pair',
        message: `Relevé final ${apartment} inférieur au relevé initial.`,
      })
      return { consumption: null, issues }
    }
    return { consumption: end - start, issues }
  }

  return { consumption: null, issues }
}

export function computeReadings(readings: Readings): ReadingsResult {
  const a = validatePair('A', readings.startA, readings.endA)
  const b = validatePair('B', readings.startB, readings.endB)
  const issues = [...a.issues, ...b.issues]
  return {
    consumptionA: a.consumption,
    consumptionB: b.consumption,
    issues,
    complete: a.consumption !== null && b.consumption !== null,
  }
}

/**
 * Helpers monétaires. Tous les montants finaux sont des ariary entiers.
 * Les arrondis sont déterministes et la répartition conserve exactement le total.
 */

/** Arrondi déterministe au ariary entier (demi vers le haut). */
export function roundAr(value: number): number {
  // Math.round arrondit .5 vers +Infini, ce qui est déterministe pour value >= 0.
  // On corrige le cas des très petites erreurs flottantes avant d'arrondir.
  return Math.round(value + 1e-9)
}

/**
 * Répartit un `total` entier entre plusieurs parts selon des `weights`, de
 * manière déterministe, en garantissant que la somme des parts == total.
 *
 * Méthode du plus fort reste : on arrondit chaque part vers le bas, puis on
 * distribue les unités restantes aux parts ayant le plus grand reste
 * fractionnaire (départage stable par index croissant).
 *
 * @param total  montant entier à répartir (peut être 0)
 * @param weights poids >= 0 ; si tous nuls, répartition égale
 */
export function allocate(total: number, weights: number[]): number[] {
  const n = weights.length
  if (n === 0) return []
  const safeTotal = Math.round(total)
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0)

  // Poids tous nuls : on répartit également, le reste allant aux premiers index.
  const effective = sum > 0 ? weights.map((w) => Math.max(0, w)) : weights.map(() => 1)
  const effSum = sum > 0 ? sum : n

  const exact = effective.map((w) => (safeTotal * w) / effSum)
  const floors = exact.map((x) => Math.floor(x))
  let remainder = safeTotal - floors.reduce((a, b) => a + b, 0)

  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)

  const result = floors.slice()
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k].i] += 1
    remainder -= 1
  }
  return result
}

/** Formatage d'un montant en ariary pour l'affichage (séparateur d'espace). */
export function formatAr(value: number, currency = 'Ar'): string {
  const n = Math.round(value)
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${grouped} ${currency}`
}

/** Formatage d'un nombre de kWh (max 2 décimales, sans zéros inutiles). */
export function formatKwh(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return `${rounded.toString().replace('.', ',')} kWh`
}

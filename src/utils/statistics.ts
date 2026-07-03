/**
 * Statistical special functions and distribution CDFs.
 *
 * Implements the regularized incomplete beta function (continued fraction,
 * Lentz's method) and the regularized incomplete gamma function, both built
 * on a Lanczos log-gamma approximation. From these it derives the Student-t,
 * F, and chi-square distribution functions used for p-value computation.
 */

/** Lanczos coefficients (g = 7, n = 9). */
const LANCZOS_COEFFICIENTS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

const MAX_ITERATIONS = 500;
const EPSILON = 3e-14;
const FPMIN = 1e-300;

/**
 * Natural log of the gamma function via the Lanczos approximation.
 */
export function logGamma(z: number): number {
  if (!Number.isFinite(z)) {
    throw new Error(`logGamma requires a finite argument, got ${z}`);
  }
  if (z < 0.5) {
    // Reflection formula: Γ(z)·Γ(1−z) = π / sin(πz)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const x = z - 1;
  let sum = LANCZOS_COEFFICIENTS[0];
  for (let i = 1; i < LANCZOS_COEFFICIENTS.length; i++) {
    sum += LANCZOS_COEFFICIENTS[i] / (x + i);
  }
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum);
}

/**
 * Continued fraction for the incomplete beta function (modified Lentz's method).
 */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAX_ITERATIONS; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPSILON) return h;
  }
  throw new Error(`Incomplete beta continued fraction failed to converge (a=${a}, b=${b})`);
}

/**
 * Regularized incomplete beta function I_x(a, b).
 */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (a <= 0 || b <= 0) {
    throw new Error(`regularizedIncompleteBeta requires a > 0 and b > 0 (a=${a}, b=${b})`);
  }
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const logPrefix =
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const prefix = Math.exp(logPrefix);

  // Use the continued fraction directly where it converges fastest,
  // otherwise use the symmetry relation I_x(a,b) = 1 − I_{1−x}(b,a).
  if (x < (a + 1) / (a + b + 2)) {
    return (prefix * betaContinuedFraction(x, a, b)) / a;
  }
  return 1 - (prefix * betaContinuedFraction(1 - x, b, a)) / b;
}

/**
 * Regularized lower incomplete gamma function P(s, x).
 * Series expansion for x < s + 1, continued fraction (Lentz) otherwise.
 */
export function regularizedGammaP(s: number, x: number): number {
  if (s <= 0) {
    throw new Error(`regularizedGammaP requires s > 0 (s=${s})`);
  }
  if (x < 0) {
    throw new Error(`regularizedGammaP requires x >= 0 (x=${x})`);
  }
  if (x === 0) return 0;

  const logPrefix = -x + s * Math.log(x) - logGamma(s);

  if (x < s + 1) {
    // Series representation.
    let term = 1 / s;
    let sum = term;
    let n = s;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      n += 1;
      term *= x / n;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * EPSILON) {
        return sum * Math.exp(logPrefix);
      }
    }
    throw new Error(`Incomplete gamma series failed to converge (s=${s}, x=${x})`);
  }

  // Continued fraction for Q(s, x) = 1 − P(s, x).
  let b = x + 1 - s;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPSILON) {
      return 1 - Math.exp(logPrefix) * h;
    }
  }
  throw new Error(`Incomplete gamma continued fraction failed to converge (s=${s}, x=${x})`);
}

/**
 * Student-t cumulative distribution function P(T <= t) with df degrees of freedom.
 */
export function studentTCdf(t: number, df: number): number {
  if (df <= 0) {
    throw new Error(`studentTCdf requires df > 0 (df=${df})`);
  }
  const x = df / (df + t * t);
  const tailProbability = 0.5 * regularizedIncompleteBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - tailProbability : tailProbability;
}

/**
 * P-value for a Student-t statistic.
 * 'two-sided' (default): P(|T| >= |t|); 'greater': P(T >= t); 'less': P(T <= t).
 */
export function tTestPValue(
  t: number,
  df: number,
  tail: 'two-sided' | 'greater' | 'less' = 'two-sided'
): number {
  if (tail === 'greater') return 1 - studentTCdf(t, df);
  if (tail === 'less') return studentTCdf(t, df);
  return regularizedIncompleteBeta(df / (df + t * t), df / 2, 0.5);
}

/**
 * F-distribution CDF P(F <= f) with (df1, df2) degrees of freedom.
 */
export function fCdf(f: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0) {
    throw new Error(`fCdf requires positive degrees of freedom (df1=${df1}, df2=${df2})`);
  }
  if (f <= 0) return 0;
  return regularizedIncompleteBeta((df1 * f) / (df1 * f + df2), df1 / 2, df2 / 2);
}

/**
 * Upper-tail p-value for an F statistic: P(F >= f).
 */
export function fTestPValue(f: number, df1: number, df2: number): number {
  return 1 - fCdf(f, df1, df2);
}

/**
 * Chi-square CDF P(X <= x) with df degrees of freedom.
 */
export function chiSquareCdf(x: number, df: number): number {
  if (df <= 0) {
    throw new Error(`chiSquareCdf requires df > 0 (df=${df})`);
  }
  if (x <= 0) return 0;
  return regularizedGammaP(df / 2, x / 2);
}

/**
 * Upper-tail p-value for a chi-square statistic: P(X >= x).
 */
export function chiSquarePValue(x: number, df: number): number {
  return 1 - chiSquareCdf(x, df);
}

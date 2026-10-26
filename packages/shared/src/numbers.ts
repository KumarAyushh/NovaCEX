// Exact money math (P1.1) [CORE]. The ONLY place decimal strings become bigints.
//
// Units (CLAUDE.md 3.1):
//   atom  smallest unit of an asset (BTC 1e-8, USD 1e-6)
//   lot   qty step: `lotAtoms` base atoms
//   tick  price step: `tickAtoms` quote atoms per 1 whole base unit
// No `number` math on amounts here, ever (pitfall 1, invariant I7).

/** Largest atom amount we accept: fits Postgres Decimal(38,0). */
export const MAX_ATOMS = 10n ** 38n - 1n;

/** Largest `decimals` an asset may have (more could not fit in MAX_ATOMS). */
export const MAX_DECIMALS = 38;

/** 10000 bps = 100%. */
const BPS_PER_WHOLE = 10_000n;

// The accepted grammar (see parseDecimal) as a regex. Only ASCII 0-9 count as digits.
const PLAIN_DECIMAL = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;

/**
 * Why a string was rejected. The api turns both into a 400.
 *   invalid_number     not a plain decimal, or out of range
 *   invalid_precision  valid number, but finer than the asset / lot / tick allows
 */
export type NumberErrorCode = "invalid_number" | "invalid_precision";

export class NumberError extends Error {
  readonly code: NumberErrorCode;
  constructor(code: NumberErrorCode, message: string) {
    super(message);
    this.name = "NumberError";
    this.code = code;
  }
}

/** The grid of one market. `Market` from markets.ts (P1.2) satisfies this. */
export interface MarketGrid {
  baseDecimals: number;
  quoteDecimals: number;
  lotAtoms: bigint;
  tickAtoms: bigint;
  /** M = tickAtoms * lotAtoms / 10^baseDecimals, a positive integer (checked in markets.ts). */
  multiplier: bigint;
}

/** A bad `decimals` comes from our own code, not from a user, so it is a RangeError. */
function checkDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
    throw new RangeError(`decimals must be an integer in [0, ${MAX_DECIMALS}], got ${decimals}`);
  }
}

/**
 * Decimal string -> atoms. Example: parseDecimal("1.5", 8) === 150000000n.
 *
 * Accepted grammar (anything else -> invalid_number):
 *   int        "0" or a digit 1-9 followed by digits   (so "01.5", "00" are rejected)
 *   fraction   optional: "." followed by 1+ digits     (so ".5", "5." are rejected)
 *   no sign, no exponent, no spaces, no "_" or ","     ("+1", "-1", "1e-8", " 1" rejected)
 *
 * Checks, in this order:
 *   1. grammar                          -> invalid_number
 *   2. fraction digits <= decimals      -> invalid_precision (even "1.000000000" for 8: strict)
 *   3. result <= MAX_ATOMS              -> invalid_number
 * Trailing zeros inside the precision are fine: "1.50" -> 150000000n for 8 decimals.
 *
 * @throws RangeError if `decimals` is not an integer in [0, MAX_DECIMALS] (a bug, not user input).
 */
export function parseDecimal(str: string, decimals: number): bigint {
  checkDecimals(decimals);

  if (!PLAIN_DECIMAL.test(str)) {
    throw new NumberError("invalid_number", 'must be a plain decimal like "12.5" or "0.001"');
  }
  // "64250.25" -> whole "64250", fraction "25". "5" has no fraction.
  const dot = str.indexOf(".");
  const whole = dot === -1 ? str : str.slice(0, dot);
  const fraction = dot === -1 ? "" : str.slice(dot + 1);

  // Strict: we never round or drop digits the user typed.
  if (fraction.length > decimals) {
    throw new NumberError("invalid_precision", `at most ${decimals} decimal places`);
  }

  // Move the "." right by `decimals` places using text, so no float is ever involved.
  // "1.5" with 8 decimals -> "1" + "50000000" -> 150000000n.
  const atoms = BigInt(whole + fraction.padEnd(decimals, "0"));

  if (atoms > MAX_ATOMS) {
    throw new NumberError("invalid_number", "too large");
  }
  return atoms;
}

/**
 * Atoms -> shortest decimal string. Inverse of parseDecimal.
 *   formatAtoms(150000000n, 8) === "1.5"   (trailing zeros removed)
 *   formatAtoms(100000000n, 8) === "1"     (no dangling ".")
 *   formatAtoms(0n, 8)         === "0"
 *   formatAtoms(-5n, 2)        === "-0.05" (negatives allowed: ledger deltas)
 *
 * @throws RangeError if `decimals` is not an integer in [0, MAX_DECIMALS].
 */
export function formatAtoms(atoms: bigint, decimals: number): string {
  checkDecimals(decimals);

  const sign = atoms < 0n ? "-" : "";
  const abs = atoms < 0n ? -atoms : atoms;

  // Pad with zeros so at least one digit sits before the ".": 5 atoms, 2 decimals -> "005".
  const digits = abs.toString().padStart(decimals + 1, "0");
  const cut = digits.length - decimals;
  const whole = digits.slice(0, cut);
  const fraction = digits.slice(cut).replace(/0+$/, ""); // "50" -> "5", "00" -> ""

  return sign + whole + (fraction === "" ? "" : "." + fraction);
}

/**
 * Qty string -> lots. "0.0005" BTC with lotAtoms 10000 -> 5n.
 * Parse with `baseDecimals`, then the atoms must be a multiple of `lotAtoms`,
 * else invalid_precision ("off grid"). Zero is allowed here; min qty is checked later.
 */
export function toLots(qty: string, grid: MarketGrid): bigint {
  return toSteps(qty, grid.baseDecimals, grid.lotAtoms, "qty");
}

/**
 * Price string -> ticks. "64250.25" USD with tickAtoms 10000 -> 6425025n.
 * Parse with `quoteDecimals`, then the atoms must be a multiple of `tickAtoms`,
 * else invalid_precision.
 */
export function toTicks(price: string, grid: MarketGrid): bigint {
  return toSteps(price, grid.quoteDecimals, grid.tickAtoms, "price");
}

/** Shared by toLots / toTicks: decimal string -> whole number of steps of `stepAtoms`. */
function toSteps(str: string, decimals: number, stepAtoms: bigint, what: "qty" | "price"): bigint {
  const atoms = parseDecimal(str, decimals);
  if (atoms % stepAtoms !== 0n) {
    // Off the grid, e.g. half a lot. Tell the user the step size in their units.
    throw new NumberError("invalid_precision", `${what} must be a multiple of ${formatAtoms(stepAtoms, decimals)}`);
  }
  return atoms / stepAtoms;
}

/** Lots -> qty string. Inverse of toLots: formatLots(5n, btc) === "0.0005". */
export function formatLots(lots: bigint, grid: MarketGrid): string {
  return formatAtoms(lots * grid.lotAtoms, grid.baseDecimals);
}

/** Ticks -> price string. Inverse of toTicks: formatTicks(6425025n, btc) === "64250.25". */
export function formatTicks(ticks: bigint, grid: MarketGrid): string {
  return formatAtoms(ticks * grid.tickAtoms, grid.quoteDecimals);
}

/**
 * Quote atoms for `qtyLots` at `priceTicks`: priceTicks * qtyLots * M.
 * BTC-USD (M = 1): 6425025 ticks * 5 lots = 32125125 atoms = 32.125125 USD.
 */
export function notionalAtoms(priceTicks: bigint, qtyLots: bigint, grid: MarketGrid): bigint {
  // Exact: M is a whole number, so no division and no rounding here.
  return priceTicks * qtyLots * grid.multiplier;
}

/**
 * ceil(a / b) for a >= 0, b > 0. bigint `/` rounds toward zero, so add the fix-up yourself.
 * @throws RangeError if a < 0 or b <= 0.
 */
export function ceilDiv(a: bigint, b: bigint): bigint {
  if (a < 0n || b <= 0n) {
    throw new RangeError(`ceilDiv needs a >= 0 and b > 0, got a=${a} b=${b}`);
  }
  const q = a / b; // rounded down
  return a % b === 0n ? q : q + 1n; // anything left over -> round up
}

/**
 * Fee on `amount`: ceil(amount * bps / 10000), capped at `amount` (CLAUDE.md 3.3).
 * Rounds UP, so the exchange never under-charges by a fraction of an atom.
 * @throws RangeError if amount < 0 or bps < 0.
 */
export function bpsOf(amount: bigint, bps: bigint): bigint {
  if (amount < 0n || bps < 0n) {
    throw new RangeError(`bpsOf needs amount >= 0 and bps >= 0, got amount=${amount} bps=${bps}`);
  }
  // Multiply first, divide last: dividing first would throw away the fraction.
  const fee = ceilDiv(amount * bps, BPS_PER_WHOLE);
  return fee < amount ? fee : amount; // a fee can never take more than the whole amount
}

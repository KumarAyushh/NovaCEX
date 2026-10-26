// Tests for exact money math (P1.1). Written before the code: all red until numbers.ts is done.
import { describe, expect, test } from "bun:test";
import {
  MAX_ATOMS,
  MAX_DECIMALS,
  NumberError,
  bpsOf,
  ceilDiv,
  formatAtoms,
  formatLots,
  formatTicks,
  notionalAtoms,
  parseDecimal,
  toLots,
  toTicks,
  type MarketGrid,
  type NumberErrorCode,
} from "../src/numbers";
import { mulberry32, randBigint, randInt } from "./helpers/prng";

// BTC-USD from CLAUDE.md 3.1: tick 0.01 USD, lot 0.0001 BTC, M = 1.
const btc: MarketGrid = {
  baseDecimals: 8,
  quoteDecimals: 6,
  lotAtoms: 10_000n,
  tickAtoms: 10_000n,
  multiplier: 1n,
};

// A grid where M != 1: lot 0.01 ETH, tick 0.01 USD -> M = 1e6 * 1e4 / 1e8 = 100.
const eth: MarketGrid = {
  baseDecimals: 8,
  quoteDecimals: 6,
  lotAtoms: 1_000_000n,
  tickAtoms: 10_000n,
  multiplier: 100n,
};

/** Runs `fn` and returns the NumberError code it threw (fails the test otherwise). */
function codeOf(fn: () => unknown): NumberErrorCode {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(NumberError);
    return (e as NumberError).code;
  }
  throw new Error("expected a NumberError, nothing was thrown");
}

// Property tests: change size/seed with env vars to dig deeper or replay a failure.
const CASES = Number(process.env.NUMBERS_CASES ?? 10_000);
const SEED = Number(process.env.NUMBERS_SEED ?? 1);

describe("parseDecimal: valid input", () => {
  test.each([
    ["0", 8, 0n],
    ["0.0", 8, 0n],
    ["1", 8, 100_000_000n],
    ["0.00000001", 8, 1n], // 1 atom
    ["1.5", 8, 150_000_000n],
    ["1.50", 8, 150_000_000n], // trailing zero inside precision is fine
    ["64250.25", 6, 64_250_250_000n],
    ["0.5", 1, 5n],
    ["5", 0, 5n],
    ["10", 0, 10n],
  ] as const)("%p with %p decimals -> %p", (str, decimals, atoms) => {
    expect(parseDecimal(str, decimals)).toBe(atoms);
  });

  test("MAX_ATOMS itself is accepted", () => {
    expect(parseDecimal("9".repeat(38), 0)).toBe(MAX_ATOMS);
    expect(parseDecimal(formatAtoms(MAX_ATOMS, 8), 8)).toBe(MAX_ATOMS);
  });
});

describe("parseDecimal: invalid_number", () => {
  test.each([
    "", // empty
    " 1", // spaces
    "1 ",
    "+1", // leading plus
    "-1", // sign
    "-0",
    "1e-8", // exponent notation
    "1E8",
    ".5", // needs a digit before "."
    "5.", // needs a digit after "."
    "01.5", // leading zero (policy: one canonical form)
    "00",
    "1.2.3",
    "abc",
    "0x10",
    "1_000",
    "1,5",
    "Infinity",
    "NaN",
    "١", // Arabic-Indic digit: only ASCII 0-9 count
  ])("%p", (str) => {
    expect(codeOf(() => parseDecimal(str, 8))).toBe("invalid_number");
  });

  test("above MAX_ATOMS", () => {
    expect(codeOf(() => parseDecimal("1" + "0".repeat(38), 0))).toBe("invalid_number");
    expect(codeOf(() => parseDecimal("1" + "0".repeat(30), 8))).toBe("invalid_number");
  });

  test("grammar is checked before precision", () => {
    expect(codeOf(() => parseDecimal("01.123456789", 8))).toBe("invalid_number");
  });
});

describe("parseDecimal: invalid_precision", () => {
  test.each([
    ["0.000000001", 8], // 9 decimals for an 8-decimal asset
    ["1.000000000", 8], // strict: extra zeros count too
    ["5.0", 0],
    ["0.1234567", 6],
  ] as const)("%p with %p decimals", (str, decimals) => {
    expect(codeOf(() => parseDecimal(str, decimals))).toBe("invalid_precision");
  });
});

describe("decimals argument", () => {
  test.each([-1, 1.5, MAX_DECIMALS + 1, Number.NaN])("%p -> RangeError", (d) => {
    expect(() => parseDecimal("1", d)).toThrow(RangeError);
    expect(() => formatAtoms(1n, d)).toThrow(RangeError);
  });

  test("0 and MAX_DECIMALS are allowed", () => {
    expect(parseDecimal("1", 0)).toBe(1n);
    expect(formatAtoms(1n, MAX_DECIMALS)).toBe("0." + "0".repeat(37) + "1");
  });
});

describe("formatAtoms", () => {
  test.each([
    [0n, 8, "0"],
    [1n, 8, "0.00000001"],
    [100_000_000n, 8, "1"], // no dangling "."
    [150_000_000n, 8, "1.5"], // trailing zeros removed
    [64_250_250_000n, 6, "64250.25"],
    [123n, 2, "1.23"],
    [10n, 1, "1"],
    [5n, 0, "5"],
    [-5n, 2, "-0.05"], // negatives (ledger deltas)
    [-150n, 2, "-1.5"],
  ] as const)("%p with %p decimals -> %p", (atoms, decimals, str) => {
    expect(formatAtoms(atoms, decimals)).toBe(str);
  });
});

describe("toLots / toTicks (section 3.1 examples)", () => {
  test("qty on the lot grid", () => {
    expect(toLots("0.0005", btc)).toBe(5n);
    expect(toLots("0.0001", btc)).toBe(1n); // min qty
    expect(toLots("1", btc)).toBe(10_000n);
    expect(toLots("0", btc)).toBe(0n); // min qty is checked elsewhere
    expect(toLots("0.05", eth)).toBe(5n);
  });

  test("price on the tick grid", () => {
    expect(toTicks("64250.25", btc)).toBe(6_425_025n);
    expect(toTicks("0.01", btc)).toBe(1n);
    expect(toTicks("3000", eth)).toBe(300_000n);
  });

  test("off grid -> invalid_precision", () => {
    expect(codeOf(() => toLots("0.00005", btc))).toBe("invalid_precision"); // half a lot
    expect(codeOf(() => toTicks("64250.255", btc))).toBe("invalid_precision"); // half a tick
    expect(codeOf(() => toTicks("0.001", btc))).toBe("invalid_precision");
  });

  test("too many decimals -> invalid_precision", () => {
    expect(codeOf(() => toLots("0.000000001", btc))).toBe("invalid_precision");
    expect(codeOf(() => toTicks("1.0000001", btc))).toBe("invalid_precision");
  });

  test("bad syntax -> invalid_number", () => {
    expect(codeOf(() => toLots("-1", btc))).toBe("invalid_number");
    expect(codeOf(() => toTicks("1e3", btc))).toBe("invalid_number");
  });

  test("formatLots / formatTicks", () => {
    expect(formatLots(5n, btc)).toBe("0.0005");
    expect(formatLots(10_000n, btc)).toBe("1");
    expect(formatTicks(6_425_025n, btc)).toBe("64250.25");
    expect(formatTicks(300_000n, eth)).toBe("3000");
  });

  test("max lots: the biggest qty that still fits in MAX_ATOMS", () => {
    const maxLots = MAX_ATOMS / btc.lotAtoms;
    expect(toLots(formatLots(maxLots, btc), btc)).toBe(maxLots);
    expect(codeOf(() => toLots(formatLots(maxLots + 1n, btc), btc))).toBe("invalid_number");
  });
});

describe("notionalAtoms", () => {
  test("BTC-USD (M = 1): 0.0005 BTC @ 64250.25 = 32.125125 USD", () => {
    const n = notionalAtoms(toTicks("64250.25", btc), toLots("0.0005", btc), btc);
    expect(n).toBe(32_125_125n);
    expect(formatAtoms(n, btc.quoteDecimals)).toBe("32.125125");
  });

  test("M != 1: 0.05 ETH @ 3000 = 150 USD", () => {
    expect(notionalAtoms(300_000n, 5n, eth)).toBe(150_000_000n);
  });

  test("zero qty or price -> 0", () => {
    expect(notionalAtoms(0n, 5n, btc)).toBe(0n);
    expect(notionalAtoms(5n, 0n, btc)).toBe(0n);
  });
});

describe("ceilDiv", () => {
  test.each([
    [7n, 2n, 4n],
    [6n, 2n, 3n],
    [1n, 3n, 1n],
    [0n, 5n, 0n],
    [1n, 1n, 1n],
  ] as const)("ceil(%p / %p) = %p", (a, b, q) => {
    expect(ceilDiv(a, b)).toBe(q);
  });

  test("bad input -> RangeError", () => {
    expect(() => ceilDiv(1n, 0n)).toThrow(RangeError);
    expect(() => ceilDiv(1n, -2n)).toThrow(RangeError);
    expect(() => ceilDiv(-1n, 2n)).toThrow(RangeError);
  });
});

describe("bpsOf (fee rounding)", () => {
  test.each([
    [1_000_000n, 10n, 1_000n], // exact
    [10_000n, 5n, 5n], // exact
    [10_001n, 5n, 6n], // 5.0005 -> 6 (round up)
    [999n, 5n, 1n], // 0.4995 -> 1
    [1n, 10n, 1n], // 1 atom still pays 1 atom
    [0n, 10n, 0n],
    [100n, 0n, 0n], // zero fee
    [7n, 20_000n, 7n], // 200% capped at amount
    [7n, 10_000n, 7n], // 100% = amount
  ] as const)("fee(%p, %p bps) = %p", (amount, bps, fee) => {
    expect(bpsOf(amount, bps)).toBe(fee);
  });

  test("bad input -> RangeError", () => {
    expect(() => bpsOf(-1n, 10n)).toThrow(RangeError);
    expect(() => bpsOf(1n, -1n)).toThrow(RangeError);
  });
});

describe(`properties (${CASES} cases, seed ${SEED})`, () => {
  // Shortest form: no leading zeros, no trailing fraction zeros, no dangling ".".
  const CANONICAL = /^-?(0|[1-9]\d*)(\.\d*[1-9])?$/;

  test("format -> parse round-trips any atoms and decimals", () => {
    const rnd = mulberry32(SEED);
    for (let i = 0; i < CASES; i++) {
      const decimals = randInt(rnd, 0, 18);
      const atoms = randBigint(rnd, 38); // 0 .. MAX_ATOMS
      const str = formatAtoms(atoms, decimals);
      expect(CANONICAL.test(str)).toBe(true);
      expect(parseDecimal(str, decimals)).toBe(atoms);
    }
  });

  test("negative atoms format with a single leading '-'", () => {
    const rnd = mulberry32(SEED + 1);
    for (let i = 0; i < CASES; i++) {
      const decimals = randInt(rnd, 0, 18);
      const atoms = randBigint(rnd, 30) + 1n;
      expect(formatAtoms(-atoms, decimals)).toBe("-" + formatAtoms(atoms, decimals));
    }
  });

  test("lots and ticks round-trip on both grids", () => {
    const rnd = mulberry32(SEED + 2);
    for (let i = 0; i < CASES; i++) {
      const grid = rnd() < 0.5 ? btc : eth;
      const lots = randBigint(rnd, 20);
      const ticks = randBigint(rnd, 20);
      expect(toLots(formatLots(lots, grid), grid)).toBe(lots);
      expect(toTicks(formatTicks(ticks, grid), grid)).toBe(ticks);
    }
  });

  test("ceilDiv is the smallest q with q * b >= a", () => {
    const rnd = mulberry32(SEED + 3);
    for (let i = 0; i < CASES; i++) {
      const a = randBigint(rnd, 30);
      const b = randBigint(rnd, 10) + 1n;
      const q = ceilDiv(a, b);
      expect(q * b >= a).toBe(true);
      expect(q === 0n || (q - 1n) * b < a).toBe(true);
    }
  });

  test("bpsOf rounds up and never exceeds the amount", () => {
    const rnd = mulberry32(SEED + 4);
    for (let i = 0; i < CASES; i++) {
      const amount = randBigint(rnd, 30);
      const bps = BigInt(randInt(rnd, 0, 20_000));
      const fee = bpsOf(amount, bps);
      const exact = amount * bps; // fee * 10000 should just cover this
      expect(fee <= amount).toBe(true);
      if (fee < amount) {
        expect(fee * 10_000n >= exact).toBe(true);
        expect(fee === 0n || (fee - 1n) * 10_000n < exact).toBe(true);
      }
    }
  });
});

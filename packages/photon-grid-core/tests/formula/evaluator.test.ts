import { describe, it, expect } from 'vitest';
import {
  Tokenizer,
  Parser,
  sharedEvaluator,
  FunctionRegistry,
  registerBuiltinFunctions,
  DEFAULT_FORMULA_CONFIG,
  FormulaError,
  FormulaErrorCode,
  isFormulaError,
  makeCellId,
} from '../../src/formula';
import type { EvalContext } from '../../src/formula';
import type { CellRef, RangeRef } from '../../src/formula';
import type { FormulaValue } from '../../src/formula';

const tk = new Tokenizer();
const parser = new Parser();
const registry = new FunctionRegistry(false);
registerBuiltinFunctions(registry);

interface EvalOptions {
  /** Row-major grid of raw cell values; `A1` = grid[0][0]. */
  grid?: FormulaValue[][];
  /** Named ranges mapping NAME → A1 address / range. */
  names?: Record<string, CellRef | RangeRef>;
  /** Fixed clock (epoch ms) for TODAY/NOW. */
  now?: number;
  /** Fixed random value for RAND/RANDBETWEEN. */
  random?: number;
}

/** Evaluates a formula body against a mock grid-backed {@link EvalContext}. */
function evaluate(src: string, opts: EvalOptions = {}): FormulaValue {
  const grid = opts.grid ?? [];
  const cellAt = (r: number, c: number): FormulaValue => {
    if (r < 0 || r >= grid.length) return FormulaError.ref();
    const row = grid[r];
    if (c < 0 || c >= row.length) return null;
    return row[c] ?? null;
  };

  const ctx: EvalContext = {
    config: DEFAULT_FORMULA_CONFIG,
    functions: registry,
    resolveCell: (ref: CellRef) => cellAt(ref.rowIndex, ref.colIndex),
    resolveRange: (ref: RangeRef) => {
      const rowStart = ref.wholeRow ? ref.start.rowIndex : ref.start.rowIndex;
      const r0 = ref.wholeColumn ? 0 : rowStart;
      const r1 = ref.wholeColumn ? grid.length - 1 : ref.end.rowIndex;
      const c0 = ref.wholeRow ? 0 : ref.start.colIndex;
      const c1 = ref.wholeRow ? (grid[0]?.length ?? 1) - 1 : ref.end.colIndex;
      const out: FormulaValue[][] = [];
      for (let r = r0; r <= r1; r++) {
        const row: FormulaValue[] = [];
        for (let c = c0; c <= c1; c++) row.push(cellAt(r, c));
        out.push(row);
      }
      return out;
    },
    resolveName: (name: string) => opts.names?.[name.toUpperCase()] ?? null,
    now: () => opts.now ?? 0,
    random: () => opts.random ?? 0,
  };

  const { tokens } = tk.tokenize(src, DEFAULT_FORMULA_CONFIG);
  const { ast, error } = parser.parse(tokens, DEFAULT_FORMULA_CONFIG);
  expect(error, `parse error for "${src}"`).toBeNull();
  return sharedEvaluator.evaluate(ast!, ctx);
}

/** Convenience: asserts a formula evaluates to `expected`. */
function expectEval(src: string, expected: FormulaValue, opts?: EvalOptions): void {
  expect(evaluate(src, opts)).toBe(expected);
}

const GRID: FormulaValue[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

describe('Evaluator — arithmetic & operators', () => {
  it('evaluates arithmetic with precedence', () => {
    expectEval('1+2*3', 7);
    expectEval('(1+2)*3', 9);
    expectEval('2^3^2', 512); // right-assoc
    expectEval('-2^2', 4); // Excel unary-vs-power quirk
    expectEval('10/4', 2.5);
    expectEval('10-3-2', 5);
  });

  it('applies postfix percent', () => {
    expectEval('50%', 0.5);
    expectEval('200%*3', 6);
  });

  it('returns #DIV/0! for division by zero', () => {
    const r = evaluate('1/0');
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.DIV0);
  });

  it('concatenates with &, coercing types', () => {
    expectEval('"a"&"b"', 'ab');
    expectEval('"x"&1', 'x1');
    expectEval('TRUE&"!"', 'TRUE!');
  });

  it('evaluates comparisons', () => {
    expectEval('1<2', true);
    expectEval('2<=2', true);
    expectEval('3<>3', false);
    expectEval('"a"="A"', true); // case-insensitive
    expectEval('2>"1"', false); // number < text across types
  });

  it('treats blank cells as 0 in arithmetic', () => {
    expectEval('A1+1', 1, { grid: [[null]] });
  });

  it('propagates errors through operators', () => {
    const r = evaluate('1/0+5');
    expect(isFormulaError(r)).toBe(true);
  });
});

describe('Evaluator — references & ranges', () => {
  it('resolves single-cell references', () => {
    expectEval('A1', 1, { grid: GRID });
    expectEval('C3', 9, { grid: GRID });
    expectEval('B2+C1', 8, { grid: GRID });
  });

  it('returns #REF! for out-of-bounds rows', () => {
    const r = evaluate('A99', { grid: GRID });
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.REF);
  });

  it('resolves named ranges', () => {
    expectEval('Tax', 5, { grid: GRID, names: { TAX: { colIndex: 1, rowIndex: 1, colAbsolute: false, rowAbsolute: false } } });
  });

  it('yields #NAME? for unknown names', () => {
    const r = evaluate('Unknown', { grid: GRID });
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.NAME);
  });
});

describe('Functions — math', () => {
  it('SUM adds numbers and flattens ranges', () => {
    expectEval('SUM(1,2,3)', 6);
    expectEval('SUM(A1:C1)', 6, { grid: GRID });
    expectEval('SUM(A1:C3)', 45, { grid: GRID });
    expectEval('SUM(1,"2",TRUE)', 4); // literal coercion
  });

  it('SUM ignores text/blanks inside a range', () => {
    expectEval('SUM(A1:B1)', 1, { grid: [[1, 'text']] });
  });

  it('AVERAGE / MIN / MAX / COUNT / COUNTA', () => {
    expectEval('AVERAGE(A1:C3)', 5, { grid: GRID });
    expectEval('MIN(A1:C3)', 1, { grid: GRID });
    expectEval('MAX(A1:C3)', 9, { grid: GRID });
    expectEval('COUNT(A1:C1)', 3, { grid: GRID });
    expectEval('COUNTA(A1:B1)', 2, { grid: [[1, 'x']] });
  });

  it('AVERAGE of no numbers is #DIV/0!', () => {
    const r = evaluate('AVERAGE(A1:A1)', { grid: [['text']] });
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.DIV0);
  });

  it('ABS / SQRT / POWER', () => {
    expectEval('ABS(-7)', 7);
    expectEval('SQRT(16)', 4);
    expectEval('POWER(2,10)', 1024);
    const r = evaluate('SQRT(-1)');
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.NUM);
  });

  it('ROUND / ROUNDUP / ROUNDDOWN', () => {
    expectEval('ROUND(2.5,0)', 3);
    expectEval('ROUND(2.4449,2)', 2.44);
    expectEval('ROUNDUP(2.001,0)', 3);
    expectEval('ROUNDDOWN(2.999,0)', 2);
    expectEval('ROUND(-2.5,0)', -3); // away from zero
  });

  it('RAND / RANDBETWEEN use the injected RNG', () => {
    expectEval('RAND()', 0.5, { random: 0.5 });
    // lo + floor(rand * (hi - lo + 1)) = 1 + floor(0.5 * 10) = 6
    expectEval('RANDBETWEEN(1,10)', 6, { random: 0.5 });
  });
});

describe('Functions — logical', () => {
  it('IF selects a branch and ignores the untaken one', () => {
    expectEval('IF(1>0,"yes","no")', 'yes');
    expectEval('IF(1<0,"yes","no")', 'no');
    expectEval('IF(FALSE,1)', false); // omitted false-branch
  });

  it('IFS returns the first matching value', () => {
    expectEval('IFS(FALSE,1,TRUE,2)', 2);
    const r = evaluate('IFS(FALSE,1,FALSE,2)');
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.NA);
  });

  it('AND / OR / NOT / XOR', () => {
    expectEval('AND(TRUE,TRUE,1)', true);
    expectEval('AND(TRUE,FALSE)', false);
    expectEval('OR(FALSE,FALSE,1)', true);
    expectEval('NOT(FALSE)', true);
    expectEval('XOR(TRUE,TRUE,TRUE)', true);
    expectEval('XOR(TRUE,TRUE)', false);
  });

  it('IFERROR / IFNA substitute fallbacks', () => {
    expectEval('IFERROR(1/0,"safe")', 'safe');
    expectEval('IFERROR(42,"safe")', 42);
    expectEval('IFNA(NA(),"missing")', 'missing');
  });
});

describe('Functions — text', () => {
  it('LEFT / RIGHT / MID / LEN', () => {
    expectEval('LEFT("hello",3)', 'hel');
    expectEval('RIGHT("hello",2)', 'lo');
    expectEval('MID("hello",2,3)', 'ell');
    expectEval('LEN("hello")', 5);
  });

  it('UPPER / LOWER / TRIM', () => {
    expectEval('UPPER("aBc")', 'ABC');
    expectEval('LOWER("aBc")', 'abc');
    expectEval('TRIM("  a   b  ")', 'a b');
  });

  it('CONCAT / CONCATENATE / TEXTJOIN', () => {
    expectEval('CONCAT("a","b","c")', 'abc');
    expectEval('CONCATENATE("x",1,TRUE)', 'x1TRUE');
    expectEval('TEXTJOIN("-",TRUE,"a","","b")', 'a-b');
    expectEval('TEXTJOIN("-",FALSE,"a","","b")', 'a--b');
  });

  it('FIND / SEARCH / REPLACE / SUBSTITUTE', () => {
    expectEval('FIND("l","hello")', 3);
    expectEval('SEARCH("L","hello")', 3); // case-insensitive
    expectEval('REPLACE("abcdef",2,3,"XY")', 'aXYef');
    expectEval('SUBSTITUTE("a-b-c","-","+")', 'a+b+c');
    expectEval('SUBSTITUTE("a-b-c","-","+",2)', 'a-b+c');
  });
});

describe('Functions — info', () => {
  it('type predicates do not short-circuit on errors', () => {
    expectEval('ISERROR(1/0)', true);
    expectEval('ISNUMBER(5)', true);
    expectEval('ISTEXT("x")', true);
    expectEval('ISBLANK(A1)', true, { grid: [[null]] });
    expectEval('ISBLANK(A1)', false, { grid: [[0]] });
    expectEval('ISLOGICAL(TRUE)', true);
  });
});

describe('Functions — date/time', () => {
  it('TODAY / NOW read the injected clock', () => {
    // 2021-01-01T00:00:00Z → Excel serial 44197
    const ms = Date.UTC(2021, 0, 1);
    expectEval('TODAY()', 44197, { now: ms });
    expectEval('YEAR(TODAY())', 2021, { now: ms });
    expectEval('MONTH(TODAY())', 1, { now: ms });
    expectEval('DAY(TODAY())', 1, { now: ms });
  });

  it('YEAR/MONTH/DAY parse date strings', () => {
    expectEval('YEAR("2019-07-04")', 2019);
    expectEval('MONTH("2019-07-04")', 7);
    expectEval('DAY("2019-07-04")', 4);
  });
});

describe('Functions — lookup', () => {
  const TABLE: FormulaValue[][] = [
    ['apple', 10],
    ['banana', 20],
    ['cherry', 30],
  ];

  it('VLOOKUP exact and approximate', () => {
    expectEval('VLOOKUP("banana",A1:B3,2,FALSE)', 20, { grid: TABLE });
    const r = evaluate('VLOOKUP("kiwi",A1:B3,2,FALSE)', { grid: TABLE });
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.NA);
  });

  it('INDEX / MATCH', () => {
    expectEval('INDEX(A1:B3,2,2)', 20, { grid: TABLE });
    expectEval('MATCH("cherry",A1:A3,0)', 3, { grid: TABLE });
    expectEval('INDEX(A1:B3,MATCH("apple",A1:A3,0),2)', 10, { grid: TABLE });
  });

  it('CHOOSE selects by index', () => {
    expectEval('CHOOSE(2,"a","b","c")', 'b');
    const r = evaluate('CHOOSE(9,"a","b")');
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.VALUE);
  });
});

describe('Evaluator — arity checks', () => {
  it('reports too few / too many arguments as #VALUE!', () => {
    const r = evaluate('ABS()');
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.VALUE);
    const r2 = evaluate('ABS(1,2)');
    expect(isFormulaError(r2) && (r2 as FormulaError).code).toBe(FormulaErrorCode.VALUE);
  });

  it('reports unknown functions as #NAME?', () => {
    const r = evaluate('BOGUS(1)');
    expect(isFormulaError(r) && (r as FormulaError).code).toBe(FormulaErrorCode.NAME);
  });
});

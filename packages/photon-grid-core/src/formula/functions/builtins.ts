/**
 * Assembles every built-in {@link FormulaFunction} into a single list and
 * registers them into a {@link FunctionRegistry}.
 *
 * This is the one place that knows the full built-in catalog; the engine calls
 * {@link registerBuiltinFunctions} at construction. Custom functions register
 * through the same registry afterwards (last-wins), so a developer can override
 * any built-in without touching this module.
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from './formula-function';
import type { FunctionRegistry } from './function-registry';

import {
  SumFunction,
  AverageFunction,
  MinFunction,
  MaxFunction,
  CountFunction,
  CountAFunction,
  AbsFunction,
  SqrtFunction,
  RoundFunction,
  RoundUpFunction,
  RoundDownFunction,
  PowerFunction,
  RandFunction,
  RandBetweenFunction,
} from './math-functions';

import {
  IfFunction,
  IfsFunction,
  NotFunction,
  AndFunction,
  OrFunction,
  XorFunction,
  IfErrorFunction,
  IfNaFunction,
} from './logical-functions';

import {
  LenFunction,
  LeftFunction,
  RightFunction,
  MidFunction,
  TrimFunction,
  LowerFunction,
  UpperFunction,
  ConcatFunction,
  ConcatenateFunction,
  TextJoinFunction,
  FindFunction,
  SearchFunction,
  ReplaceFunction,
  SubstituteFunction,
} from './text-functions';

import {
  IsBlankFunction,
  IsNumberFunction,
  IsTextFunction,
  IsLogicalFunction,
  IsErrorFunction,
  IsErrFunction,
  IsNaFunction,
  NaFunction,
} from './info-functions';

import { TodayFunction, NowFunction, YearFunction, MonthFunction, DayFunction } from './datetime-functions';

import {
  VLookupFunction,
  HLookupFunction,
  IndexFunction,
  MatchFunction,
  ChooseFunction,
} from './builtins-lookup';

/**
 * Constructs one instance of every built-in function.
 *
 * Instances are stateless, so a single shared set is reused across all grids
 * (the registry holds references, not copies).
 *
 * @returns A fresh array of all built-in function implementations.
 */
export function createBuiltinFunctions(): FormulaFunction[] {
  return [
    // Math & statistics
    new SumFunction(),
    new AverageFunction(),
    new MinFunction(),
    new MaxFunction(),
    new CountFunction(),
    new CountAFunction(),
    new AbsFunction(),
    new SqrtFunction(),
    new RoundFunction(),
    new RoundUpFunction(),
    new RoundDownFunction(),
    new PowerFunction(),
    new RandFunction(),
    new RandBetweenFunction(),
    // Logical
    new IfFunction(),
    new IfsFunction(),
    new NotFunction(),
    new AndFunction(),
    new OrFunction(),
    new XorFunction(),
    new IfErrorFunction(),
    new IfNaFunction(),
    // Text
    new LenFunction(),
    new LeftFunction(),
    new RightFunction(),
    new MidFunction(),
    new TrimFunction(),
    new LowerFunction(),
    new UpperFunction(),
    new ConcatFunction(),
    new ConcatenateFunction(),
    new TextJoinFunction(),
    new FindFunction(),
    new SearchFunction(),
    new ReplaceFunction(),
    new SubstituteFunction(),
    // Information
    new IsBlankFunction(),
    new IsNumberFunction(),
    new IsTextFunction(),
    new IsLogicalFunction(),
    new IsErrorFunction(),
    new IsErrFunction(),
    new IsNaFunction(),
    new NaFunction(),
    // Date & time
    new TodayFunction(),
    new NowFunction(),
    new YearFunction(),
    new MonthFunction(),
    new DayFunction(),
    // Lookup & reference
    new VLookupFunction(),
    new HLookupFunction(),
    new IndexFunction(),
    new MatchFunction(),
    new ChooseFunction(),
  ];
}

/**
 * Registers all built-in functions into `registry`.
 *
 * @param registry - The registry to populate.
 */
export function registerBuiltinFunctions(registry: FunctionRegistry): void {
  registry.registerAll(createBuiltinFunctions());
}

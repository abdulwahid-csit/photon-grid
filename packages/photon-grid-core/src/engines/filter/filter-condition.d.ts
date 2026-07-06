import type { FilterCondition } from '../../types/filter.types';
export declare function evaluateStringCondition(condition: FilterCondition, cellValue: unknown): boolean;
export declare function evaluateNumberCondition(condition: FilterCondition, cellValue: unknown): boolean;
export declare function evaluateDateCondition(condition: FilterCondition, cellValue: unknown): boolean;
export declare function evaluateSetCondition(operator: 'in' | 'notIn', selectedIds: (string | number)[], cellValue: unknown): boolean;
export declare function evaluateBooleanCondition(condition: FilterCondition, cellValue: unknown): boolean;
//# sourceMappingURL=filter-condition.d.ts.map
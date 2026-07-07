import type { FilterCondition, FilterOperator } from '../../types/filter.types';

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim();
}

function toNumber(value: unknown): number {
  return Number(value);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

export function evaluateStringCondition(condition: FilterCondition, cellValue: unknown): boolean {
  const cell = normalizeString(cellValue);
  const cond = normalizeString(condition.value);

  switch (condition.operator as FilterOperator) {
    case 'contains':
      return cell.includes(cond);
    case 'notContains':
      return !cell.includes(cond);
    case 'equals':
      return cell === cond;
    case 'notEquals':
      return cell !== cond;
    case 'startsWith':
      return cell.startsWith(cond);
    case 'endsWith':
      return cell.endsWith(cond);
    case 'blank':
      return isBlank(cellValue);
    case 'notBlank':
      return !isBlank(cellValue);
    default:
      return true;
  }
}

export function evaluateNumberCondition(condition: FilterCondition, cellValue: unknown): boolean {
  const cell = toNumber(cellValue);
  const cond = toNumber(condition.value);

  if (isNaN(cell)) {
    return condition.operator === 'blank';
  }

  switch (condition.operator as FilterOperator) {
    case 'equals':
      return cell === cond;
    case 'notEquals':
      return cell !== cond;
    case 'lessThan':
      return cell < cond;
    case 'lessThanOrEqual':
      return cell <= cond;
    case 'greaterThan':
      return cell > cond;
    case 'greaterThanOrEqual':
      return cell >= cond;
    case 'inRange': {
      const to = toNumber(condition.valueTo);
      return cell >= cond && cell <= to;
    }
    case 'blank':
      return isBlank(cellValue);
    case 'notBlank':
      return !isBlank(cellValue);
    default:
      return true;
  }
}

export function evaluateDateCondition(condition: FilterCondition, cellValue: unknown): boolean {
  const cellDate = toDate(cellValue);
  const condDate = toDate(condition.value);

  if (!cellDate) return condition.operator === 'blank';
  if (!condDate && condition.operator !== 'blank' && condition.operator !== 'notBlank')
    return true;

  switch (condition.operator as FilterOperator) {
    case 'equals':
      return cellDate.toDateString() === condDate!.toDateString();
    case 'notEquals':
      return cellDate.toDateString() !== condDate!.toDateString();
    case 'before':
    case 'lessThan':
      return cellDate < condDate!;
    case 'after':
    case 'greaterThan':
      return cellDate > condDate!;
    case 'inRange': {
      const toDate2 = toDate(condition.valueTo);
      return !!toDate2 && cellDate >= condDate! && cellDate <= toDate2;
    }
    case 'blank':
      return isBlank(cellValue);
    case 'notBlank':
      return !isBlank(cellValue);
    default:
      return true;
  }
}

export function evaluateSetCondition(
  operator: 'in' | 'notIn',
  selectedIds: (string | number)[],
  cellValue: unknown,
): boolean {
  const idSet = new Set(selectedIds.map(String));
  const cellStr = String(cellValue);

  if (Array.isArray(cellValue)) {
    const hasMatch = cellValue.some((v) => idSet.has(String(v)));
    return operator === 'in' ? hasMatch : !hasMatch;
  }

  return operator === 'in' ? idSet.has(cellStr) : !idSet.has(cellStr);
}

export function evaluateBooleanCondition(condition: FilterCondition, cellValue: unknown): boolean {
  switch (condition.operator as FilterOperator) {
    case 'equals':
      return !!cellValue === !!condition.value;
    case 'notEquals':
      return !!cellValue !== !!condition.value;
    case 'blank':
      return isBlank(cellValue);
    case 'notBlank':
      return !isBlank(cellValue);
    default:
      return true;
  }
}

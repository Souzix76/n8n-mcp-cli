export interface AssertionResult {
  path: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  message: string;
}

export interface AssertionSuiteResult {
  passed: boolean;
  results: AssertionResult[];
}

export type AssertionOperator =
  | 'equals'
  | 'notEquals'
  | 'exists'
  | 'notEmpty'
  | 'contains'
  | 'minLength'
  | 'regex'
  | 'isObject';

export interface AssertionRule {
  path: string;
  operator: AssertionOperator;
  expected?: unknown;
  message?: string;
}

export function getValueAtPath(input: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isNaN(index) && index >= 0 && index < current.length) {
        return current[index];
      }
      return undefined;
    }

    if (typeof current === 'object') {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, input);
}

export function evaluateAssertion(value: unknown, rule: AssertionRule): AssertionResult {
  const path = rule.path;

  switch (rule.operator) {
    case 'exists':
      return {
        path,
        passed: value !== undefined && value !== null,
        message: value !== undefined && value !== null ? 'Value exists.' : 'Value is missing.',
        actual: value,
      };

    case 'notEmpty':
      return {
        path,
        passed: value !== undefined && value !== null && String(value).length > 0,
        message: value !== undefined && value !== null && String(value).length > 0 ? 'Value is not empty.' : 'Value is empty.',
        actual: value,
      };

    case 'equals':
      return {
        path,
        passed: value === rule.expected,
        message: value === rule.expected ? 'Value matches expected result.' : 'Value does not match expected result.',
        actual: value,
        expected: rule.expected,
      };

    case 'notEquals':
      return {
        path,
        passed: value !== rule.expected,
        message: value !== rule.expected ? 'Value differs from forbidden value.' : 'Value unexpectedly matches forbidden value.',
        actual: value,
        expected: rule.expected,
      };

    case 'contains':
      return {
        path,
        passed: typeof value === 'string' && String(value).includes(String(rule.expected ?? '')),
        message: typeof value === 'string' && String(value).includes(String(rule.expected ?? '')) ? 'Value contains expected substring.' : 'Value does not contain expected substring.',
        actual: value,
        expected: rule.expected,
      };

    case 'minLength': {
      const length = typeof value === 'string' || Array.isArray(value) ? value.length : 0;
      const expected = Number(rule.expected ?? 0);
      return {
        path,
        passed: length >= expected,
        message: length >= expected ? 'Length meets minimum expectation.' : 'Length is below minimum expectation.',
        actual: value,
        expected,
      };
    }

    case 'regex': {
      const pattern = rule.expected instanceof RegExp ? rule.expected : new RegExp(String(rule.expected ?? ''));
      return {
        path,
        passed: typeof value === 'string' && pattern.test(value),
        message: typeof value === 'string' && pattern.test(value) ? 'Regex matches value.' : 'Regex does not match value.',
        actual: value,
        expected: pattern,
      };
    }

    case 'isObject':
      return {
        path,
        passed: typeof value === 'object' && value !== null && !Array.isArray(value),
        message: typeof value === 'object' && value !== null && !Array.isArray(value) ? 'Value is an object.' : 'Value is not an object.',
        actual: value,
      };

    default:
      return {
        path,
        passed: false,
        message: 'Unsupported assertion operator.',
        actual: value,
      };
  }
}

export function evaluateSuite<T>(input: T, rules: AssertionRule[]): AssertionSuiteResult {
  const results = rules.map((rule) => {
    const value = getValueAtPath(input as Record<string, unknown>, rule.path);
    return evaluateAssertion(value, rule);
  });

  return {
    passed: results.every((result) => result.passed),
    results,
  };
}

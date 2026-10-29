import { describe, it, expect, beforeEach } from 'vitest';
import { FailureClassifier } from '../failure-classifier.js';

describe('FailureClassifier - extractError direct test', () => {
  let classifier: FailureClassifier;

  beforeEach(() => {
    classifier = new FailureClassifier();
  });

  it('extractError transforms ETIMEDOUT to timeout message', async () => {
    const nodeData = {
      error: { message: 'timeout', code: 'ETIMEDOUT' }
    };
    // @ts-ignore - accessing private method for test
    const errorInfo = classifier['extractError'](nodeData);
    console.log('extractError result:', errorInfo);
    expect(errorInfo.message).toContain('timeout');
  });

  it('extractError transforms EXPRESSION_ERROR to validation message', async () => {
    const nodeData = {
      error: { message: 'Invalid expression: undefined variable', code: 'EXPRESSION_ERROR' }
    };
    // @ts-ignore - accessing private method for test
    const errorInfo = classifier['extractError'](nodeData);
    console.log('extractError result:', errorInfo);
    expect(errorInfo.message).toContain('validation');
  });
});
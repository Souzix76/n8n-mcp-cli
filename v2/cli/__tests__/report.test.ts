import { describe, it, expect } from 'vitest';
import { parseCiFlag, removeCiFlag } from '../commands.js';
import { generateV2Report, generateV2ReportCi } from '../report.js';

describe('CLI Report with CI flag', () => {
  describe('parseCiFlag', () => {
    it('returns true when --ci is present', () => {
      expect(parseCiFlag(['report', '--ci'])).toBe(true);
      expect(parseCiFlag(['--ci', 'report'])).toBe(true);
      expect(parseCiFlag(['--ci'])).toBe(true);
    });

    it('returns false when --ci is not present', () => {
      expect(parseCiFlag(['report'])).toBe(false);
      expect(parseCiFlag([])).toBe(false);
      expect(parseCiFlag(['--ci', '--other'])).toBe(true);
    });
  });

  describe('removeCiFlag', () => {
    it('removes --ci flag', () => {
      expect(removeCiFlag(['report', '--ci'])).toEqual(['report']);
      expect(removeCiFlag(['--ci', 'report'])).toEqual(['report']);
      expect(removeCiFlag(['--ci'])).toEqual([]);
    });

    it('leaves args unchanged when no --ci flag', () => {
      expect(removeCiFlag(['report', 'arg1'])).toEqual(['report', 'arg1']);
      expect(removeCiFlag([])).toEqual([]);
    });
  });

  describe('generateV2Report', () => {
    it('generates report', async () => {
      const report = await generateV2Report();
      expect(report).toBe('v2 report generation scaffold is ready.');
    });
  });

  describe('generateV2ReportCi', () => {
    it('generates CI report', async () => {
      const report = await generateV2ReportCi();
      expect(report).toBe('v2 CI report generation scaffold is ready.');
    });
  });
});
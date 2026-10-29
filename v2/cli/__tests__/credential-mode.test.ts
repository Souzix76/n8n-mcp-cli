import { describe, it, expect } from 'vitest';
import { parseCredentialMode, removeCredentialModeArgs, CredentialMode } from '../commands.js';

describe('CLI Credential Mode', () => {
  describe('parseCredentialMode', () => {
    it('defaults to read-only when no flag provided', () => {
      expect(parseCredentialMode([])).toBe('read-only');
      expect(parseCredentialMode(['validate'])).toBe('read-only');
      expect(parseCredentialMode(['--other-flag'])).toBe('read-only');
    });

    it('parses --credential-mode=external', () => {
      expect(parseCredentialMode(['--credential-mode=external'])).toBe('external');
      expect(parseCredentialMode(['mcp', '--credential-mode=external'])).toBe('external');
    });

    it('parses --credential-mode=read-only', () => {
      expect(parseCredentialMode(['--credential-mode=read-only'])).toBe('read-only');
      expect(parseCredentialMode(['mcp', '--credential-mode=read-only'])).toBe('read-only');
    });

    it('parses --credential-mode external (space separated)', () => {
      expect(parseCredentialMode(['--credential-mode', 'external'])).toBe('external');
      expect(parseCredentialMode(['mcp', '--credential-mode', 'external'])).toBe('external');
    });

    it('parses --credential-mode read-only (space separated)', () => {
      expect(parseCredentialMode(['--credential-mode', 'read-only'])).toBe('read-only');
      expect(parseCredentialMode(['mcp', '--credential-mode', 'read-only'])).toBe('read-only');
    });

    it('throws on invalid mode value', () => {
      expect(() => parseCredentialMode(['--credential-mode=invalid'])).toThrow('Invalid credential mode');
      expect(() => parseCredentialMode(['--credential-mode', 'invalid'])).toThrow('Invalid credential mode');
      expect(() => parseCredentialMode(['--credential-mode=read'])).toThrow('Invalid credential mode');
      expect(() => parseCredentialMode(['--credential-mode', 'write'])).toThrow('Invalid credential mode');
    });

    it('throws when --credential-mode has no value', () => {
      expect(() => parseCredentialMode(['--credential-mode'])).toThrow('Invalid credential mode');
      expect(() => parseCredentialMode(['--credential-mode='])).toThrow('Invalid credential mode');
    });

    it('handles multiple flags correctly', () => {
      expect(parseCredentialMode(['--verbose', '--credential-mode=external', '--debug'])).toBe('external');
      expect(parseCredentialMode(['--credential-mode=read-only', '--other'])).toBe('read-only');
    });
  });

  describe('removeCredentialModeArgs', () => {
    it('removes --credential-mode=value', () => {
      const args = ['mcp', '--credential-mode=external', '--verbose'];
      const filtered = removeCredentialModeArgs(args);
      expect(filtered).toEqual(['mcp', '--verbose']);
    });

    it('removes --credential-mode value (space separated)', () => {
      const args = ['mcp', '--credential-mode', 'external', '--verbose'];
      const filtered = removeCredentialModeArgs(args);
      expect(filtered).toEqual(['mcp', '--verbose']);
    });

    it('removes --credential-mode=read-only', () => {
      const args = ['mcp', '--credential-mode=read-only'];
      const filtered = removeCredentialModeArgs(args);
      expect(filtered).toEqual(['mcp']);
    });

    it('leaves args unchanged when no credential mode flag', () => {
      const args = ['mcp', '--verbose', '--debug'];
      const filtered = removeCredentialModeArgs(args);
      expect(filtered).toEqual(['mcp', '--verbose', '--debug']);
    });

    it('handles multiple credential mode flags (removes first)', () => {
      const args = ['--credential-mode=external', '--credential-mode=read-only'];
      const filtered = removeCredentialModeArgs(args);
      expect(filtered).toEqual(['--credential-mode=read-only']);
    });
  });

  describe('CredentialMode type', () => {
    it('accepts only read-only and external', () => {
      const modes: CredentialMode[] = ['read-only', 'external'];
      expect(modes).toHaveLength(2);
    });
  });
});
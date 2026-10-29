import { describe, it, expect } from 'vitest';
import {
  CredentialBoundaryError,
  createCredentialBoundaryError,
  CredentialMode,
  AppError,
  createConfigError,
  createNetworkError,
  createValidationError,
} from '../errors.js';

describe('errors', () => {
  describe('CredentialBoundaryError', () => {
    it('includes mode and operation in read-only mode', () => {
      const error = new CredentialBoundaryError(
        'Cannot write in read-only mode',
        'read-only',
        'create_workflow'
      );
      
      expect(error.message).toContain('read-only');
      expect(error.mode).toBe('read-only');
      expect(error.operation).toBe('create_workflow');
      expect(error.name).toBe('CredentialBoundaryError');
      expect(error.remediation).toContain('--credential-mode=external');
      expect(error.remediation).toContain('N8N_API_KEY');
    });

    it('includes mode and operation in external mode', () => {
      const error = new CredentialBoundaryError(
        'External credentials required',
        'external',
        'validate_workflow'
      );
      
      expect(error.mode).toBe('external');
      expect(error.operation).toBe('validate_workflow');
      expect(error.remediation).toContain('N8N_API_KEY');
      expect(error.remediation).toContain('N8N_BASE_URL');
    });

    it('is instance of Error', () => {
      const error = new CredentialBoundaryError('test', 'read-only', 'test_op');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CredentialBoundaryError);
    });
  });

  describe('createCredentialBoundaryError', () => {
    it('creates error with default message for read-only', () => {
      const error = createCredentialBoundaryError('read-only', 'create_workflow');
      
      expect(error).toBeInstanceOf(CredentialBoundaryError);
      expect(error.mode).toBe('read-only');
      expect(error.operation).toBe('create_workflow');
      expect(error.message).toContain('create_workflow');
      expect(error.message).toContain('read-only');
    });

    it('creates error with default message for external', () => {
      const error = createCredentialBoundaryError('external', 'diagnose_workflow');
      
      expect(error.mode).toBe('external');
      expect(error.operation).toBe('diagnose_workflow');
      expect(error.message).toContain('diagnose_workflow');
      expect(error.message).toContain('external');
    });

    it('allows custom message override', () => {
      const error = createCredentialBoundaryError(
        'read-only',
        'custom_op',
        'Custom message here'
      );
      
      expect(error.message).toBe('Custom message here');
      expect(error.mode).toBe('read-only');
      expect(error.operation).toBe('custom_op');
    });
  });

  describe('AppError and factory functions', () => {
    it('createConfigError creates AppError with config kind', () => {
      const error = createConfigError('Invalid config', { field: 'apiKey' });
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.kind).toBe('config');
      expect(error.message).toBe('Invalid config');
      expect(error.details).toEqual({ field: 'apiKey' });
    });

    it('createNetworkError creates AppError with network kind', () => {
      const error = createNetworkError('Connection failed', { host: 'localhost' });
      
      expect(error.kind).toBe('network');
      expect(error.details).toEqual({ host: 'localhost' });
    });

    it('createValidationError creates AppError with validation kind', () => {
      const error = createValidationError('Validation failed', { errors: [] });
      
      expect(error.kind).toBe('validation');
      expect(error.details).toEqual({ errors: [] });
    });
  });

  describe('CredentialMode type', () => {
    it('accepts read-only and external', () => {
      const modes: CredentialMode[] = ['read-only', 'external'];
      expect(modes).toHaveLength(2);
    });
  });
});
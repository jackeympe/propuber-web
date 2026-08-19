import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildRequest,
  formatRequest,
  computeBuildChargerSplit,
  DEFAULT_THRESHOLD,
  TELEGRAM_OWNER_ID,
} from './approval.js';

// Mock the KV storage for testing
const mockPending = new Map();
const mockDecided = new Map();
const mockLedger = '';

vi.mock('../_lib/approval.js', async () => {
  const actual = await vi.importActual('../_lib/approval.js');
  return {
    ...actual,
    _pending: mockPending,
    _decided: mockDecided,
    // We cannot easily mock the KV methods without rewriting the module.
    // For now, we test the pure functions and leave KV integration for e2e.
  };
});

// We'll test the pure functions directly from the module.

describe('Approval Gate (pure functions)', () => {
  beforeEach(() => {
    mockPending.clear();
    mockDecided.clear();
  });

  describe('buildRequest', () => {
    it('should create a request with correct fields', () => {
      const req = buildRequest({
        agent: 'test-agent',
        amount: 1000,
        description: 'Test description',
        risk: 'low',
        alternative: 'none',
        deadline: '2026-08-20',
      });

      expect(req).toHaveProperty('request_id');
      expect(req.agent).toBe('test-agent');
      expect(req.amount).toBe(1000);
      expect(req.currency).toBe('ZAR');
      expect(req.description).toBe('Test description');
      expect(req.risk).toBe('low');
      expect(req.alternative).toBe('none');
      expect(req.deadline).toBe('2026-08-20');
      expect(req.status).toBe('PENDING');
      expect(req.type).toBe('financial');
      expect(req.owner_telegram_id).toBe(TELEGRAM_OWNER_ID);
      expect(req.created_at).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
    });
  });

  describe('formatRequest', () => {
    it('should format a request as a multi-line string', () => {
      const req = {
        request_id: '123',
        agent: 'test',
        type: 'financial',
        amount: 5000,
        currency: 'ZAR',
        description: 'Test',
        risk: '',
        alternative: '',
        deadline: '',
      };
      const formatted = formatRequest(req);
      expect(formatted).toContain('REQUEST_ID: 123');
      expect(formatted).toContain('AGENT: test');
      expect(formatted).toContain('AMOUNT: 5000 ZAR');
      expect(formatted).toContain('DESCRIPTION: Test');
    });
  });

  describe('computeBuildChargerSplit', () => {
    it('should split 10000 into 5000, 3000, 855, reserve 1145', () => {
      const split = computeBuildChargerSplit(10000);
      expect(split.charger_engine).toBe(5000);
      expect(split.operations).toBe(3000);
      expect(split.dividend).toBe(855);
      expect(split.reserve).toBeCloseTo(1145, 2); // due to rounding
    });

    it('should handle zero amount', () => {
      const split = computeBuildChargerSplit(0);
      expect(split.charger_engine).toBe(0);
      expect(split.operations).toBe(0);
      expect(split.dividend).toBe(0);
      expect(split.reserve).toBe(0);
    });

    it('should handle fractional amounts', () => {
      const split = computeBuildChargerSplit(100.50);
      expect(split.charger_engine).toBeCloseTo(50.25, 2);
      expect(split.operations).toBeCloseTo(30.15, 2);
      expect(split.dividend).toBeCloseTo(8.59, 2);
      expect(split.reserve).toBeCloseTo(11.51, 2);
    });
  });
});
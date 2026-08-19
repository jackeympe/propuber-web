import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isConfigured, pushSettlement } from './xero.js';

// We'll mock the fetch function globally
const mockFetch = vi.fn();

describe('Xero Sync (Cloudflare-native)', () => {
  const env = {
    XERO_CLIENT_ID: 'test-client-id',
    XERO_CLIENT_SECRET: 'test-client-secret',
    XERO_TENANT_ID: 'test-tenant-id',
    XERO_SALES_ACCOUNT: '200',
    XERO_BANK_ACCOUNT: '100',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock the global fetch
    global.fetch = mockFetch;
  });

  describe('isConfigured', () => {
    it('should return true when all required vars are present', () => {
      expect(isConfigured(env)).toBe(true);
    });

    it('should return false when missing client id', () => {
      expect(isConfigured({ ...env, XERO_CLIENT_ID: '' })).toBe(false);
    });

    it('should return false when missing client secret', () => {
      expect(isConfigured({ ...env, XERO_CLIENT_SECRET: '' })).toBe(false);
    });

    it('should return false when missing tenant id', () => {
      expect(isConfigured({ ...env, XERO_TENANT_ID: '' })).toBe(false);
    });
  });

  describe('pushSettlement', () => {
    it('should return not configured when env missing', async () => {
      const result = await pushSettlement({}, { amount: 100 });
      expect(result).toEqual({ synced: false, reason: 'xero_not_configured' });
    });

    it('should handle token fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
      const result = await pushSettlement(env, { amount: 100 });
      expect(result).toEqual({ synced: false, reason: 'xero_auth_failed' });
    });

    it('should handle successful token fetch and invoice creation', async () => {
      // Mock token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fake-token' }),
      });
      // Mock invoice creation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoices: [
            {
              InvoiceID: 'invoice-id-123',
              InvoiceNumber: 'INV-001',
            },
          ],
        }),
      });
      // Mock payment creation response (if bank account is set)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Payments: [{}] }),
      });

      const result = await pushSettlement(env, {
        client: 'Test Client',
        description: 'Test Service',
        amount: 150.75,
        reference: 'REF123',
        email: 'test@example.com',
      });

      expect(result).toEqual({
        synced: true,
        invoice_id: 'invoice-id-123',
        invoice_number: 'INV-001',
        paid: true,
      });

      // Expect fetch to have been called 3 times: token, invoice, payment
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle invoice creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fake-token' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => ('Bad Request'),
      });

      const result = await pushSettlement(env, { amount: 100 });
      expect(result).toEqual({
        synced: false,
        reason: 'invoice_create_failed',
      });
    });

    it('should not attempt payment when bank account not configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fake-token' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoices: [{ InvoiceID: 'inv-1', InvoiceNumber: 'INV-001' }],
        }),
      });

      const result = await pushSettlement({
        ...env,
        XERO_BANK_ACCOUNT: '', // empty bank account
      }, { amount: 100 });

      expect(result).toEqual({
        synced: true,
        invoice_id: 'inv-1',
        invoice_number: 'INV-001',
        paid: false, // because no bank account
      });
      // Only two calls: token and invoice
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
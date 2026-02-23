import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { ImportStatus } from '../database/models/enums.js';

// =============================================================================
// Module Mocks — inline to avoid hoisting issues
// =============================================================================

vi.mock('../database/models/UserImport.js', () => ({
  UserImport: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../database/models/User.js', () => ({
  User: { findByPk: vi.fn() },
}));

vi.mock('../queue/import.queue.js', () => ({
  addImportJob: vi.fn(),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { uploadCsvImport, getImportStatus, getCsvTemplate } from './import.controller.js';
import { UserImport } from '../database/models/UserImport.js';
import { addImportJob } from '../queue/import.queue.js';

// =============================================================================
// Helpers
// =============================================================================

function createMockContext(options: {
  body?: unknown;
  params?: Record<string, string>;
  state?: Record<string, unknown>;
  query?: Record<string, string>;
} = {}): Context {
  return {
    params: options.params || {},
    query: options.query || {},
    request: { body: options.body || {} },
    state: options.state || {
      user: { userId: 'user-123', tenantId: null },
    },
    status: 200,
    body: null,
    set: vi.fn(),
  } as unknown as Context;
}

// =============================================================================
// Tests
// =============================================================================

describe('Import Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadCsvImport', () => {
    const validRows = [
      { email: 'john@example.com', firstName: 'John', lastName: 'Doe', role: 'learner' },
      { email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith', role: 'instructor' },
    ];

    it('should create import record and enqueue job', async () => {
      const mockRecord = { id: 'import-1', status: ImportStatus.PENDING };
      vi.mocked(UserImport.create).mockResolvedValue(mockRecord as never);
      vi.mocked(addImportJob).mockResolvedValue(undefined);

      const ctx = createMockContext({
        body: { rows: validRows, fileName: 'users.csv' },
        state: { user: { userId: 'admin-1', tenantId: null } },
      });

      await uploadCsvImport(ctx);

      expect(ctx.status).toBe(201);
      expect(UserImport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: null,
          importedById: 'admin-1',
          status: ImportStatus.PENDING,
          totalRows: 2,
          fileName: 'users.csv',
        })
      );
      expect(addImportJob).toHaveBeenCalledWith({
        importId: 'import-1',
        tenantId: null,
        importedById: 'admin-1',
        rows: validRows,
      });
      const body = ctx.body as { success: boolean; data: { importId: string } };
      expect(body.success).toBe(true);
      expect(body.data.importId).toBe('import-1');
    });

    it('should scope to tenant when tenantId is present', async () => {
      const mockRecord = { id: 'import-2', status: ImportStatus.PENDING };
      vi.mocked(UserImport.create).mockResolvedValue(mockRecord as never);
      vi.mocked(addImportJob).mockResolvedValue(undefined);

      const ctx = createMockContext({
        body: { rows: [validRows[0]] },
        state: { user: { userId: 'admin-2', tenantId: 'tenant-1' } },
      });

      await uploadCsvImport(ctx);

      expect(UserImport.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' })
      );
      expect(addImportJob).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' })
      );
    });

    it('should default fileName to import.csv', async () => {
      const mockRecord = { id: 'import-3', status: ImportStatus.PENDING };
      vi.mocked(UserImport.create).mockResolvedValue(mockRecord as never);
      vi.mocked(addImportJob).mockResolvedValue(undefined);

      const ctx = createMockContext({
        body: { rows: [validRows[0]] },
      });

      await uploadCsvImport(ctx);

      expect(UserImport.create).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'import.csv' })
      );
    });

    it('should throw validation error for empty rows', async () => {
      const ctx = createMockContext({ body: { rows: [] } });

      await expect(uploadCsvImport(ctx)).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it('should throw validation error for invalid row data', async () => {
      const ctx = createMockContext({
        body: { rows: [{ email: 'not-an-email' }] },
      });

      await expect(uploadCsvImport(ctx)).rejects.toMatchObject({
        statusCode: 422,
      });
    });
  });

  describe('getImportStatus', () => {
    it('should return import record with details', async () => {
      const mockRecord = {
        id: 'import-1',
        status: ImportStatus.COMPLETED,
        totalRows: 5,
        successCount: 4,
        errorCount: 1,
        errors: [{ row: 3, email: 'bad@test.com', message: 'Duplicate' }],
        fileName: 'users.csv',
        importedBy: { id: 'admin-1', firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(UserImport.findOne).mockResolvedValue(mockRecord as never);

      const ctx = createMockContext({
        params: { importId: 'import-1' },
        state: { user: { userId: 'admin-1', tenantId: null } },
      });

      await getImportStatus(ctx);

      const body = ctx.body as { success: boolean; data: { id: string; status: string; successCount: number } };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('import-1');
      expect(body.data.status).toBe(ImportStatus.COMPLETED);
      expect(body.data.successCount).toBe(4);
    });

    it('should scope query to tenant for tenant admins', async () => {
      vi.mocked(UserImport.findOne).mockResolvedValue({
        id: 'import-1',
        status: ImportStatus.PENDING,
        totalRows: 1,
        successCount: 0,
        errorCount: 0,
        errors: [],
        fileName: 'test.csv',
        importedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const ctx = createMockContext({
        params: { importId: 'import-1' },
        state: { user: { userId: 'admin-2', tenantId: 'tenant-1' } },
      });

      await getImportStatus(ctx);

      expect(UserImport.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'import-1', tenantId: 'tenant-1' },
        })
      );
    });

    it('should throw 404 when import not found', async () => {
      vi.mocked(UserImport.findOne).mockResolvedValue(null);

      const ctx = createMockContext({
        params: { importId: 'nonexistent' },
        state: { user: { userId: 'admin-1', tenantId: null } },
      });

      await expect(getImportStatus(ctx)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('getCsvTemplate', () => {
    it('should return CSV content with correct headers', async () => {
      const ctx = createMockContext();

      await getCsvTemplate(ctx);

      expect(ctx.body).toContain('email,firstName,lastName,role');
      expect(ctx.body).toContain('john@example.com');
    });

    it('should set correct content-type and disposition headers', async () => {
      const ctx = createMockContext();

      await getCsvTemplate(ctx);

      expect(ctx.set).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="user-import-template.csv"'
      );
    });
  });
});

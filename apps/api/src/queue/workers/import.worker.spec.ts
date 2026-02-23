import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import { UserRole, UserStatus, ImportStatus, InvitationStatus, SupportedLocale } from '../../database/models/enums.js';
import type { ImportJobData } from '../import.queue.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockUserImport = {
  findByPk: vi.fn(),
};

const mockUser = {
  findOne: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
};

const mockInvitation = {
  findOne: vi.fn(),
  create: vi.fn(),
};

const mockTenant = {
  findByPk: vi.fn(),
};

const mockEmailService = {
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
};

const mockWorkerInstance = {
  on: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

const workerCalls: Array<{ queueName: string; processor: (...args: unknown[]) => unknown; options: object }> = [];

class MockWorker {
  processor: (...args: unknown[]) => unknown;

  constructor(queueName: string, processor: (...args: unknown[]) => unknown, options: object) {
    workerCalls.push({ queueName, processor, options });
    this.processor = processor;
  }

  on = mockWorkerInstance.on;
  close = mockWorkerInstance.close;
}

vi.mock('bullmq', () => ({
  Worker: MockWorker,
}));

vi.mock('../connection.js', () => ({
  queueConnection: { host: 'localhost', port: 6379 },
}));

vi.mock('../import.queue.js', () => ({
  IMPORT_QUEUE_NAME: 'user-imports',
}));

vi.mock('../../database/models/UserImport.js', () => ({
  UserImport: mockUserImport,
}));

vi.mock('../../database/models/User.js', () => ({
  User: mockUser,
}));

vi.mock('../../database/models/Invitation.js', () => ({
  Invitation: mockInvitation,
}));

vi.mock('../../database/models/Tenant.js', () => ({
  Tenant: mockTenant,
}));

vi.mock('../../services/email/index.js', () => ({
  emailService: mockEmailService,
}));

vi.mock('../../auth/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}));

vi.mock('../../config/index.js', () => ({
  config: {
    frontendUrl: 'https://app.test.com',
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('ImportWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    workerCalls.length = 0;
  });

  describe('startImportWorker', () => {
    it('should create a worker with correct configuration', async () => {
      const { startImportWorker } = await import('./import.worker.js');

      startImportWorker();

      expect(workerCalls.length).toBe(1);
      expect(workerCalls[0].queueName).toBe('user-imports');
      expect(workerCalls[0].options).toMatchObject({
        connection: { host: 'localhost', port: 6379 },
        concurrency: 2,
      });
    });

    it('should register event handlers', async () => {
      const { startImportWorker } = await import('./import.worker.js');

      startImportWorker();

      expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should return existing worker if already started', async () => {
      const { startImportWorker } = await import('./import.worker.js');

      const w1 = startImportWorker();
      const w2 = startImportWorker();

      expect(w1).toBe(w2);
      expect(workerCalls.length).toBe(1);
    });
  });

  describe('stopImportWorker', () => {
    it('should close the worker', async () => {
      const { startImportWorker, stopImportWorker } = await import('./import.worker.js');

      startImportWorker();
      await stopImportWorker();

      expect(mockWorkerInstance.close).toHaveBeenCalled();
    });
  });

  describe('processImportJob', () => {
    let processJob: (job: Job<ImportJobData>) => Promise<void>;

    const mockImportRecord = {
      id: 'import-1',
      update: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(async () => {
      vi.resetModules();
      workerCalls.length = 0;

      await import('./import.worker.js').then((module) => {
        module.startImportWorker();
      });

      processJob = workerCalls[0].processor as (job: Job<ImportJobData>) => Promise<void>;

      // Default mocks
      mockUserImport.findByPk.mockResolvedValue(mockImportRecord);
      mockUser.findByPk.mockResolvedValue({ firstName: 'Admin', lastName: 'User' });
      mockUser.findOne.mockResolvedValue(null); // No existing user
      mockInvitation.findOne.mockResolvedValue(null); // No existing invitation
      mockInvitation.create.mockResolvedValue({ id: 'inv-1' });
      mockUser.create.mockResolvedValue({ id: 'new-user-1' });
      mockTenant.findByPk.mockResolvedValue({ name: 'Test Org' });
    });

    it('should skip if import record not found', async () => {
      mockUserImport.findByPk.mockResolvedValue(null);

      const job = {
        id: 'job-1',
        data: {
          importId: 'nonexistent',
          tenantId: 'tenant-1',
          importedById: 'admin-1',
          rows: [{ email: 'a@b.com', firstName: 'A', lastName: 'B' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      expect(mockImportRecord.update).not.toHaveBeenCalled();
    });

    it('should set status to PROCESSING at start', async () => {
      const job = {
        id: 'job-2',
        data: {
          importId: 'import-1',
          tenantId: 'tenant-1',
          importedById: 'admin-1',
          rows: [{ email: 'john@test.com', firstName: 'John', lastName: 'Doe' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      expect(mockImportRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ImportStatus.PROCESSING })
      );
    });

    it('should create invitation for B2B (tenantId present)', async () => {
      const job = {
        id: 'job-3',
        data: {
          importId: 'import-1',
          tenantId: 'tenant-1',
          importedById: 'admin-1',
          rows: [{ email: 'John@Test.com', firstName: 'John', lastName: 'Doe', role: 'learner' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      expect(mockInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          email: 'john@test.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.LEARNER,
          status: InvitationStatus.PENDING,
        })
      );
    });

    it('should send invitation email for B2B', async () => {
      const job = {
        id: 'job-4',
        data: {
          importId: 'import-1',
          tenantId: 'tenant-1',
          importedById: 'admin-1',
          rows: [{ email: 'jane@test.com', firstName: 'Jane', lastName: 'Smith' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@test.com',
          firstName: 'Jane',
          tenantName: 'Test Org',
          inviterName: 'Admin User',
          role: UserRole.LEARNER,
          locale: SupportedLocale.EN,
        })
      );
    });

    it('should create user directly for B2C (no tenantId)', async () => {
      const job = {
        id: 'job-5',
        data: {
          importId: 'import-1',
          tenantId: null,
          importedById: 'admin-1',
          rows: [{ email: 'bob@test.com', firstName: 'Bob', lastName: 'Jones' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      expect(mockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'bob@test.com',
          firstName: 'Bob',
          lastName: 'Jones',
          role: UserRole.LEARNER,
          status: UserStatus.PENDING,
        })
      );
      expect(mockInvitation.create).not.toHaveBeenCalled();
    });

    it('should record error for invalid email', async () => {
      const job = {
        id: 'job-6',
        data: {
          importId: 'import-1',
          tenantId: 'tenant-1',
          importedById: 'admin-1',
          rows: [{ email: 'not-an-email', firstName: 'Bad', lastName: 'Email' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      // Should complete with error tracked
      const lastUpdate = mockImportRecord.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate.status).toBe(ImportStatus.COMPLETED);
      expect(lastUpdate.errorCount).toBe(1);
      expect(lastUpdate.errors[0]).toMatchObject({
        row: 2,
        email: 'not-an-email',
        message: 'Invalid email address',
      });
    });

    it('should record error for missing name', async () => {
      const job = {
        id: 'job-7',
        data: {
          importId: 'import-1',
          tenantId: null,
          importedById: 'admin-1',
          rows: [{ email: 'test@test.com', firstName: '', lastName: 'Doe' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      const lastUpdate = mockImportRecord.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate.errorCount).toBe(1);
      expect(lastUpdate.errors[0].message).toContain('required');
    });

    it('should record error for duplicate user', async () => {
      mockUser.findOne.mockResolvedValue({ id: 'existing-user' });

      const job = {
        id: 'job-8',
        data: {
          importId: 'import-1',
          tenantId: null,
          importedById: 'admin-1',
          rows: [{ email: 'exists@test.com', firstName: 'Existing', lastName: 'User' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      const lastUpdate = mockImportRecord.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate.errorCount).toBe(1);
      expect(lastUpdate.errors[0].message).toContain('already exists');
    });

    it('should record error for existing pending invitation', async () => {
      mockInvitation.findOne.mockResolvedValue({ id: 'existing-inv' });

      const job = {
        id: 'job-9',
        data: {
          importId: 'import-1',
          tenantId: 'tenant-1',
          importedById: 'admin-1',
          rows: [{ email: 'pending@test.com', firstName: 'Pending', lastName: 'User' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      const lastUpdate = mockImportRecord.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate.errorCount).toBe(1);
      expect(lastUpdate.errors[0].message).toContain('pending invitation');
    });

    it('should record error for invalid role', async () => {
      const job = {
        id: 'job-10',
        data: {
          importId: 'import-1',
          tenantId: null,
          importedById: 'admin-1',
          rows: [{ email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'super_admin' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      const lastUpdate = mockImportRecord.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate.errorCount).toBe(1);
      expect(lastUpdate.errors[0].message).toContain('Invalid role');
    });

    it('should process multiple rows and track counts', async () => {
      mockUser.findOne
        .mockResolvedValueOnce(null) // first row: ok
        .mockResolvedValueOnce({ id: 'dup' }) // second row: duplicate
        .mockResolvedValueOnce(null); // third row: ok

      const job = {
        id: 'job-11',
        data: {
          importId: 'import-1',
          tenantId: null,
          importedById: 'admin-1',
          rows: [
            { email: 'ok1@test.com', firstName: 'Ok', lastName: 'One' },
            { email: 'dup@test.com', firstName: 'Dup', lastName: 'User' },
            { email: 'ok2@test.com', firstName: 'Ok', lastName: 'Two' },
          ],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      const lastUpdate = mockImportRecord.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate.status).toBe(ImportStatus.COMPLETED);
      expect(lastUpdate.successCount).toBe(2);
      expect(lastUpdate.errorCount).toBe(1);
    });

    it('should continue processing after email send failure', async () => {
      mockEmailService.sendInvitationEmail.mockRejectedValueOnce(new Error('SMTP error'));

      const job = {
        id: 'job-12',
        data: {
          importId: 'import-1',
          tenantId: 'tenant-1',
          importedById: 'admin-1',
          rows: [{ email: 'test@test.com', firstName: 'Test', lastName: 'User' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      // Row should still count as success (invitation was created)
      const lastUpdate = mockImportRecord.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate.status).toBe(ImportStatus.COMPLETED);
      expect(lastUpdate.successCount).toBe(1);
    });

    it('should set COMPLETED status when done', async () => {
      const job = {
        id: 'job-13',
        data: {
          importId: 'import-1',
          tenantId: null,
          importedById: 'admin-1',
          rows: [{ email: 'test@test.com', firstName: 'Test', lastName: 'User' }],
        },
      } as Job<ImportJobData>;

      await processJob(job);

      const lastUpdate = mockImportRecord.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate.status).toBe(ImportStatus.COMPLETED);
    });
  });
});

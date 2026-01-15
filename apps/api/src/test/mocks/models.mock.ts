/**
 * Sequelize Model Mocks
 *
 * Factory functions to create mock models for testing without a real database.
 * Each mock provides standard Sequelize methods (findByPk, findOne, create, etc.)
 */

import { vi } from 'vitest';

// =============================================================================
// Types for Mock Data
// =============================================================================

export interface MockTenant {
  id: string;
  name: string;
  slug: string;
  seatsPurchased: number;
  seatsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockInvitation {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  token: string;
  status: string;
  invitedById: string;
  acceptedById: string | null;
  acceptedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  tenant?: MockTenant;
  groups?: MockGroup[];
  update: ReturnType<typeof vi.fn>;
}

export interface MockGroup {
  id: string;
  name: string;
  tenantId: string;
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createMockTenant(overrides: Partial<MockTenant> = {}): MockTenant {
  return {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    seatsPurchased: 10,
    seatsUsed: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'learner',
    status: 'active',
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockInvitation(overrides: Partial<MockInvitation> = {}): MockInvitation {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    id: 'invitation-123',
    tenantId: 'tenant-123',
    email: 'invited@example.com',
    firstName: 'Invited',
    lastName: 'User',
    role: 'learner',
    token: 'abc123token',
    status: 'pending',
    invitedById: 'user-123',
    acceptedById: null,
    acceptedAt: null,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockGroup(overrides: Partial<MockGroup> = {}): MockGroup {
  return {
    id: 'group-123',
    name: 'Test Group',
    tenantId: 'tenant-123',
    ...overrides,
  };
}

// =============================================================================
// Model Mock Factories
// =============================================================================

export interface ModelMock<T> {
  findByPk: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  findAll: ReturnType<typeof vi.fn>;
  findAndCountAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  bulkCreate: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  increment: ReturnType<typeof vi.fn>;
  _mockData: T | null;
  _reset: () => void;
}

export function createModelMock<T>(defaultData: T | null = null): ModelMock<T> {
  const mock: ModelMock<T> = {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    findAndCountAll: vi.fn(),
    create: vi.fn(),
    bulkCreate: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    increment: vi.fn(),
    _mockData: defaultData,
    _reset: function () {
      this.findByPk.mockReset();
      this.findOne.mockReset();
      this.findAll.mockReset();
      this.findAndCountAll.mockReset();
      this.create.mockReset();
      this.bulkCreate.mockReset();
      this.update.mockReset();
      this.destroy.mockReset();
      this.increment.mockReset();
    },
  };

  return mock;
}

// =============================================================================
// Sequelize Mock
// =============================================================================

export interface SequelizeMock {
  transaction: ReturnType<typeof vi.fn>;
}

export function createSequelizeMock(): SequelizeMock {
  return {
    // Transaction mock that executes the callback with a mock transaction object
    transaction: vi.fn(async (callback: (t: object) => Promise<unknown>) => {
      const mockTransaction = { commit: vi.fn(), rollback: vi.fn() };
      return callback(mockTransaction);
    }),
  };
}

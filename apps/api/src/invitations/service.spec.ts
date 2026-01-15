import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole, InvitationStatus } from '../database/models/enums.js';
import {
  createMockTenant,
  createMockUser,
  createMockInvitation,
  createMockGroup,
} from '../test/mocks/index.js';
import { emailServiceMock } from '../test/mocks/email.mock.js';

// =============================================================================
// Module Mocks - must use factory functions, no external variables
// =============================================================================

vi.mock('../database/sequelize.js', () => ({
  sequelize: {
    transaction: vi.fn(async (callback: (t: object) => Promise<unknown>) => {
      const mockTransaction = { commit: vi.fn(), rollback: vi.fn() };
      return callback(mockTransaction);
    }),
  },
}));

vi.mock('../database/models/Tenant.js', () => ({
  Tenant: {
    findByPk: vi.fn(),
    increment: vi.fn(),
  },
}));

vi.mock('../database/models/User.js', () => ({
  User: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../database/models/Invitation.js', () => ({
  Invitation: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAndCountAll: vi.fn(),
    create: vi.fn(),
  },
  InvitationGroup: {
    bulkCreate: vi.fn(),
  },
}));

vi.mock('../database/models/Group.js', () => ({
  Group: {
    findAll: vi.fn(),
  },
  UserGroup: {
    bulkCreate: vi.fn(),
  },
}));

vi.mock('../auth/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  validatePasswordStrength: vi.fn().mockReturnValue({ valid: true, errors: [] }),
}));

// Import after mocks are set up
import {
  createInvitation,
  listInvitations,
  getInvitationByToken,
  acceptInvitation,
  revokeInvitation,
  resendInvitation,
  type InvitationServiceContext,
} from './service.js';
import { Tenant } from '../database/models/Tenant.js';
import { User } from '../database/models/User.js';
import { Invitation } from '../database/models/Invitation.js';
import { Group } from '../database/models/Group.js';
import { validatePasswordStrength } from '../auth/password.js';

// =============================================================================
// Test Suite
// =============================================================================

describe('InvitationService', () => {
  // Test data factories
  const mockTenant = createMockTenant();
  const mockUser = createMockUser();
  const mockInvitation = createMockInvitation();
  const mockGroup = createMockGroup();

  beforeEach(() => {
    vi.clearAllMocks();
    emailServiceMock._reset();
  });

  // ===========================================================================
  // createInvitation
  // ===========================================================================

  describe('createInvitation', () => {
    const ctx: InvitationServiceContext = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      role: UserRole.TENANT_ADMIN,
    };

    const input = {
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      role: 'learner' as const,
    };

    it('should create an invitation successfully', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(Invitation.create).mockResolvedValue(mockInvitation as never);

      const result = await createInvitation(ctx, input);

      expect(Tenant.findByPk).toHaveBeenCalledWith(ctx.tenantId);
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: input.email } });
      expect(Invitation.findOne).toHaveBeenCalled();
      expect(emailServiceMock.sendInvitationEmail).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error if tenant not found', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(null as never);

      await expect(createInvitation(ctx, input)).rejects.toThrow('Tenant not found');
    });

    it('should throw error if no seats available', async () => {
      const fullTenant = createMockTenant({ seatsUsed: 10, seatsPurchased: 10 });
      vi.mocked(Tenant.findByPk).mockResolvedValue(fullTenant as never);

      await expect(createInvitation(ctx, input)).rejects.toThrow('No available seats');
    });

    it('should throw error if user with email already exists', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);
      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);

      await expect(createInvitation(ctx, input)).rejects.toThrow('A user with this email already exists');
    });

    it('should throw error if pending invitation already exists', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Invitation.findOne).mockResolvedValue(mockInvitation as never);

      await expect(createInvitation(ctx, input)).rejects.toThrow('A pending invitation already exists');
    });

    it('should restrict MANAGER to only invite LEARNER role', async () => {
      const managerCtx: InvitationServiceContext = {
        ...ctx,
        role: UserRole.MANAGER,
      };

      const inputWithInstructor = {
        ...input,
        role: 'instructor' as const,
        groupIds: ['group-123'],
      };

      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);

      await expect(createInvitation(managerCtx, inputWithInstructor)).rejects.toThrow(
        'Managers can only invite learners'
      );
    });

    it('should require groupIds when MANAGER creates invitation', async () => {
      const managerCtx: InvitationServiceContext = {
        ...ctx,
        role: UserRole.MANAGER,
      };

      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);

      await expect(createInvitation(managerCtx, input)).rejects.toThrow(
        'Managers must specify at least one group'
      );
    });

    it('should prevent TENANT_ADMIN from inviting SUPER_ADMIN', async () => {
      const inputSuperAdmin = {
        ...input,
        role: 'super_admin' as const,
      };

      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);

      await expect(createInvitation(ctx, inputSuperAdmin)).rejects.toThrow('Cannot invite SuperAdmin');
    });

    it('should validate groups belong to tenant', async () => {
      const managerCtx: InvitationServiceContext = {
        ...ctx,
        role: UserRole.MANAGER,
      };

      const inputWithGroups = {
        ...input,
        groupIds: ['group-123', 'group-456'],
      };

      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);
      vi.mocked(Group.findAll).mockResolvedValue([mockGroup] as never); // Only returns 1, but 2 requested

      await expect(createInvitation(managerCtx, inputWithGroups)).rejects.toThrow(
        'One or more groups not found'
      );
    });
  });

  // ===========================================================================
  // listInvitations
  // ===========================================================================

  describe('listInvitations', () => {
    it('should list invitations with pagination', async () => {
      const invitations = [mockInvitation];
      vi.mocked(Invitation.findAndCountAll).mockResolvedValue({
        rows: invitations,
        count: 1,
      } as never);

      const result = await listInvitations('tenant-123', { page: 1, limit: 10 });

      expect(result.invitations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(Invitation.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-123' },
          limit: 10,
          offset: 0,
        })
      );
    });

    it('should filter by status when provided', async () => {
      vi.mocked(Invitation.findAndCountAll).mockResolvedValue({
        rows: [],
        count: 0,
      } as never);

      await listInvitations('tenant-123', { status: 'pending', page: 1, limit: 10 });

      expect(Invitation.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-123', status: 'pending' },
        })
      );
    });
  });

  // ===========================================================================
  // getInvitationByToken
  // ===========================================================================

  describe('getInvitationByToken', () => {
    it('should return invitation by token', async () => {
      vi.mocked(Invitation.findOne).mockResolvedValue(mockInvitation as never);

      const result = await getInvitationByToken('abc123token');

      expect(result).toEqual(mockInvitation);
      expect(Invitation.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: 'abc123token' },
        })
      );
    });

    it('should throw error if invitation not found', async () => {
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);

      await expect(getInvitationByToken('invalid-token')).rejects.toThrow('Invitation not found');
    });
  });

  // ===========================================================================
  // acceptInvitation
  // ===========================================================================

  describe('acceptInvitation', () => {
    it('should accept invitation and create user', async () => {
      const pendingInvitation = createMockInvitation({
        status: InvitationStatus.PENDING,
        tenant: mockTenant,
        groups: [],
      });

      vi.mocked(Invitation.findOne).mockResolvedValue(pendingInvitation as never);
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(User.create).mockResolvedValue(mockUser as never);

      const result = await acceptInvitation('abc123token', 'SecurePass123!');

      expect(result.user).toBeDefined();
      expect(result.invitation).toBeDefined();
    });

    it('should throw error for weak password', async () => {
      vi.mocked(validatePasswordStrength).mockReturnValue({
        valid: false,
        errors: ['Password too short'],
      });

      await expect(acceptInvitation('abc123token', 'weak')).rejects.toThrow(
        'Password does not meet requirements'
      );
    });

    it('should throw error if invitation not found', async () => {
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);

      await expect(acceptInvitation('invalid-token', 'SecurePass123!')).rejects.toThrow(
        'Invitation not found'
      );
    });

    it('should throw error if invitation already accepted', async () => {
      const acceptedInvitation = createMockInvitation({
        status: InvitationStatus.ACCEPTED,
      });

      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(Invitation.findOne).mockResolvedValue(acceptedInvitation as never);

      await expect(acceptInvitation('abc123token', 'SecurePass123!')).rejects.toThrow(
        'Invitation has already been accepted'
      );
    });

    it('should throw error if invitation expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const expiredInvitation = createMockInvitation({
        status: InvitationStatus.PENDING,
        expiresAt: expiredDate,
        tenant: mockTenant,
      });

      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(Invitation.findOne).mockResolvedValue(expiredInvitation as never);

      await expect(acceptInvitation('abc123token', 'SecurePass123!')).rejects.toThrow(
        'Invitation has expired'
      );
    });

    it('should throw error if no seats available', async () => {
      const fullTenant = createMockTenant({ seatsUsed: 10, seatsPurchased: 10 });
      const pendingInvitation = createMockInvitation({
        status: InvitationStatus.PENDING,
        tenant: fullTenant,
      });

      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(Invitation.findOne).mockResolvedValue(pendingInvitation as never);

      await expect(acceptInvitation('abc123token', 'SecurePass123!')).rejects.toThrow(
        'No available seats'
      );
    });
  });

  // ===========================================================================
  // revokeInvitation
  // ===========================================================================

  describe('revokeInvitation', () => {
    it('should revoke a pending invitation', async () => {
      const pendingInvitation = createMockInvitation({
        status: InvitationStatus.PENDING,
      });

      vi.mocked(Invitation.findOne).mockResolvedValue(pendingInvitation as never);

      const result = await revokeInvitation('tenant-123', 'invitation-123');

      expect(pendingInvitation.update).toHaveBeenCalledWith({ status: InvitationStatus.REVOKED });
      expect(result).toBeDefined();
    });

    it('should throw error if invitation not found', async () => {
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);

      await expect(revokeInvitation('tenant-123', 'invalid-id')).rejects.toThrow('Invitation not found');
    });

    it('should throw error if invitation already accepted', async () => {
      const acceptedInvitation = createMockInvitation({
        status: InvitationStatus.ACCEPTED,
      });

      vi.mocked(Invitation.findOne).mockResolvedValue(acceptedInvitation as never);

      await expect(revokeInvitation('tenant-123', 'invitation-123')).rejects.toThrow(
        'Cannot revoke invitation'
      );
    });
  });

  // ===========================================================================
  // resendInvitation
  // ===========================================================================

  describe('resendInvitation', () => {
    it('should resend a pending invitation', async () => {
      const pendingInvitation = createMockInvitation({
        status: InvitationStatus.PENDING,
        tenant: mockTenant,
      });

      vi.mocked(Invitation.findOne).mockResolvedValue(pendingInvitation as never);
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);

      const result = await resendInvitation('tenant-123', 'invitation-123');

      expect(pendingInvitation.update).toHaveBeenCalled();
      expect(emailServiceMock.sendInvitationEmail).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error if invitation not found', async () => {
      vi.mocked(Invitation.findOne).mockResolvedValue(null as never);

      await expect(resendInvitation('tenant-123', 'invalid-id')).rejects.toThrow('Invitation not found');
    });

    it('should throw error if invitation not pending', async () => {
      const acceptedInvitation = createMockInvitation({
        status: InvitationStatus.ACCEPTED,
      });

      vi.mocked(Invitation.findOne).mockResolvedValue(acceptedInvitation as never);

      await expect(resendInvitation('tenant-123', 'invitation-123')).rejects.toThrow(
        'Cannot resend invitation'
      );
    });
  });
});

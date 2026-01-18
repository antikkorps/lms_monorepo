import {
  Model,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type ForeignKey,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../sequelize.js';
import { UserRole, UserStatus } from './enums.js';
import type { Tenant } from './Tenant.js';

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare passwordHash: string;
  declare firstName: string;
  declare lastName: string;
  declare role: CreationOptional<UserRole>;
  declare status: CreationOptional<UserStatus>;
  declare tenantId: ForeignKey<Tenant['id']> | null;
  declare avatarUrl: CreationOptional<string | null>;
  declare lastLoginAt: CreationOptional<Date | null>;
  // SSO fields
  declare ssoProvider: CreationOptional<string | null>;
  declare ssoProviderId: CreationOptional<string | null>;
  declare ssoMetadata: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  // Associations
  declare tenant?: NonAttribute<Tenant>;

  // Virtual getters
  get fullName(): NonAttribute<string> {
    return `${this.firstName} ${this.lastName}`;
  }

  get isSuperAdmin(): NonAttribute<boolean> {
    return this.role === UserRole.SUPER_ADMIN;
  }

  get isTenantAdmin(): NonAttribute<boolean> {
    return this.role === UserRole.TENANT_ADMIN;
  }

  get isB2B(): NonAttribute<boolean> {
    return this.tenantId !== null;
  }

  get isSSO(): NonAttribute<boolean> {
    return this.ssoProvider !== null;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.LEARNER,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(UserStatus)),
      allowNull: false,
      defaultValue: UserStatus.PENDING,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // SSO fields
    ssoProvider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'SSO provider type: google, microsoft, oidc',
    },
    ssoProviderId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'External user ID from SSO provider',
    },
    ssoMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Raw claims/data from SSO provider',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'users',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['email'] },
      { fields: ['tenant_id'] },
      { fields: ['status'] },
      { fields: ['sso_provider', 'sso_provider_id'], name: 'idx_users_sso' },
    ],
  }
);

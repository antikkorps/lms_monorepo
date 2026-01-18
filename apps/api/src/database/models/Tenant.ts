import {
  Model,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';
import { sequelize } from '../sequelize.js';
import { TenantStatus, SubscriptionStatus, IsolationStrategy } from './enums.js';

export interface TenantSSOConfig {
  provider: 'google' | 'microsoft' | 'oidc';
  clientId: string;
  clientSecret: string;
  issuer?: string;
  tenantId?: string; // For Microsoft Azure AD
}

export interface TenantSettings {
  brandColor?: string;
  customDomain?: string;
  ssoEnabled?: boolean;
  ssoConfig?: TenantSSOConfig;
  features?: string[];
}

export class Tenant extends Model<
  InferAttributes<Tenant>,
  InferCreationAttributes<Tenant>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare slug: string;
  declare status: CreationOptional<TenantStatus>;
  declare isolationStrategy: CreationOptional<IsolationStrategy>;
  declare connectionString: CreationOptional<string | null>;
  declare seatsPurchased: CreationOptional<number>;
  declare seatsUsed: CreationOptional<number>;
  declare subscriptionStatus: CreationOptional<SubscriptionStatus>;
  declare stripeCustomerId: CreationOptional<string | null>;
  declare stripeSubscriptionId: CreationOptional<string | null>;
  declare logoUrl: CreationOptional<string | null>;
  declare domain: CreationOptional<string | null>;
  declare settings: CreationOptional<TenantSettings>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}

Tenant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TenantStatus)),
      allowNull: false,
      defaultValue: TenantStatus.TRIAL,
    },
    isolationStrategy: {
      type: DataTypes.ENUM(...Object.values(IsolationStrategy)),
      allowNull: false,
      defaultValue: IsolationStrategy.SHARED,
    },
    connectionString: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    seatsPurchased: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    seatsUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    subscriptionStatus: {
      type: DataTypes.ENUM(...Object.values(SubscriptionStatus)),
      allowNull: false,
      defaultValue: SubscriptionStatus.TRIALING,
    },
    stripeCustomerId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'tenants',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['slug'] },
      { fields: ['stripe_customer_id'] },
    ],
  }
);

import {
  Model,
  DataTypes,
  Op,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type ForeignKey,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../sequelize.js';
import { PurchaseStatus, LicenseType } from './enums.js';
import type { User } from './User.js';
import type { Course } from './Course.js';
import type { Tenant } from './Tenant.js';

/**
 * TenantCourseLicense - Represents a course license purchased by a tenant
 *
 * Supports two license types:
 * - UNLIMITED: All tenant members have access to the course
 * - SEATS: Limited number of seats, must be assigned to specific members
 *
 * Payment: Via Stripe (card or bank transfer)
 */
export class TenantCourseLicense extends Model<
  InferAttributes<TenantCourseLicense>,
  InferCreationAttributes<TenantCourseLicense>
> {
  declare id: CreationOptional<string>;
  declare tenantId: ForeignKey<Tenant['id']>;
  declare courseId: ForeignKey<Course['id']>;
  declare purchasedById: ForeignKey<User['id']>;

  // License details
  declare licenseType: LicenseType;
  declare seatsTotal: CreationOptional<number | null>; // null for unlimited
  declare seatsUsed: CreationOptional<number>;

  // Payment details
  declare amount: number;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<PurchaseStatus>;
  declare stripePaymentIntentId: CreationOptional<string | null>;
  declare stripeCheckoutSessionId: CreationOptional<string | null>;
  declare stripeInvoiceId: CreationOptional<string | null>; // For bank transfer invoices
  declare purchasedAt: CreationOptional<Date | null>;

  // Refund fields
  declare stripeRefundId: CreationOptional<string | null>;
  declare refundedAt: CreationOptional<Date | null>;
  declare refundReason: CreationOptional<string | null>;
  declare refundAmount: CreationOptional<number | null>;
  declare isPartialRefund: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare tenant?: NonAttribute<Tenant>;
  declare course?: NonAttribute<Course>;
  declare purchasedBy?: NonAttribute<User>;
  declare assignments?: NonAttribute<TenantCourseLicenseAssignment[]>;

  // Helpers
  get isUnlimited(): NonAttribute<boolean> {
    return this.licenseType === LicenseType.UNLIMITED;
  }

  get hasAvailableSeats(): NonAttribute<boolean> {
    if (this.licenseType === LicenseType.UNLIMITED) return true;
    return this.seatsUsed < (this.seatsTotal || 0);
  }

  get availableSeats(): NonAttribute<number | null> {
    if (this.licenseType === LicenseType.UNLIMITED) return null;
    return (this.seatsTotal || 0) - this.seatsUsed;
  }

  get isCompleted(): NonAttribute<boolean> {
    return this.status === PurchaseStatus.COMPLETED;
  }

  get isRefunded(): NonAttribute<boolean> {
    return this.status === PurchaseStatus.REFUNDED;
  }

  get isActive(): NonAttribute<boolean> {
    return this.status === PurchaseStatus.COMPLETED;
  }
}

/**
 * TenantCourseLicenseAssignment - Links a user to a seat-based license
 * Only used for SEATS license type
 */
export class TenantCourseLicenseAssignment extends Model<
  InferAttributes<TenantCourseLicenseAssignment>,
  InferCreationAttributes<TenantCourseLicenseAssignment>
> {
  declare id: CreationOptional<string>;
  declare licenseId: ForeignKey<TenantCourseLicense['id']>;
  declare userId: ForeignKey<User['id']>;
  declare assignedById: ForeignKey<User['id']>;
  declare assignedAt: CreationOptional<Date>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare license?: NonAttribute<TenantCourseLicense>;
  declare user?: NonAttribute<User>;
  declare assignedBy?: NonAttribute<User>;
}

// Initialize TenantCourseLicense
TenantCourseLicense.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
    },
    purchasedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    licenseType: {
      type: DataTypes.ENUM(...Object.values(LicenseType)),
      allowNull: false,
    },
    seatsTotal: {
      type: DataTypes.INTEGER,
      allowNull: true, // null for unlimited
    },
    seatsUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'EUR',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PurchaseStatus)),
      allowNull: false,
      defaultValue: PurchaseStatus.PENDING,
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    stripeCheckoutSessionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    stripeInvoiceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    purchasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    stripeRefundId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refundReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    isPartialRefund: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'tenant_course_licenses',
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['course_id'] },
      { fields: ['tenant_id', 'course_id'] },
      {
        fields: ['stripe_checkout_session_id'],
        unique: true,
        where: { stripe_checkout_session_id: { [Op.ne]: null } },
      },
    ],
  }
);

// Initialize TenantCourseLicenseAssignment
TenantCourseLicenseAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    licenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenant_course_licenses',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    assignedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'tenant_course_license_assignments',
    indexes: [
      { fields: ['license_id'] },
      { fields: ['user_id'] },
      {
        fields: ['license_id', 'user_id'],
        unique: true,
      },
    ],
  }
);

// Setup associations
TenantCourseLicense.hasMany(TenantCourseLicenseAssignment, {
  foreignKey: 'licenseId',
  as: 'assignments',
});

TenantCourseLicenseAssignment.belongsTo(TenantCourseLicense, {
  foreignKey: 'licenseId',
  as: 'license',
});

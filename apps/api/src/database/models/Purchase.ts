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
import { PurchaseStatus } from './enums.js';
import type { User } from './User.js';
import type { Course } from './Course.js';
import type { Tenant } from './Tenant.js';

export class Purchase extends Model<
  InferAttributes<Purchase>,
  InferCreationAttributes<Purchase>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare courseId: ForeignKey<Course['id']>;
  declare tenantId: ForeignKey<Tenant['id']> | null;
  declare amount: number;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<PurchaseStatus>;
  declare stripePaymentIntentId: CreationOptional<string | null>;
  declare stripeCheckoutSessionId: CreationOptional<string | null>;
  declare purchasedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare course?: NonAttribute<Course>;
  declare tenant?: NonAttribute<Tenant>;

  // Helpers
  get isCompleted(): NonAttribute<boolean> {
    return this.status === PurchaseStatus.COMPLETED;
  }

  get isB2B(): NonAttribute<boolean> {
    return this.tenantId !== null;
  }

  get formattedAmount(): NonAttribute<string> {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    }).format(Number(this.amount));
  }
}

Purchase.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
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
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
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
    purchasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'purchases',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['course_id'] },
      { fields: ['tenant_id'] },
      {
        fields: ['stripe_checkout_session_id'],
        unique: true,
        where: { stripe_checkout_session_id: { [Op.ne]: null } },
      },
    ],
  }
);

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
import { UserRole, InvitationStatus } from './enums.js';
import type { Tenant } from './Tenant.js';
import type { User } from './User.js';
import type { Group } from './Group.js';

export class Invitation extends Model<
  InferAttributes<Invitation>,
  InferCreationAttributes<Invitation>
> {
  declare id: CreationOptional<string>;
  declare tenantId: ForeignKey<Tenant['id']>;
  declare email: string;
  declare firstName: string;
  declare lastName: string;
  declare role: CreationOptional<UserRole>;
  declare token: string;
  declare status: CreationOptional<InvitationStatus>;
  declare invitedById: ForeignKey<User['id']>;
  declare acceptedById: ForeignKey<User['id']> | null;
  declare expiresAt: Date;
  declare acceptedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare tenant?: NonAttribute<Tenant>;
  declare invitedBy?: NonAttribute<User>;
  declare acceptedBy?: NonAttribute<User>;
  declare groups?: NonAttribute<Group[]>;

  // Virtual getters
  get isExpired(): NonAttribute<boolean> {
    return this.status === InvitationStatus.PENDING && new Date() > this.expiresAt;
  }

  get fullName(): NonAttribute<string> {
    return `${this.firstName} ${this.lastName}`;
  }
}

Invitation.init(
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
      onDelete: 'CASCADE',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
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
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(InvitationStatus)),
      allowNull: false,
      defaultValue: InvitationStatus.PENDING,
    },
    invitedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    acceptedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'invitations',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['token'], unique: true },
      { fields: ['email'] },
      { fields: ['status'] },
    ],
  }
);

// InvitationGroup junction table
export class InvitationGroup extends Model<
  InferAttributes<InvitationGroup>,
  InferCreationAttributes<InvitationGroup>
> {
  declare invitationId: ForeignKey<Invitation['id']>;
  declare groupId: ForeignKey<Group['id']>;
}

InvitationGroup.init(
  {
    invitationId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'invitations',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'groups',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'invitation_groups',
    timestamps: false,
  }
);

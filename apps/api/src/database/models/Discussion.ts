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
import type { Lesson } from './Lesson.js';
import type { User } from './User.js';
import type { Tenant } from './Tenant.js';
import type { DiscussionReply } from './DiscussionReply.js';

export class Discussion extends Model<
  InferAttributes<Discussion>,
  InferCreationAttributes<Discussion>
> {
  declare id: CreationOptional<string>;
  declare lessonId: ForeignKey<Lesson['id']>;
  declare userId: ForeignKey<User['id']>;
  declare tenantId: ForeignKey<Tenant['id']> | null;
  declare content: string;
  declare replyCount: CreationOptional<number>;
  declare isDeleted: CreationOptional<boolean>;
  declare deletedById: ForeignKey<User['id']> | null;
  declare deletedReason: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare lesson?: NonAttribute<Lesson>;
  declare user?: NonAttribute<User>;
  declare tenant?: NonAttribute<Tenant>;
  declare deletedBy?: NonAttribute<User>;
  declare replies?: NonAttribute<DiscussionReply[]>;
}

Discussion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    lessonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'lessons',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    replyCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deletedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    deletedReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'discussions',
    indexes: [
      { fields: ['lesson_id'] },
      { fields: ['user_id'] },
      { fields: ['tenant_id'] },
      { fields: ['is_deleted'] },
      { fields: ['created_at'] },
    ],
  }
);

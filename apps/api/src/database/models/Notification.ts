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
import { NotificationType } from './enums.js';
import type { User } from './User.js';

export interface NotificationData {
  lessonId?: string;
  courseId?: string;
  courseName?: string;
  lessonName?: string;
  badgeId?: string;
  badgeName?: string;
  discussionId?: string;
  replyId?: string;
  authorName?: string;
  purchaseId?: string;
  amount?: number;
  [key: string]: unknown;
}

export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare type: NotificationType;
  declare title: string;
  declare message: CreationOptional<string | null>;
  declare data: CreationOptional<NotificationData>;
  declare link: CreationOptional<string | null>;
  declare read: CreationOptional<boolean>;
  declare readAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
}

Notification.init(
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
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM(...Object.values(NotificationType)),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    link: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['user_id', 'read'], name: 'idx_notifications_user_read' },
      { fields: ['user_id', 'created_at'], name: 'idx_notifications_user_created' },
    ],
  }
);

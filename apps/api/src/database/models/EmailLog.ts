import {
  Model,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';
import { sequelize } from '../sequelize.js';

export type EmailType =
  | 'verification'
  | 'password_reset'
  | 'invitation'
  | 'notification_lesson_completed'
  | 'notification_course_completed'
  | 'notification_badge_earned'
  | 'digest'
  | 'test';

export type EmailStatus = 'sent' | 'failed' | 'bounced' | 'delivered';

export class EmailLog extends Model<
  InferAttributes<EmailLog>,
  InferCreationAttributes<EmailLog>
> {
  declare id: CreationOptional<string>;
  declare type: EmailType;
  declare recipient: string;
  declare subject: string;
  declare status: EmailStatus;
  declare provider: string;
  declare messageId: CreationOptional<string | null>;
  declare error: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown>>;
  declare sentAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
}

EmailLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    recipient: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('sent', 'failed', 'bounced', 'delivered'),
      allowNull: false,
      defaultValue: 'sent',
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    messageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'email_logs',
    timestamps: true,
    updatedAt: false, // No updates, logs are immutable
    indexes: [
      { fields: ['type'] },
      { fields: ['recipient'] },
      { fields: ['status'] },
      { fields: ['sent_at'] },
      { fields: ['created_at'] },
    ],
  }
);

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
import { DigestFrequency, NotificationType } from './enums.js';
import type { User } from './User.js';

export type NotificationPreferenceFlags = {
  [K in NotificationType]: boolean;
};

const DEFAULT_FLAGS: NotificationPreferenceFlags = {
  [NotificationType.LESSON_COMPLETED]: true,
  [NotificationType.COURSE_COMPLETED]: true,
  [NotificationType.QUIZ_PASSED]: true,
  [NotificationType.BADGE_EARNED]: true,
  [NotificationType.DISCUSSION_REPLY]: true,
  [NotificationType.PURCHASE_CONFIRMED]: true,
};

export class NotificationPreference extends Model<
  InferAttributes<NotificationPreference>,
  InferCreationAttributes<NotificationPreference>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare emailEnabled: CreationOptional<NotificationPreferenceFlags>;
  declare inAppEnabled: CreationOptional<NotificationPreferenceFlags>;
  declare digestFrequency: CreationOptional<DigestFrequency>;
  declare digestDay: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;

  isEmailEnabled(type: NotificationType): boolean {
    return this.emailEnabled?.[type] ?? true;
  }

  isInAppEnabled(type: NotificationType): boolean {
    return this.inAppEnabled?.[type] ?? true;
  }
}

NotificationPreference.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    emailEnabled: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: DEFAULT_FLAGS,
    },
    inAppEnabled: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: DEFAULT_FLAGS,
    },
    digestFrequency: {
      type: DataTypes.ENUM(...Object.values(DigestFrequency)),
      allowNull: false,
      defaultValue: DigestFrequency.WEEKLY,
    },
    digestDay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 0,
        max: 6,
      },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'notification_preferences',
    timestamps: true,
    indexes: [
      { fields: ['user_id'], unique: true },
      { fields: ['digest_frequency', 'digest_day'], name: 'idx_notification_preferences_digest' },
    ],
  }
);

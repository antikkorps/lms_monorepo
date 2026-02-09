import {
  Model,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type ForeignKey,
} from 'sequelize';
import { sequelize } from '../sequelize.js';
import type { User } from './User.js';

export class UserActivityLog extends Model<
  InferAttributes<UserActivityLog>,
  InferCreationAttributes<UserActivityLog>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare activityType: string;
  declare activityDate: CreationOptional<string>; // DATE type
  declare referenceId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
}

UserActivityLog.init(
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
    activityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    activityDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'user_activity_log',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'activity_type', 'activity_date', 'reference_id'],
      },
    ],
  }
);

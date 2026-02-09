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
import type { User } from './User.js';

export class UserStreak extends Model<
  InferAttributes<UserStreak>,
  InferCreationAttributes<UserStreak>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare currentStreak: CreationOptional<number>;
  declare longestStreak: CreationOptional<number>;
  declare lastActiveDate: CreationOptional<string | null>; // DATE type
  declare streakUpdatedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
}

UserStreak.init(
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
    currentStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastActiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    streakUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'user_streaks',
  }
);

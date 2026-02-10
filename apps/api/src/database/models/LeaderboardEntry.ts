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
import { LeaderboardMetric, LeaderboardPeriod } from './enums.js';
import type { User } from './User.js';
import type { Course } from './Course.js';

export class LeaderboardEntry extends Model<
  InferAttributes<LeaderboardEntry>,
  InferCreationAttributes<LeaderboardEntry>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare tenantId: CreationOptional<string | null>;
  declare courseId: CreationOptional<ForeignKey<Course['id']> | null>;
  declare metric: LeaderboardMetric;
  declare period: LeaderboardPeriod;
  declare score: CreationOptional<number>;
  declare rank: CreationOptional<number>;
  declare periodStart: string; // DATE type
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
}

LeaderboardEntry.init(
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
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    metric: {
      type: DataTypes.ENUM(...Object.values(LeaderboardMetric)),
      allowNull: false,
    },
    period: {
      type: DataTypes.ENUM(...Object.values(LeaderboardPeriod)),
      allowNull: false,
    },
    score: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    periodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'leaderboard_entries',
    createdAt: false,
    indexes: [
      {
        fields: ['metric', 'period', 'period_start', 'rank'],
      },
      {
        fields: ['user_id'],
      },
    ],
  }
);

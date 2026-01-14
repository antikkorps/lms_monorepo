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
import type { Course } from './Course.js';

export interface BadgeCriteria {
  type: 'course_completion' | 'quiz_score' | 'lessons_completed' | 'streak' | 'custom';
  threshold?: number;
  courseId?: string;
  description?: string;
}

export class Badge extends Model<
  InferAttributes<Badge>,
  InferCreationAttributes<Badge>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare imageUrl: string;
  declare criteria: BadgeCriteria;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Badge.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    criteria: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'badges',
  }
);

export class UserBadge extends Model<
  InferAttributes<UserBadge>,
  InferCreationAttributes<UserBadge>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare badgeId: ForeignKey<Badge['id']>;
  declare courseId: ForeignKey<Course['id']> | null;
  declare earnedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare badge?: NonAttribute<Badge>;
  declare course?: NonAttribute<Course>;
}

UserBadge.init(
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
    badgeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'badges',
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
    },
    earnedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_badges',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['user_id', 'badge_id', 'course_id'], unique: true },
    ],
  }
);

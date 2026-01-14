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
import type { Lesson } from './Lesson.js';

export class UserProgress extends Model<
  InferAttributes<UserProgress>,
  InferCreationAttributes<UserProgress>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare courseId: ForeignKey<Course['id']>;
  declare lessonId: ForeignKey<Lesson['id']>;
  declare completed: CreationOptional<boolean>;
  declare progressSeconds: CreationOptional<number>;
  declare completedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare course?: NonAttribute<Course>;
  declare lesson?: NonAttribute<Lesson>;

  // Helpers
  get progressPercentage(): NonAttribute<number> {
    if (!this.lesson || this.lesson.duration === 0) return 0;
    return Math.min(100, Math.round((this.progressSeconds / this.lesson.duration) * 100));
  }
}

UserProgress.init(
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
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    progressSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'user_progress',
    indexes: [
      { fields: ['user_id', 'course_id'] },
      { fields: ['user_id', 'lesson_id'], unique: true },
    ],
  }
);

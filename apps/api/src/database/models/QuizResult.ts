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
import type { Lesson } from './Lesson.js';

export interface QuizAnswer {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsEarned: number;
}

export class QuizResult extends Model<
  InferAttributes<QuizResult>,
  InferCreationAttributes<QuizResult>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare lessonId: ForeignKey<Lesson['id']>;
  declare score: number;
  declare maxScore: number;
  declare passed: boolean;
  declare answers: QuizAnswer[];
  declare attemptNumber: CreationOptional<number>;
  declare completedAt: Date;
  declare createdAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare lesson?: NonAttribute<Lesson>;

  // Helpers
  get scorePercentage(): NonAttribute<number> {
    if (this.maxScore === 0) return 0;
    return Math.round((this.score / this.maxScore) * 100);
  }

  get correctAnswersCount(): NonAttribute<number> {
    return this.answers.filter((a) => a.isCorrect).length;
  }
}

QuizResult.init(
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
    lessonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'lessons',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    maxScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    passed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    answers: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    attemptNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'quiz_results',
    updatedAt: false,
    indexes: [{ fields: ['user_id', 'lesson_id'] }],
  }
);

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
import { QuizQuestionType } from './enums.js';
import type { Lesson } from './Lesson.js';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export class QuizQuestion extends Model<
  InferAttributes<QuizQuestion>,
  InferCreationAttributes<QuizQuestion>
> {
  declare id: CreationOptional<string>;
  declare lessonId: ForeignKey<Lesson['id']>;
  declare question: string;
  declare type: CreationOptional<QuizQuestionType>;
  declare options: QuizOption[];
  declare points: CreationOptional<number>;
  declare position: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare lesson?: NonAttribute<Lesson>;

  // Helpers
  get correctAnswerIds(): NonAttribute<string[]> {
    return this.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);
  }

  get isSingleChoice(): NonAttribute<boolean> {
    return this.type === QuizQuestionType.SINGLE_CHOICE;
  }

  get isMultipleChoice(): NonAttribute<boolean> {
    return this.type === QuizQuestionType.MULTIPLE_CHOICE;
  }
}

QuizQuestion.init(
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
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(QuizQuestionType)),
      allowNull: false,
      defaultValue: QuizQuestionType.SINGLE_CHOICE,
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'quiz_questions',
    indexes: [{ fields: ['lesson_id'] }],
  }
);

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
import { LessonType } from './enums.js';
import type { Chapter } from './Chapter.js';
import type { QuizQuestion } from './QuizQuestion.js';

export class Lesson extends Model<
  InferAttributes<Lesson>,
  InferCreationAttributes<Lesson>
> {
  declare id: CreationOptional<string>;
  declare chapterId: ForeignKey<Chapter['id']>;
  declare title: string;
  declare type: CreationOptional<LessonType>;
  declare videoUrl: CreationOptional<string | null>;
  declare videoId: CreationOptional<string | null>;
  declare duration: CreationOptional<number>;
  declare position: CreationOptional<number>;
  declare isFree: CreationOptional<boolean>;
  declare requiresPrevious: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare chapter?: NonAttribute<Chapter>;
  declare quizQuestions?: NonAttribute<QuizQuestion[]>;

  // Helpers
  get isVideo(): NonAttribute<boolean> {
    return this.type === LessonType.VIDEO;
  }

  get isQuiz(): NonAttribute<boolean> {
    return this.type === LessonType.QUIZ;
  }

  get formattedDuration(): NonAttribute<string> {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

Lesson.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    chapterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'chapters',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(LessonType)),
      allowNull: false,
      defaultValue: LessonType.VIDEO,
    },
    videoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    videoId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isFree: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    requiresPrevious: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'lessons',
    indexes: [{ fields: ['chapter_id'] }],
  }
);

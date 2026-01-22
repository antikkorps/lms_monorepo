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
import { SupportedLocale } from './enums.js';
import type { Lesson } from './Lesson.js';

/**
 * LessonContent Model
 * Stores language-specific content for lessons (videos, transcripts, etc.)
 * Falls back to Lesson default fields if not present for a given locale
 */
export class LessonContent extends Model<
  InferAttributes<LessonContent>,
  InferCreationAttributes<LessonContent>
> {
  declare id: CreationOptional<string>;
  declare lessonId: ForeignKey<Lesson['id']>;
  declare lang: SupportedLocale;
  declare title: CreationOptional<string | null>;
  declare videoUrl: CreationOptional<string | null>;
  declare videoId: CreationOptional<string | null>;
  declare transcript: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare lesson?: NonAttribute<Lesson>;
}

LessonContent.init(
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
      field: 'lesson_id',
    },
    lang: {
      type: DataTypes.ENUM(...Object.values(SupportedLocale)),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    videoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'video_url',
    },
    videoId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'video_id',
    },
    transcript: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'lesson_contents',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['lesson_id', 'lang'],
        name: 'lesson_contents_lesson_lang_unique',
      },
      {
        fields: ['lesson_id'],
      },
      {
        fields: ['lang'],
      },
    ],
  }
);

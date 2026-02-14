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
import { SupportedLocale, TranscodingStatus } from './enums.js';
import { logger } from '../../utils/logger.js';
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
  declare transcodingStatus: CreationOptional<TranscodingStatus | null>;
  declare videoSourceKey: CreationOptional<string | null>;
  declare videoPlaybackUrl: CreationOptional<string | null>;
  declare videoStreamId: CreationOptional<string | null>;
  declare transcodingError: CreationOptional<string | null>;
  declare videoThumbnailUrl: CreationOptional<string | null>;
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
    transcodingStatus: {
      type: DataTypes.ENUM(...Object.values(TranscodingStatus)),
      allowNull: true,
      defaultValue: null,
      field: 'transcoding_status',
    },
    videoSourceKey: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'video_source_key',
    },
    videoPlaybackUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'video_playback_url',
    },
    videoStreamId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'video_stream_id',
    },
    transcodingError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'transcoding_error',
    },
    videoThumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'video_thumbnail_url',
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
    hooks: {
      beforeDestroy: async (instance: LessonContent) => {
        // Clean up Cloudflare Stream asset
        if (instance.videoStreamId) {
          try {
            const { isTranscodingAvailable, getTranscoding } = await import(
              '../../services/transcoding/index.js'
            );
            if (isTranscodingAvailable()) {
              await getTranscoding().delete(instance.videoStreamId);
              logger.info(
                { videoStreamId: instance.videoStreamId, lessonContentId: instance.id },
                'Deleted Stream asset on LessonContent destroy'
              );
            }
          } catch (err) {
            logger.warn(
              { videoStreamId: instance.videoStreamId, lessonContentId: instance.id, error: err },
              'Failed to delete Stream asset on LessonContent destroy'
            );
          }
        }

        // Clean up source video file from storage (R2/local)
        if (instance.videoSourceKey) {
          try {
            const { getStorage } = await import('../../storage/index.js');
            await getStorage().delete(instance.videoSourceKey);
            logger.info(
              { videoSourceKey: instance.videoSourceKey, lessonContentId: instance.id },
              'Deleted source video on LessonContent destroy'
            );
          } catch (err) {
            logger.warn(
              { videoSourceKey: instance.videoSourceKey, lessonContentId: instance.id, error: err },
              'Failed to delete source video on LessonContent destroy'
            );
          }
        }
      },
    },
  }
);

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
import { ReviewStatus } from './enums.js';
import type { User } from './User.js';
import type { Course } from './Course.js';

export class CourseReview extends Model<
  InferAttributes<CourseReview>,
  InferCreationAttributes<CourseReview>
> {
  declare id: CreationOptional<string>;
  declare courseId: ForeignKey<Course['id']>;
  declare userId: ForeignKey<User['id']>;
  declare rating: number;
  declare title: CreationOptional<string | null>;
  declare comment: CreationOptional<string | null>;
  declare status: CreationOptional<ReviewStatus>;
  declare moderatedById: CreationOptional<ForeignKey<User['id']> | null>;
  declare moderatedAt: CreationOptional<Date | null>;
  declare moderationNote: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  // Associations
  declare user?: NonAttribute<User>;
  declare course?: NonAttribute<Course>;
  declare moderatedBy?: NonAttribute<User>;
}

CourseReview.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ReviewStatus)),
      allowNull: false,
      defaultValue: ReviewStatus.PENDING,
    },
    moderatedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    moderatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    moderationNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'course_reviews',
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);

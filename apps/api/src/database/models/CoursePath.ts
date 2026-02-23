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
import { CourseStatus } from './enums.js';
import type { User } from './User.js';
import type { Course } from './Course.js';

export class CoursePath extends Model<
  InferAttributes<CoursePath>,
  InferCreationAttributes<CoursePath>
> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare slug: string;
  declare description: CreationOptional<string | null>;
  declare thumbnailUrl: CreationOptional<string | null>;
  declare status: CreationOptional<CourseStatus>;
  declare createdById: ForeignKey<User['id']>;
  declare coursesCount: CreationOptional<number>;
  declare estimatedDuration: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  // Associations
  declare createdBy?: NonAttribute<User>;
  declare courses?: NonAttribute<Course[]>;

  get isPublished(): NonAttribute<boolean> {
    return this.status === CourseStatus.PUBLISHED;
  }
}

CoursePath.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CourseStatus)),
      allowNull: false,
      defaultValue: CourseStatus.DRAFT,
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    coursesCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    estimatedDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'course_paths',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['slug'] },
      { fields: ['status'] },
      { fields: ['created_by_id'] },
    ],
  }
);

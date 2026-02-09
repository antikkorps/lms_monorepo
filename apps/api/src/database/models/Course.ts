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
import { CourseStatus, Currency, CourseCategory, CourseLevel } from './enums.js';
import type { User } from './User.js';
import type { Chapter } from './Chapter.js';

export class Course extends Model<
  InferAttributes<Course>,
  InferCreationAttributes<Course>
> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare slug: string;
  declare description: CreationOptional<string | null>;
  declare thumbnailUrl: CreationOptional<string | null>;
  declare status: CreationOptional<CourseStatus>;
  declare price: CreationOptional<number>;
  declare currency: CreationOptional<Currency>;
  declare instructorId: ForeignKey<User['id']>;
  declare duration: CreationOptional<number>;
  declare chaptersCount: CreationOptional<number>;
  declare lessonsCount: CreationOptional<number>;
  declare averageRating: CreationOptional<number>;
  declare ratingsCount: CreationOptional<number>;
  declare category: CreationOptional<CourseCategory>;
  declare level: CreationOptional<CourseLevel>;
  declare stripeProductId: CreationOptional<string | null>;
  declare stripePriceId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  // Associations
  declare instructor?: NonAttribute<User>;
  declare chapters?: NonAttribute<Chapter[]>;

  // Helpers
  get isPublished(): NonAttribute<boolean> {
    return this.status === CourseStatus.PUBLISHED;
  }

  get isFree(): NonAttribute<boolean> {
    return Number(this.price) === 0;
  }

  get formattedDuration(): NonAttribute<string> {
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

Course.init(
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
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: Currency.EUR,
    },
    instructorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    chaptersCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lessonsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0,
    },
    ratingsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(CourseCategory)),
      allowNull: false,
      defaultValue: CourseCategory.OTHER,
    },
    level: {
      type: DataTypes.ENUM(...Object.values(CourseLevel)),
      allowNull: false,
      defaultValue: CourseLevel.ALL_LEVELS,
    },
    stripeProductId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    stripePriceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'courses',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['slug'] },
      { fields: ['status'] },
      { fields: ['instructor_id'] },
      { fields: ['category'] },
      { fields: ['level'] },
    ],
  }
);

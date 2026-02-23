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
import type { CoursePath } from './CoursePath.js';
import type { Course } from './Course.js';

export class CoursePathItem extends Model<
  InferAttributes<CoursePathItem>,
  InferCreationAttributes<CoursePathItem>
> {
  declare id: CreationOptional<string>;
  declare pathId: ForeignKey<CoursePath['id']>;
  declare courseId: ForeignKey<Course['id']>;
  declare position: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;

  // Associations
  declare course?: NonAttribute<Course>;
  declare path?: NonAttribute<CoursePath>;
}

CoursePathItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    pathId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'course_paths',
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
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'course_path_items',
    timestamps: false,
    indexes: [
      { fields: ['path_id'] },
      { fields: ['course_id'] },
    ],
  }
);

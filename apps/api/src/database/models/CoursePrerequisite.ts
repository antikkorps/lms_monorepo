import {
  Model,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type ForeignKey,
  type CreationOptional,
} from 'sequelize';
import { sequelize } from '../sequelize.js';
import type { Course } from './Course.js';

export class CoursePrerequisite extends Model<
  InferAttributes<CoursePrerequisite>,
  InferCreationAttributes<CoursePrerequisite>
> {
  declare courseId: ForeignKey<Course['id']>;
  declare prerequisiteCourseId: ForeignKey<Course['id']>;
  declare createdAt: CreationOptional<Date>;
}

CoursePrerequisite.init(
  {
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    prerequisiteCourseId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'course_prerequisites',
    timestamps: false,
    indexes: [
      { fields: ['course_id'] },
      { fields: ['prerequisite_course_id'] },
    ],
  }
);

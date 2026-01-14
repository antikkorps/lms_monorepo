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
import type { Course } from './Course.js';
import type { Lesson } from './Lesson.js';

export class Chapter extends Model<
  InferAttributes<Chapter>,
  InferCreationAttributes<Chapter>
> {
  declare id: CreationOptional<string>;
  declare courseId: ForeignKey<Course['id']>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare position: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare course?: NonAttribute<Course>;
  declare lessons?: NonAttribute<Lesson[]>;
}

Chapter.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'chapters',
    indexes: [{ fields: ['course_id'] }],
  }
);

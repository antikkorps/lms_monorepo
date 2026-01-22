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
import type { User } from './User.js';
import type { Lesson } from './Lesson.js';

export class Note extends Model<
  InferAttributes<Note>,
  InferCreationAttributes<Note>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare lessonId: ForeignKey<Lesson['id']>;
  declare content: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare lesson?: NonAttribute<Lesson>;
}

Note.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    lessonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'lessons',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'notes',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'lesson_id'],
        name: 'notes_user_lesson_unique',
      },
      { fields: ['user_id'] },
      { fields: ['lesson_id'] },
    ],
  }
);

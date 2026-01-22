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
import type { Discussion } from './Discussion.js';
import type { User } from './User.js';

export class DiscussionReply extends Model<
  InferAttributes<DiscussionReply>,
  InferCreationAttributes<DiscussionReply>
> {
  declare id: CreationOptional<string>;
  declare discussionId: ForeignKey<Discussion['id']>;
  declare userId: ForeignKey<User['id']>;
  declare content: string;
  declare isDeleted: CreationOptional<boolean>;
  declare deletedById: ForeignKey<User['id']> | null;
  declare deletedReason: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare discussion?: NonAttribute<Discussion>;
  declare user?: NonAttribute<User>;
  declare deletedBy?: NonAttribute<User>;
}

DiscussionReply.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    discussionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'discussions',
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deletedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    deletedReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'discussion_replies',
    indexes: [
      { fields: ['discussion_id'] },
      { fields: ['user_id'] },
      { fields: ['is_deleted'] },
      { fields: ['created_at'] },
    ],
  }
);

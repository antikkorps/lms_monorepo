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
import { ReportReason, ReportStatus } from './enums.js';
import type { Discussion } from './Discussion.js';
import type { DiscussionReply } from './DiscussionReply.js';
import type { User } from './User.js';

export class DiscussionReport extends Model<
  InferAttributes<DiscussionReport>,
  InferCreationAttributes<DiscussionReport>
> {
  declare id: CreationOptional<string>;
  declare discussionId: ForeignKey<Discussion['id']> | null;
  declare replyId: ForeignKey<DiscussionReply['id']> | null;
  declare reportedById: ForeignKey<User['id']>;
  declare reason: ReportReason;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<ReportStatus>;
  declare reviewedById: ForeignKey<User['id']> | null;
  declare reviewedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare discussion?: NonAttribute<Discussion>;
  declare reply?: NonAttribute<DiscussionReply>;
  declare reportedBy?: NonAttribute<User>;
  declare reviewedBy?: NonAttribute<User>;
}

DiscussionReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    discussionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'discussions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    replyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'discussion_replies',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    reportedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    reason: {
      type: DataTypes.ENUM(...Object.values(ReportReason)),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ReportStatus)),
      allowNull: false,
      defaultValue: ReportStatus.PENDING,
    },
    reviewedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'discussion_reports',
    indexes: [
      { fields: ['discussion_id'] },
      { fields: ['reply_id'] },
      { fields: ['reported_by_id'] },
      { fields: ['status'] },
    ],
  }
);

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
import { ImportStatus } from './enums.js';
import type { Tenant } from './Tenant.js';
import type { User } from './User.js';

export interface ImportError {
  row: number;
  email?: string;
  message: string;
}

export class UserImport extends Model<
  InferAttributes<UserImport>,
  InferCreationAttributes<UserImport>
> {
  declare id: CreationOptional<string>;
  declare tenantId: ForeignKey<Tenant['id']> | null;
  declare importedById: ForeignKey<User['id']>;
  declare status: CreationOptional<ImportStatus>;
  declare totalRows: CreationOptional<number>;
  declare successCount: CreationOptional<number>;
  declare errorCount: CreationOptional<number>;
  declare errors: CreationOptional<ImportError[]>;
  declare fileName: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare importedBy?: NonAttribute<User>;
  declare tenant?: NonAttribute<Tenant>;
}

UserImport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    importedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ImportStatus)),
      allowNull: false,
      defaultValue: ImportStatus.PENDING,
    },
    totalRows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    successCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    errorCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    errors: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'user_imports',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['imported_by_id'] },
      { fields: ['status'] },
    ],
  }
);

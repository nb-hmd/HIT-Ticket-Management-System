import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface FactoryAttributes {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface FactoryCreationAttributes extends Omit<FactoryAttributes, 'id'> {
  id?: string;
}

class Factory extends Model<FactoryAttributes, FactoryCreationAttributes> implements FactoryAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public is_active!: boolean;
}

Factory.init(
  {
    id: {
      type: DataTypes.STRING(10),
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Factory',
    tableName: 'factories',
    timestamps: false
  }
);

export default Factory;
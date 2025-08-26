const { Sequelize, DataTypes } = require('sequelize');

// Use MySQL for demo, or change to your DB config
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'signoz_demo',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    dialect: 'mysql',
    logging: false,
  }
);

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  timestamps: true,
});

module.exports = { sequelize, User };

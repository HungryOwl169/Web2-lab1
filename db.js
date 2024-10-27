const { Pool } = require('pg');

const pool = new Pool({
  user: 'database_21g8_user',
  password: 'XpXEcGJrARafKCftnEDwkoLZEVywbAG0',
  host: 'dpg-csf6dr88fa8c739sgegg-a',
  port: 5432, 
  database: 'database_21g8'
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
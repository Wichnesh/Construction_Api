const { createPool } = require('mysql');

const pool = createPool({
  host: "localhost",
  user: "root",
  password: "password",
  database: "ConstructionDb", // Default database for initial connection
  connectionLimit: 10
});

// Attempt to establish a connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    return;
  }

  console.log('Connected to the database!');
  // If needed, you can perform additional operations with the connection here

  // Release the connection when done with it
  connection.release();
});

module.exports = pool;

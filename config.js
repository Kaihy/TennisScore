// config.js
var IP = {
    ipAddress: "172.20.10.2" // Beispiel-IP-Adresse
};



module.exports = {
    IP: IP, // Export the IP object
    dbConfig: {
      user: 'postgres',       // Replace with your PostgreSQL username
      host: 'localhost',      // Replace with your PostgreSQL host
      database: 'Tennis_App', // Replace with your PostgreSQL database name
      password: '12345',      // Replace with your PostgreSQL password
      port: 5432,             // Default PostgreSQL port
    }
  };
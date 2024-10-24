const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { dbConfig } = require('./config');
const config = require('./config');
const { v4: uuidv4 } = require('uuid'); // Import uuid for generating unique keys
const cron = require('node-cron');

const app = express();
const port = 3000;


// Configure the PostgreSQL connection using the imported config
const pool = new Pool(dbConfig);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// User registration route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Check if the username is a valid email
    if (!validator.isEmail(username)) {
        return res.status(400).send('Invalid email format');
    }

    try {
        // Check if the username (email) already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).send('Email already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)',
            [username, hashedPassword]
        );

        res.send('Registration successful');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// User login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Check if the username is a valid email
    if (!validator.isEmail(username)) {
        return res.status(400).send('Invalid email format');
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                // Send a JSON response with userId
                res.json({ message: 'Login successful', user_id: user.id });
            } else {
                res.status(401).send('Invalid credentials');
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Password renewal route
app.post('/renew-password', async (req, res) => {
    const { username, newPassword } = req.body;

    try {
        // Check if the user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, username]);

        res.send('Password renewed successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Endpoint to handle adding a new match
app.post('/add', async (req, res) => {
    const {
        spieler1,
        spieler2,
        courtnumber,
        spielklasse,
        altersklasse,
        spieler1_verein,
        spieler2_verein,
        spielstatus = 'geplant',
        serve1 = '1',
        serve2 = '0',
        tiebreak_mode = '0',
        deleteflag = '0',
        winnervalue = '0',
        user_id
    } = req.body;

    try {
        await pool.query(
            'INSERT INTO tennis_match (spieler1, spieler2, courtnumber, spielklasse, altersklasse, spieler1_verein, spieler2_verein, spielstatus, serve1, serve2, tiebreak_mode, deleteflag, winnervalue, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
            [spieler1, spieler2, courtnumber, spielklasse, altersklasse, spieler1_verein, spieler2_verein, spielstatus, serve1, serve2, tiebreak_mode, deleteflag, winnervalue, user_id]
        );
        res.status(201).json({ message: 'Match added successfully' });
    } catch (err) {
        console.error('Error adding match:', err);
        res.status(500).json({ error: 'An error occurred while adding the match' });
    }
});

// Endpoint to fetch all matches
app.get('/matches', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tennis_match');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching matches:', err);
        res.status(500).json({ error: 'An error occurred while fetching the matches' });
    }
});

// Endpoint to fetch matches filtered by id
app.get('/matches/filter', async (req, res) => {
    const { id } = req.query;  // Get id from query parameters

    // Check if external_id is provided
    if (!id) {
        return res.status(400).json({ error: 'id query parameter is required' });
    }

    try {
        // Query to fetch matches where external_id matches and deleteflag is 0
        const result = await pool.query('SELECT * FROM tennis_match WHERE deleteflag = 0 AND id = $1', [id]);
        
        // Send back the result
        res.status(200).json({ matches: result.rows });
    } catch (err) {
        console.error('Error fetching filtered matches:', err);
        res.status(500).json({ error: 'An error occurred while fetching filtered matches' });
    }
});


// Endpoint to update match data
app.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    const {
        spieler1,
        spieler2,
        spieler1_Satz,
        spieler2_Satz,
        spieler1_Spiel,
        spieler1_Spiel2,
        spieler1_Spiel3,
        spieler2_Spiel,
        spieler2_Spiel2,
        spieler2_Spiel3,
        spieler1_Punkte,
        spieler2_Punkte,
        spielstatus,
        serve1,
        serve2,
        tiebreak_mode,
        deleteflag,
        winnervalue
    } = req.body;

    try {
        await pool.query(
            'UPDATE tennis_match SET spieler1 = $1, spieler2 = $2, spieler1_satz = $3, spieler2_satz = $4, spieler1_spiel = $5, spieler1_spiel2 = $6, spieler1_spiel3 = $7, spieler2_spiel = $8, spieler2_spiel2 = $9, spieler2_spiel3 = $10, spieler1_punkte = $11, spieler2_punkte = $12, spielstatus = $13, serve1 = $14, serve2 = $15, tiebreak_mode = $16, deleteflag = $17, winnervalue = $18 WHERE id = $19',
            [spieler1, spieler2, spieler1_Satz, spieler2_Satz, spieler1_Spiel, spieler1_Spiel2, spieler1_Spiel3, spieler2_Spiel, spieler2_Spiel2, spieler2_Spiel3, spieler1_Punkte, spieler2_Punkte, spielstatus, serve1, serve2, tiebreak_mode, deleteflag, winnervalue, id]
        );
        res.status(200).json({ message: 'Match updated successfully' });
    } catch (err) {
        console.error('Error updating match:', err);
        res.status(500).json({ error: 'An error occurred while updating the match' });
    }
});

// Endpoint to delete match data
app.patch('/delete/:id', async (req, res) => {
    const { id } = req.params;
    const { deleteflag } = req.body;

    try {
        await pool.query('UPDATE tennis_match SET deleteflag = $1 WHERE id = $2', [deleteflag, id]);
        res.status(200).json({ message: 'Match deleted successfully' });
    } catch (err) {
        console.error('Error deleting match:', err);
        res.status(500).json({ error: 'An error occurred while deleting the match' });
    }
});

// Endpoint to update Center Court Key
app.patch('/generatedkey/:id', async (req, res) => {
    const { id } = req.params;
    const {
        generated_key
    } = req.body;

    try {
        await pool.query(
            'UPDATE tennis_match SET generated_key = $1  WHERE id = $2',
            [generated_key, id]
        );
        res.status(200).json({ message: 'Match updated successfully' });
    } catch (err) {
        console.error('Error updating match:', err);
        res.status(500).json({ error: 'An error occurred while updating the match' });
    }
});



// Route for generating the QR code
app.get('/generate-center-court-qr', async (req, res) => {
    const key = uuidv4();
    const url = `http://${config.IP.ipAddress}/display-court/${key}`;

    try {
        // Store only the key in the database
        await pool.query('INSERT INTO court_keys (key) VALUES ($1)', [key]);
         // Send the generated key in the response (rather than just the URL)
         res.json({ generated_key: key });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating QR code');
    }
});
 // Create User id and Courtnumber in table court_keys
app.post('/display-court/:key', async (req, res) => {
    const key = req.params.key;
    const { external_id, user_id, courtnumber } = req.body;

    try {
        // Update the court_keys table with the new user_id and courtnumber
        const result = await pool.query(
            'UPDATE court_keys SET user_id = $1, courtnumber = $2, external_id =$3 WHERE key = $4',
            [user_id, courtnumber, external_id, key]
        );

        // Check if the update was successful (if any rows were updated)
        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Court information updated successfully' });
        } else {
            res.status(404).json({ message: 'Court key not found' });
        }
    } catch (error) {
        console.error('Error updating court details:', error);
        res.status(500).json({ error: 'Error updating court details' });
    }
});


// display user_id and Courtnumber in Centercourt.html
app.get('/display-court/:key', async (req, res) => {
    const key = req.params.key;

    try {
        const result = await pool.query('SELECT user_id, courtnumber, external_id FROM court_keys WHERE key = $1', [key]);

        if (result.rows.length > 0) {
            res.json({
                user_id: result.rows[0].user_id,
                courtnumber: result.rows[0].courtnumber,
                external_id: result.rows[0].external_id
            });
        } else {
            res.status(404).json({ error: 'Court Key not found' });
        }
    } catch (error) {
        console.error('Error retrieving court details:', error);
        res.status(500).json({ error: 'Error retrieving court details' });
    }
});

////////CRON - court_keys älter als 2 Tage----------->

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        const result = await pool.query(`
            DELETE FROM court_keys
            WHERE created_at < NOW() - INTERVAL '2 days'
        `);
        console.log(`Deleted ${result.rowCount} rows older than two days.`);
    } catch (error) {
        console.error('Error deleting old rows:', error);
    }
});

process.on('exit', () => {
    pool.end();
});

////////////


app.use(express.static('public'));
app.use(express.json());

app.listen(port, () => {
    console.log(`Server is running on http://${config.IP.ipAddress}:${port}`);
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Configure the PostgreSQL connection
const pool = new Pool({
    user: 'postgres',       // Replace with your PostgreSQL username
    host: 'localhost',      // Replace with your PostgreSQL host
    database: 'Tennis_App', // Replace with your PostgreSQL database name
    password: '',      // Replace with your PostgreSQL password
    port: 5432,             // Default PostgreSQL port
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
        spielstatus   // Default value for spielstatus
    } = req.body;

    try {
        await pool.query(
            'INSERT INTO tennis_match (spieler1, spieler2, courtnumber, spielklasse, altersklasse, spieler1_verein, spieler2_verein, spielstatus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [spieler1, spieler2, courtnumber, spielklasse, altersklasse, spieler1_verein, spieler2_verein, spielstatus]
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
    } = req.body;

    try {
        await pool.query(
            'UPDATE tennis_match SET spieler1 = $1, spieler2 = $2, spieler1_satz = $3, spieler2_satz = $4, spieler1_spiel = $5, spieler1_spiel2 = $6,  spieler1_spiel3 = $7,spieler2_spiel = $8, spieler2_spiel2 = $9, spieler2_spiel3 = $10, spieler1_punkte = $11, spieler2_punkte = $12, spielstatus = $13, serve1 = $14, serve2 = $15  WHERE id = $16',
            [spieler1, spieler2, spieler1_Satz, spieler2_Satz, spieler1_Spiel,spieler1_Spiel2,spieler1_Spiel3, spieler2_Spiel, spieler2_Spiel2, spieler2_Spiel3, spieler1_Punkte, spieler2_Punkte, spielstatus, serve1, serve2, id]
        );
        res.status(200).json({ message: 'Match updated successfully' });
    } catch (err) {
        console.error('Error updating match:', err);
        res.status(500).json({ error: 'An error occurred while updating the match' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

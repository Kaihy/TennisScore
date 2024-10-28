const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { dbConfig, emailConfig } = require('./config');
const config = require('./config');
const { v4: uuidv4 } = require('uuid'); // Import uuid for generating unique keys
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;


// Configure the PostgreSQL connection using the imported config
const pool = new Pool(dbConfig);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/////////////



//////////// User registration route
// Function to send verification email
async function sendVerificationEmail(email, verificationCode) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: emailConfig.user,  // Benutzer aus der config.js
            pass: emailConfig.pass,  // Passwort aus der config.js
        },
    });

    const verificationLink = `http://${config.IP.ipAddress}:${port}/verify-email?code=${verificationCode}`;
    const mailOptions = {
        from: emailConfig.user,
        to: email,
        subject: 'Email Verification',
        html: `<p>Please verify your email by clicking on the link below:</p><a href="${verificationLink}">Verify Email</a>`,
    };

    await transporter.sendMail(mailOptions);
}



app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Validate email format
    if (!validator.isEmail(username)) {
        return res.status(400).send('Invalid email format');
    }

    try {
        // Check if the username (email) already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).send('Email already exists');
        }

        // Generate and hash the password and verification code
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = uuidv4();

        // Insert user with verification code into the database
        await pool.query(
            'INSERT INTO users (username, password, verification_code, isVerified) VALUES ($1, $2, $3, $4)',
            [username, hashedPassword, verificationCode, 0]
        );

        // Send verification email
        await sendVerificationEmail(username, verificationCode);

        res.send('Registration successful, please verify your email');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});
////////////////////////Verify-mail
app.get('/verify-email', async (req, res) => {
    const { code } = req.query;

    try {
        const result = await pool.query(
            'UPDATE users SET isVerified = 1, verification_code = NULL WHERE verification_code = $1 AND isVerified = 0 RETURNING username',
            [code]
        );

        if (result.rowCount > 0) {
            res.status(200).send('Email verified successfully');
        } else {
            res.status(400).send('Invalid or expired verification link');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

////////////////////////resend Verification Link: 
app.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    try {
        // Find the user in the database
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [email]
        );

        // Check if user exists and is not already verified
        if (result.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = result.rows[0];
        if (user.isverified === 1) {
            return res.status(400).send('User is already verified');
        }

        // Generate a new verification code and update the database
        const verificationCode = uuidv4();
        await pool.query(
            'UPDATE users SET verification_code = $1 WHERE username = $2',
            [verificationCode, email]
        );

        // Resend the verification email
        await sendVerificationEmail(email, verificationCode);

        res.send('Verification email resent successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});
/////////////////////////






///////////// User login route
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





//////////11 Password renewal route
app.post('/renew-password', async (req, res) => {
    const { username } = req.body;
    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // Token expires in 15 minutes

    try {
        // Check if the user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        // Save the reset token and expiry in the database
        await pool.query(
            'UPDATE users SET reset_token = $1, token_expiry = $2 WHERE username = $3',
            [resetToken, tokenExpiry, username]
        );

        // Send the password reset email with the verification link
        const resetLink = `http://${config.IP.ipAddress}:${port}/reset-password?token=${resetToken}`;
        await sendPasswordResetEmail(username, resetLink);

        res.send('A verification link has been sent to your email. Please confirm to reset your password.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Function to send password reset email
async function sendPasswordResetEmail(email, resetLink) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: emailConfig.user,  // Benutzer aus der config.js
            pass: emailConfig.pass,  // Passwort aus der config.js
        },
    });

    const mailOptions = {
        from: emailConfig.user,
        to: email,
        subject: 'Password Reset Request',
        html: `<p>Please reset your password by clicking the link below. This link is valid for 15 minutes:</p><a href="${resetLink}">Reset Password</a>`
    };

    await transporter.sendMail(mailOptions);
}

/////////////////11
///////////////2222
app.get('/reset-password', async (req, res) => {
    const { token } = req.query;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE reset_token = $1 AND token_expiry > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).send('Invalid or expired token');
        }

        // Token is valid, render password reset form or redirect to it
        res.send('<form method="POST" action="/confirm-reset"><input type="hidden" name="token" value="'+ token +'"/><input type="password" name="newPassword" placeholder="New Password"/><button type="submit">Reset Password</button></form>');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

//////////2222
//////33
app.post('/confirm-reset', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE reset_token = $1 AND token_expiry > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).send('Invalid or expired token');
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password, clear reset token and expiry
        await pool.query(
            'UPDATE users SET password = $1, reset_token = NULL, token_expiry = NULL WHERE reset_token = $2',
            [hashedPassword, token]
        );

        res.send('Your password has been updated successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

//////33

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
//////////

// Route to filter matches by generated_key using a database query
app.get('/matches/enteredkey', async (req, res) => {
    const enteredKey = req.query.key;

    if (!enteredKey) {
        return res.status(400).json({ error: 'No key provided' });
    }

    try {
        // SQL query to select matches based on generated_key
        const result = await pool.query('SELECT * FROM tennis_match WHERE generated_key = $1', [enteredKey]);

        if (result.rows.length > 0) {
            res.json({ matches: result.rows });
        } else {
            res.json({ matches: [] });
        }
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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

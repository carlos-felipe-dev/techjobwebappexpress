require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

// const port = process.env.POSTGRES_PORT;

// const corsOptions = {
//   origin: 'http://localhost:3000', 
// }

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT
})

app.use(cookieParser());

app.use(cors({
  credentials: true,
}));

// Makes Express parse the JSON body of any requests and adds the body to the req object
app.use(bodyParser.json());

app.use(async (req, res, next) => {
  try {
    req.db = await pool.connect();
    // req.db.connection.config.namedPlaceholders = true;

    // Moves the request on down the line to the next middleware functions and/or the endpoint it's headed for
    await next();

    req.db.release();
  } catch (err) {
    // If anything downstream throw an error, we must release the connection allocated for the request
    console.log(err)
    // If an error occurs, disconnects from the database
    if (req.db) req.db.release();
    throw err;
  }  
});

app.post('/register', async function (req, res) {
  try {
    const { username, password, userIsAdmin } = req.body;

    const isAdmin = userIsAdmin ? 1 : 0

    // Validate username and password
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }

    if(password.length < 6){
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters"})
    }

    // Check if the username is already taken
    const existingUser = await req.db.query(`SELECT * FROM "user" WHERE user_name = $1`, [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: "Username is already taken." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the user into the database
    const { rows } = await req.db.query(
      `INSERT INTO "user" (user_name, password, admin_flag)
      VALUES ($1, $2, $3) 
      RETURNING id`,
      [username, hashedPassword, userIsAdmin ? 1 : 0]
    );

    const user = rows[0];
    
    const payload = {
      userId: user.id,
      username,
      userIsAdmin: isAdmin
    }
    
    // Generate JWT token
    const accessToken = jwt.sign(payload, process.env.NEXT_PUBLIC_JWT_SECRET);
    const refreshToken = jwt.sign(payload, process.env.NEXT_PUBLIC_JWT_REFRESH_SECRET);

    //Set the cookie
    // res.cookie('supachatAccessToken', accessToken, { httpOnly: true, secure: false });
    // res.cookie('supachatRefreshToken', refreshToken, { httpOnly: true, secure: false });
    
    // Respond with success
    res.json({ success: true, cookies: { accessToken, refreshToken}, message: "User registered successfully."});

  } catch (err) {
    console.error('Error: ', err);
    res.status(500).json({ success: false, error: "An error occurred while registering the user." });
  }
});

app.post('/login', async function (req, res) {
  try {
      const { username, password } = await req.body;
      
      // Retrieve user from the database
      const { rows } = await req.db.query(`
      SELECT id, user_name, password, admin_flag 
      FROM "user" 
      WHERE user_name = $1`, [username]);
      
      const user = rows[0]

      // Verify user exists and password is correct
      if (rows.length === 0 || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, message: 'Username or password is incorrect.' });
      }

      const payload = {
        userId: user.id,
        username: user.user_name,
        userIsAdmin: user.admin_flag ? 1: 0
      }

      // Generate JWT token
      const accessToken = jwt.sign(payload, process.env.NEXT_PUBLIC_JWT_SECRET);
      const refreshToken = jwt.sign(payload, process.env.NEXT_PUBLIC_JWT_REFRESH_SECRET);

      // Set JWT token in cookie
      // res.cookie('supachatAccessToken', accessToken, { httpOnly: false, secure: false });
      // res.cookie('supachatRefreshToken', refreshToken, { httpOnly: false, secure: false });
      // console.log('Access: ', accessToken)
      // console.log('Refresh: ', refreshToken)

      // Respond with success
      res.json({ success: true, cookies: { accessToken, refreshToken }, message: 'Login successful' });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, error: 'An error occurred during login' });
  }
});

app.post('/logout', async (req, res) => {
  try {
    // Clear the access token cookie
    // res.clearCookie('supachatAccessToken');

    // Clear the refresh token cookie
    // res.clearCookie('supachatRefreshToken');

    // Respond with success
    res.json({ success: true, message: 'Successfully logged out.' });
    // res.end()
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'An error occurred during logout' });
  }
});

app.get('/user', async function (req, res) {
  try {
    const accessToken = req.headers.supachataccesstoken
   
    if(!accessToken) return res.status(500).json({ success: false, data: { user: null }, error: "No access token found." });

    const decoded = jwt.verify(accessToken, process.env.NEXT_PUBLIC_JWT_SECRET);
    if(!decoded){
      return res.status(500).json({ success: false, data: { user: null }, error: "Invalid access token." });
    }
    
    //if access token is expired 
    //go to /refresh-token endpoint and create a new
    //access token. If and only if refresh token is valid and not expired either
    
    return res.json({ success: true, data: { user: decoded }, error: 'No error'})

  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: "An error occurred while fetching the user." });
  }
})

app.post('/refresh-token', async (req, res) => {
  try {
      const refreshToken = req.headers.supachatrefreshtoken;

      // Check if the refresh token exists
      if (!refreshToken) {
        return res.status(401).json({ success: false, error: 'Refresh token not provided' });
      }
      
      // Verify and decode the refresh token
      const decoded = jwt.verify(refreshToken, process.env.NEXT_PUBLIC_JWT_REFRESH_SECRET);
      if(!decoded){
        return res.status(500).json({ success: false, error: "Invalid refresh token." });
      }

      //Verify token has not expired
      if (Date.now() >= decoded.exp * 1000) { // Convert exp to milliseconds
        return res.status(401).json({ success: false, error: 'Token has expired.' });
      }

      const user = await getUserById(req, decoded.id);

      // Generate a new access token
      const payload = {
        userId: user.id,
        username: user.user_name,
        userIsAdmin: user.admin_flag
      }
      
      // const accessToken = generateAccessToken(user);
      const accessToken = jwt.sign(payload, process.env.NEXT_PUBLIC_JWT_SECRET);

      // Respond with the new access token
      res.cookie('supachatAccessToken', accessToken, { httpOnly: true, secure: true });
      res.json({ success: true, message: 'Access token successfully minted.' });

  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, error: 'An error occurred during token refresh' });
  }
});

async function getUserById(req, userId) {
  try {

    const { rows } = await req.db.query(`
      SELECT id, user_name, user_flag 
      FROM "user" 
      WHERE id = $1
    `, [userId]);

    return rows[0]; // Return the user object

  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
}

app.get('/car', async (req, res) => {
  console.log('GET to /car');

  const { rows: cars } = await req.db.query(`
    SELECT * FROM car
  `);

  console.log('All cars: ', cars);
  res.json({ cars });
});

app.post('/car', async (req, res) => {
  try {
    console.log('POST to /car')

  const { 
    year, 
    make, 
    model 
  } = req.body;

  const { rows } = await req.db.query(
    `INSERT INTO car (year, make, model)
    VALUES ($1, $2, $3)
    RETURNING *;`,
    [ year, make, model ]);

  const car = rows[0]  
  console.log(car)
  res.json(car)

  } catch (err) {
    console.log('Error: ', err)
    res.json({err, success: false})
  }
  
})

app.listen(3000, () => {
  console.log('Server ready on port 3000.');
});

module.exports = app;
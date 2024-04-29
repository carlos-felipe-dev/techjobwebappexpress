require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const loginRoute = require('../routes/login');
const registerCandidateRoute = require('../routes/register-candidate');
const registerEmployerRoute = require('../routes/register-employer');
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
  origin: 'http://localhost:5173', 
  credentials: true,
}));

// Makes Express parse the JSON body of any requests and adds the body to the req object
app.use(bodyParser.json());
app.use(express.static('public'));

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

app.post('/register-candidate', registerCandidateRoute);

app.post('/register-employer', registerEmployerRoute);

app.post('/login', loginRoute);

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

    if (!accessToken) return res.status(500).json({ success: false, data: { user: null }, error: "No access token found." });

    const decoded = jwt.verify(accessToken, process.env.NEXT_PUBLIC_JWT_SECRET);
    if (!decoded) {
      return res.status(500).json({ success: false, data: { user: null }, error: "Invalid access token." });
    }

    //if access token is expired 
    //go to /refresh-token endpoint and create a new
    //access token. If and only if refresh token is valid and not expired either

    return res.json({ success: true, data: { user: decoded }, error: 'No error' })

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
    if (!decoded) {
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
      [year, make, model]);

    const car = rows[0]
    console.log(car)
    res.json(car)

  } catch (err) {
    console.log('Error: ', err)
    res.json({ err, success: false })
  }

})

app.get('/createjoblisting', async (req, res) => {
  console.log('GET to /CreateJobListing');

  const { rows: createjoblistings } = await req.db.query(`
    SELECT * FROM createjoblisting
  `);

  console.log('All job listings', createjoblistings);
  res.json({ createjoblistings });
});

app.post('/createjoblisting', async (req, res) => {
  try {
    console.log('POST to /createjoblisting')

    const {
      address,
      city,
      company_name,
      deadline_end,
      deadline_start,
      job_experience,
      job_title,
      job_type,
      positions_available,
      postal_code,
      questions,
      salary_end,
      salary_start,
      state,
      country,
      job_description

    } = req.body;

    const { rows } = await req.db.query(
      `INSERT INTO createjoblisting (address,
      city,
      company_name,
      deadline_end,
      deadline_start,
      job_experience,
      job_title,
      job_type,
      positions_available,
      postal_code,
      questions,
      salary_end,
      salary_start,
      state,
      country,
      job_description)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *;`,
      [address,
        city,
        company_name,
        deadline_end,
        deadline_start,
        job_experience,
        job_title,
        job_type,
        positions_available,
        postal_code,
        questions,
        salary_end,
        salary_start,
        state,
        country,
        job_description]);

    const jobListing = rows[0]
    console.log(jobListing)
    res.json(jobListing)

  } catch (err) {
    console.log(err);
  }

})


app.listen(5432, () => {
  console.log('Server ready on port 5432.');
});

module.exports = app;
require('dotenv').config();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
  try {
    const { username, password } = await req.body;

    if (!username || !password ) {
      return res.status(400).json({ success: false, error: "Username and password are required" });
    }
    
    // Retrieve user from the database
    const { rows } = await req.db.query(`
    SELECT id, username, password 
    FROM "user" 
    WHERE username = $1`, [username]);
    
    const user = rows[0];

    // Verify user exists and password is correct
    if (rows.length === 0 || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: 'Username or password is incorrect' });
    }
    
    const payload = {
      user_id: user.id,
      username,
      iss: "corgi",
      aud: ["corgi", "api"]
    }

    
    // Generate JWT token
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET);
    // const refreshToken = jwt.sign(payload, process.env.NEXT_PUBLIC_JWT_REFRESH_SECRET);
    
    // Set JWT token in cookie
    const hour = 3600000;
    const maxAge = 31 * 24 * hour; //2 weeks
    res.cookie('corgi_jobs_token', accessToken, { httpOnly: true, maxAge, path: '/', secure: false, sameSite: 'lax'});
    // return res.redirect("/")
    return res.status(200).json({ success: true })

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'An error occurred during login' });
}
}
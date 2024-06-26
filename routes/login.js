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
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' } );
    const data = accessToken
    //Send JWT inside response
    return res.status(201).json({ success: true, data })

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'An error occurred during login' });
  }
}
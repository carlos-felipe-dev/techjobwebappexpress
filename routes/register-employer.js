require('dotenv').config();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');

function isValidEmail(email) {
  // Regular expression for validating email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = async (req, res) => { 
  try {

    const { username, email, password, confirmPassword, industry, businessName, businessWebsite, location, phoneNumber } = req.body;

    // Check if all fields have been answered
    if (!username || !email || !password || !confirmPassword || !industry || !businessName || !location || !phoneNumber) {
      return res.status(400).json({ success: false, error: "Required fields must be filled out" });
    }

    //Check username length
    if(username.length < 3){
      return res.status(400).json({ success: false, error: "Username must be at least 2 characters" });
    }

    // Check if email is in correct format
    if(!isValidEmail(email)){
      return res.status(400).json({ success: false, error: "Please enter a valid email" });
    }

    // Check if the username is already taken
    const { rows: existingUsername } = await req.db.query(`SELECT COUNT(*) AS count FROM "user" WHERE username = $1;`, [username]);
    if (existingUsername[0].count > 0) {
      return res.status(400).json({ success: false, error: "Username is already taken" });
    }

    // Check if the email is already taken
    const { rows: existingEmail } = await req.db.query(`SELECT COUNT(*) AS count FROM "user" WHERE email = $1;`, [email]);
    if (existingEmail[0].count > 0) {
      return res.status(400).json({ success: false, error: "An account already exists with that email" });
    }

    //Check if password is strong
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" })
    }

    // Check if passwords match
    if(password !== confirmPassword){
      return res.status(400).json({ success: false, error: "Passwords do not match" })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the user into the database
    const { rows } = await req.db.query(
      `INSERT INTO "user" (username, email, password)
      VALUES ($1, $2, $3) 
      RETURNING id`,
      [username, email, hashedPassword]
    );

    const user_id = rows[0].id;

    const { rows: business_profile } = await req.db.query(
      `INSERT INTO business_profile (industry, business_name, business_website, location, phone, user_id)
      VALUES ($1, $2, COALESCE(NULLIF($3, ''), NULL), $4, $5, $6)`,
      [industry, businessName, businessWebsite, location, phoneNumber, user_id]
    );

    const payload = {
      user_id,
      username,
      iss: "corgi",
      aud: ["corgi", "api"]
    }

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d'} );
    const data = accessToken
    //Send JWT inside response
    return res.status(201).json({ success: true, data })
  } catch (err) {
    console.log('Error: ', err);
    res.status(500).json({ success: false, error: "An error occurred while registering" });
  }
}
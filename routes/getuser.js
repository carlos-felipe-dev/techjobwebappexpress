require('dotenv').config();
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  try {
    const { authorization: authHeader } = req.headers;
    if (!authHeader) res.json('Invalid authorization, no authorization headers');

    const [scheme, jwtToken] = authHeader.split(' ');
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    if(decoded){
      return res.status(200).json({ success: true })
    } else {
      return res.status(401).json({ error: 'Invalid JWT' });
    }
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  const { authorization: authHeader } = req.headers;
  if (!authHeader) return res.json('Invalid authorization, no authorization headers');

  const [scheme, jwtToken] = authHeader.split(' ');

  if (scheme !== 'Bearer') return res.json('Invalid authorization, invalid authorization scheme');

  try {
    const decodedJwtObject = jwt.verify(jwtToken, process.env.JWT_SECRET);
    return res.status(201).json({ success: true })

  } catch (err) {
    console.log(err.message);
    return res.status(401).json({ success: false, error: err.message})
  }
}
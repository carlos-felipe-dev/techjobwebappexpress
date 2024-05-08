module.exports = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { rows } = await req.db.query(`
    SELECT * 
    FROM "interview"
    WHERE user_id = $1
    `, [user_id]);

    res.json({ success: true, data: rows });

  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
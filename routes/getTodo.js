module.exports = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { rows } = await req.db.query(`
    SELECT * 
    FROM "todo"
    WHERE user_id = $1
    `, [user_id]);

    res.status(200).json({ success: true, data: rows });

  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
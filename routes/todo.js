module.exports = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { todos } = req.body;
    
    for(const todo of todos){
      await req.db.query(
        `INSERT INTO "todo" (id, text, completed, user_id)
        VALUES ($1, $2, $3, $4) 
        `,
        [todo.id, todo.text, todo.completed, user_id]
      );
    }

    res.status(201).json({ success: true })
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
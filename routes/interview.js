module.exports = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { interviews } = req.body;
    
    for(const interview of interviews){
      await req.db.query(
        `INSERT INTO "interview" (id, interviewee, date, time, job, user_id)
        VALUES ($1, $2, $3, $4, $5, $6) 
        `,
        [interview.id, interview.interviewee, interview.date, interview.time, interview.job, user_id]
      );
    }

    res.status(201).json({ success: true })

  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
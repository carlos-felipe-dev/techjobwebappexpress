module.exports = async (req, res) => {
    
    try {
      const { user_id } = req.user;
  
      await req.db.query(
        `DELETE FROM resume 
        WHERE user_id = $1`,
        [user_id]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting resume:', error);
      // res.status(500).json('Internal Server Error');
    }
}
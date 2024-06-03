require('dotenv').config();

module.exports = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { firstName, lastName, jobTitle, phone, email, address, city, zipCode, state, country, summary, socials, publications, workExperience, education, skills } = req.body;

    //Check if user has resume
    const { rows: existingResumes } = await req.db.query(`
      SELECT id FROM resume
      WHERE user_id = $1
    `, [user_id])

    let resumeId;

    if(existingResumes.length > 0) {
      resumeId = existingResumes[0].id;
      // console.log(existingResumes[0].id)

      const resumeQuery = `
        UPDATE resume 
        SET
          first_name = $2,
          last_name = $3,
          job_title = $4,
          phone = $5,
          email = $6,
          address = $7,
          city = $8,
          zip_code = $9,
          state = $10,
          country = $11,
          summary = $12
        WHERE id = $1     
      `;

      const resumeValues = [resumeId, firstName, lastName, jobTitle, phone, email, address, city, zipCode, state, country, summary];
      await req.db.query(resumeQuery, resumeValues);

      // for (const social of socials) {
      //   await req.db.query(`
      //     UPDATE socials 
      //     SET link = $2
      //     WHERE id = $2
      //   `, 
      //   [resume_id, social.link]);
      // }

    } else {
      // Insert into Resume table
      const insertResumeQuery = `
        INSERT INTO resume (first_name, last_name, job_title, phone, email, address, city, zip_code, state, country, summary, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id;
      `;

      const insertResumeValues = [firstName, lastName, jobTitle, phone, email, address, city, zipCode, state, country, summary, user_id];
      const { rows: [{ id }] } = await req.db.query(insertResumeQuery, insertResumeValues);
      resumeId = id;
    }

    //Delete existing Socials
    await req.db.query(`DELETE FROM socials WHERE resume_id = $1`, [resumeId]);
    
    // Insert into Socials table
    for (const social of socials) {
      await req.db.query('INSERT INTO socials (resume_id, id, link) VALUES ($1, $2, $3)', [resumeId, social.id, social.link]);
    }

    //Delete existing Publications
    await req.db.query(`DELETE FROM publications WHERE resume_id = $1`, [resumeId]);

    // Insert into Publications table
    for (const publication of publications) {
      await req.db.query('INSERT INTO publications (resume_id, id, link) VALUES ($1, $2, $3)', [resumeId, publication.id, publication.link]);
    }

    //Delete existing WorkExperiences
    await req.db.query(`DELETE FROM work_experience WHERE resume_id = $1`, [resumeId]);

    // Insert into WorkExperience table
    for (const experience of workExperience) {
      await req.db.query(`
        INSERT INTO work_experience (resume_id, id, position_title, company_name, location_type, city, country, start_date, end_date, currently_employed, job_description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [resumeId, experience.id, experience.positionTitle, experience.companyName, experience.location.locationType, experience.location.city, experience.location.country, experience.startDate || null, experience.endDate || null, experience.currentlyEmployed, experience.jobDescription]);
    }

    //Delete existing Educations
    await req.db.query(`DELETE FROM education WHERE resume_id = $1`, [resumeId]);

    // Insert into Education table
    for (const edu of education) {
      await req.db.query(`
        INSERT INTO education (resume_id, id, education_level, field_of_study, school_name, start_date, end_date, currently_studying)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [resumeId, edu.id, edu.educationLevel, edu.fieldOfStudy, edu.schoolName, edu.startDate || null, edu.endDate || null, edu.currentlyStudying]);
    }

    //Delete existing Skills
    await req.db.query(`DELETE FROM skills WHERE resume_id = $1`, [resumeId]);

    // Insert into Skills table
    for (const skill of skills) {
      await req.db.query('INSERT INTO skills (resume_id, id, skill_name, experience) VALUES ($1, $2, $3, $4)', [resumeId, skill.id, skill.skillName, skill.experience || null]);
    }

    return res.status(201).json({ success: true })

  } catch (error) {
    console.error('Error inserting resume:', error);
    res.status(500).json({ success: false, error: 'An error occurred while saving resume' });
}
}

require('dotenv').config();

module.exports = async (req, res) => {
  try {
    const { firstName, lastName, jobTitle, phone, email, address, city, zipCode, state, country, summary, socials, publications, workExperience, education, skills } = req.body;

    // Insert into Resume table
    const resumeQuery = `
      INSERT INTO resume (first_name, last_name, job_title, phone, email, address, city, zip_code, state, country, summary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
    `;
    const resumeValues = [firstName, lastName, jobTitle, phone, email, address, city, zipCode, state, country, summary];
    const { rows: [{ id }] } = await req.db.query(resumeQuery, resumeValues);
    const resume_id = id

    // Insert into Socials table
    for (const social of socials) {
      await req.db.query('INSERT INTO socials (resume_id, id, link) VALUES ($1, $2, $3)', [resume_id, social.id, social.link]);
    }

    // Insert into Publications table
    for (const publication of publications) {
      await req.db.query('INSERT INTO publications (resume_id, id, link) VALUES ($1, $2, $3)', [resume_id, publication.id, publication.link]);
    }

    // Insert into WorkExperience table
    for (const experience of workExperience) {
      await req.db.query(`
        INSERT INTO work_experience (resume_id, id, position_title, company_name, location_type, city, country, start_date, end_date, currently_employed, job_description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [id, experience.id, experience.positionTitle, experience.companyName, experience.location.locationType, experience.location.city, experience.location.country, experience.startDate || null, experience.endDate || null, experience.currentlyEmployed, experience.jobDescription]);
    }

    // Insert into Education table
    for (const edu of education) {
      await req.db.query(`
        INSERT INTO education (resume_id, id, education_level, field_of_study, school_name, start_date, end_date, currently_studying)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [resume_id, edu.id, edu.educationLevel, edu.fieldOfStudy, edu.schoolName, edu.startDate || null, edu.endDate || null, edu.currentlyStudying]);
    }

    // Insert into Skills table
    for (const skill of skills) {
      await req.db.query('INSERT INTO skills (resume_id, id, skill_name, experience) VALUES ($1, $2, $3, $4)', [resume_id, skill.id, skill.skillName, skill.experience || null]);
    }

    return res.status(201).json({ success: true })

  } catch (error) {
    console.error('Error inserting resume:', error);
    res.status(500).json({ success: false, error: 'An error occurred while saving resume' });
}
}
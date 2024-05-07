require('dotenv').config();

module.exports = async (req, res) => {
    
    try {
      const { user_id } = req.user;
      const query = `
        SELECT 
            r.first_name AS "firstName",
            r.last_name AS "lastName",
            r.job_title AS "jobTitle",
            r.phone,
            r.email,
            r.address,
            r.city,
            r.zip_code AS "zipCode",
            r.state,
            r.country,
            r.summary,
            (
              SELECT json_agg(json_build_object(
                'id', s.id,
                'link', s.link
              )) 
              FROM socials s
              WHERE s.resume_id = r.id
            ) AS socials,
            (
              SELECT json_agg(json_build_object(
                'id', p.id,
                'link', p.link
            )) 
              FROM publications p
              WHERE p.resume_id = r.id
            ) AS publications,
            (
              SELECT json_agg(json_build_object(
                'id', w.id,
                'positionTitle', w.position_title,
                'companyName', w.company_name,
                'location', json_build_object(
                  'locationType', w.location_type,
                  'city', w.city,
                  'country', w.country
                ),
                'startDate', w.start_date,
                'endDate', w.end_date,
                'currentlyEmployed', w.currently_employed,
                'jobDescription', w.job_description
            ))
            FROM work_experience w 
            WHERE w.resume_id = r.id
            ) AS "workExperience",
            (
              SELECT json_agg(json_build_object(
                'id', e.id,
                'educationLevel', e.education_level,
                'fieldOfStudy', e.field_of_study,
                'schoolName', e.school_name,
                'startDate', e.start_date,
                'endDate', e.end_date,
                'currentlyStudying', e.currently_studying
            )) 
              FROM education e 
              WHERE e.resume_id = r.id
            ) AS education,
            (
              SELECT json_agg(json_build_object(
                'id', sk.id,
                'skillName', sk.skill_name,
                'experience', sk.experience
            )) 
              FROM skills sk
              WHERE sk.resume_id = r.id
            ) AS skills  
        FROM 
            resume r
        WHERE 
            r.user_id = $1
        GROUP BY 
          r.id
      `;
  
      const { rows } = await req.db.query(query, [user_id]);
      const data = rows[0]
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching resumes:', error);
      res.status(500).json('Internal Server Error');
    }
}
const express = require('express');
const db = require('../db');
const verifyToken = require('../middleware/auth');
const generateProjectId = require('../utils/generateProjectId');
const router = express.Router();

// 🔨 Create a new project
router.post('/', verifyToken, async (req, res) => {
  const { name, description, deadline, assignees } = req.body;
  const creatorId = req.user.id;

  console.log('🔸 New project request:', req.body);

  if (!name || !description || !deadline || !Array.isArray(assignees) || assignees.length === 0) {
    return res.status(400).json({ error: 'Missing fields: name, description, deadline, or assignees.' });
  }

  try {
    const projectId = await generateProjectId();

    db.query(
      'INSERT INTO projects (project_id, name, description, deadline, created_by) VALUES (?, ?, ?, ?, ?)',
      [projectId, name, description, deadline, creatorId],
      (err) => {
        if (err) {
          console.error('❌ Error inserting project:', err);
          return res.status(500).json({ error: 'DB error creating project.' });
        }

        db.query(
          `SELECT id FROM users WHERE username IN (?)`,
          [assignees],
          (err2, users) => {
            if (err2) {
              console.error('❌ Error fetching assignee user IDs:', err2);
              return res.status(500).json({ error: 'DB error with assignees.' });
            }

            const assignmentValues = users.map(u => [projectId, u.id]);

            db.query(
              'INSERT INTO project_assignments (project_id, user_id) VALUES ?',
              [assignmentValues],
              (err3) => {
                if (err3) {
                  console.error('❌ Error assigning users to project:', err3);
                  return res.status(500).json({ error: 'Failed to assign users.' });
                }

                console.log(`✅ Project ${projectId} created by user ${req.user.username}`);
                res.json({ success: true, project_id: projectId, message: 'Project created and assigned.' });
              }
            );
          }
        );
      }
    );
  } catch (e) {
    console.error('🔥 Error in project creation:', e);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 📄 Get all projects (paginated)
router.get('/', verifyToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = [10, 50].includes(parseInt(req.query.limit)) ? parseInt(req.query.limit) : 10;
  const offset = (page - 1) * limit;

  console.log(`🔸 Fetching project list (page ${page}, limit ${limit})`);

  const query = `
    SELECT 
      p.project_id,
      p.name,
      p.description,
      p.deadline,
      p.created_at,
      u.username AS assignee
    FROM projects p
    LEFT JOIN project_assignments pa ON p.project_id = pa.project_id
    LEFT JOIN users u ON pa.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.query(query, [limit, offset], (err, results) => {
    if (err) {
      console.error('❌ Error fetching projects:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const grouped = {};
    for (const row of results) {
      if (!grouped[row.project_id]) {
        grouped[row.project_id] = {
          project_id: row.project_id,
          name: row.name,
          description: row.description,
          deadline: row.deadline,
          created_at: row.created_at,
          assignees: []
        };
      }
      if (row.assignee) {
        grouped[row.project_id].assignees.push(row.assignee);
      }
    }

    const output = Object.values(grouped);

    console.log(`✅ Returned ${output.length} project(s)`);
    res.json({ success: true, page, limit, projects: output });
  });
});

// 📌 Get one project by ID
router.get('/:project_id', verifyToken, (req, res) => {
  const { project_id } = req.params;

  console.log(`🔸 Fetching project: ${project_id}`);

  const query = `
    SELECT 
      p.project_id,
      p.name,
      p.description,
      p.deadline,
      p.created_at,
      creator.username AS created_by,
      assignee.username AS assignee
    FROM projects p
    LEFT JOIN users creator ON p.created_by = creator.id
    LEFT JOIN project_assignments pa ON pa.project_id = p.project_id
    LEFT JOIN users assignee ON pa.user_id = assignee.id
    WHERE p.project_id = ?
  `;

  db.query(query, [project_id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching project:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const first = results[0];
    const response = {
      project_id: first.project_id,
      name: first.name,
      description: first.description,
      deadline: first.deadline,
      created_at: first.created_at,
      created_by: first.created_by,
      assignees: results
        .filter(row => row.assignee !== null)
        .map(row => row.assignee)
    };

    console.log(`✅ Loaded project ${project_id}`);
    res.json({ success: true, project: response });
  });
});


// ✏️ Update project (creator only)
router.put('/:project_id', verifyToken, (req, res) => {
  const { project_id } = req.params;
  const { name, description, deadline, assignees } = req.body;
  const userId = req.user.id;

  console.log(`🔸 Update request for ${project_id} by user ${userId}`);

  if (!name || !description || !deadline || !Array.isArray(assignees)) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  db.query('SELECT * FROM projects WHERE project_id = ? AND created_by = ?', [project_id, userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (results.length === 0) return res.status(403).json({ error: 'Unauthorized or project not found' });

    db.query('UPDATE projects SET name = ?, description = ?, deadline = ? WHERE project_id = ?', [name, description, deadline, project_id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Error updating project' });

      db.query('DELETE FROM project_assignments WHERE project_id = ?', [project_id], (err3) => {
        if (err3) return res.status(500).json({ error: 'Error clearing old assignments' });

        db.query('SELECT id FROM users WHERE username IN (?)', [assignees], (err4, users) => {
          if (err4) return res.status(500).json({ error: 'Error fetching user IDs' });

          const assignments = users.map(u => [project_id, u.id]);

          db.query('INSERT INTO project_assignments (project_id, user_id) VALUES ?', [assignments], (err5) => {
            if (err5) return res.status(500).json({ error: 'Error assigning users' });

            console.log(`✅ Project ${project_id} updated`);
            res.json({ success: true, message: 'Project updated' });
          });
        });
      });
    });
  });
});

// 🗑️ Delete project (creator only)
router.delete('/:project_id', verifyToken, (req, res) => {
  const { project_id } = req.params;
  const userId = req.user.id;

  console.log(`🔸 Delete request for ${project_id} by user ${userId}`);

  db.query('SELECT * FROM projects WHERE project_id = ? AND created_by = ?', [project_id, userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (results.length === 0) return res.status(403).json({ error: 'Unauthorized or project not found' });

    db.query('DELETE FROM project_assignments WHERE project_id = ?', [project_id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Error deleting assignments' });

      db.query('DELETE FROM projects WHERE project_id = ?', [project_id], (err3) => {
        if (err3) return res.status(500).json({ error: 'Error deleting project' });

        console.log(`✅ Project ${project_id} deleted`);
        res.json({ success: true, message: 'Project deleted' });
      });
    });
  });
});

// 💬 Send message to project chat
router.post('/:project_id/chat', verifyToken, (req, res) => {
  const { project_id } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  console.log(`💬 New chat message in ${project_id} from user ${userId}`);

  if (!message) {
    console.warn('⚠️ Missing message body');
    return res.status(400).json({ error: 'Message is required.' });
  }

  db.query(
    'INSERT INTO project_messages (project_id, user_id, message) VALUES (?, ?, ?)',
    [project_id, userId, message],
    (err) => {
      if (err) {
        console.error('❌ Error inserting message:', err);
        return res.status(500).json({ error: 'Failed to send message.' });
      }

      console.log(`✅ Message added to project ${project_id} chat`);
      res.json({ success: true, message: 'Message sent.' });
    }
  );
});

// 📜 Get all chat messages for a project
router.get('/:project_id/chat', verifyToken, (req, res) => {
  const { project_id } = req.params;

  console.log(`🔎 Fetching chat for project ${project_id}`);

  db.query(
    `
    SELECT m.message, m.timestamp, u.username
    FROM project_messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.project_id = ?
    ORDER BY m.timestamp ASC
    `,
    [project_id],
    (err, results) => {
      if (err) {
        console.error('❌ Error fetching chat messages:', err);
        return res.status(500).json({ error: 'Failed to load messages.' });
      }

      console.log(`✅ Loaded ${results.length} message(s) for ${project_id}`);
      res.json({ success: true, chat: results });
    }
  );
});


module.exports = router;

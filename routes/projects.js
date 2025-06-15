const express = require('express');
const db = require('../db');
const verifyToken = require('../middleware/auth');
const generateProjectId = require('../utils/generateProjectId');
const router = express.Router();
const webpush = require('web-push');



// =============================================================
// ======================= 📁 PROJECT ROUTES ====================
// =============================================================

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

// =============================================================
// ===================== 💬 PROJECT CHAT ========================
// =============================================================

// 💬 Send message to project chat and notify subscribed users
router.post('/:project_id/chat', verifyToken, (req, res) => {
  const { project_id } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  console.log(`💬 New chat message in ${project_id} from user ${userId}`);

  if (!message) {
    console.warn('⚠️ Missing message body');
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Insert chat message
  db.query(
    'INSERT INTO project_messages (project_id, user_id, message) VALUES (?, ?, ?)',
    [project_id, userId, message],
    (err) => {
      if (err) {
        console.error('❌ Error inserting message:', err);
        return res.status(500).json({ error: 'Failed to send message.' });
      }

      console.log(`✅ Message added to project ${project_id} chat`);

      // Fetch all push subscriptions for this project
      const subQuery = `
        SELECT endpoint, p256dh, auth 
        FROM push_subscriptions 
        WHERE project_id = ?
      `;

      db.query(subQuery, [project_id], (err, subscriptions) => {
        if (err) {
          console.error('❌ Error fetching push subscriptions:', err);
          return res.json({ success: true, message: 'Message sent (but push failed).' });
        }

        const payload = JSON.stringify({
          title: `📢 New message in ${project_id}`,
          body: message
        });

        subscriptions.forEach(sub => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          webpush.sendNotification(pushSubscription, payload).catch(err => {
            console.warn('⚠️ Push error:', err.statusCode, err.body);
          });
        });

        res.json({ success: true, message: 'Message sent and push triggered.' });
      });
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

// ✏️ Edit a chat message
router.put('/:project_id/chat/:message_id', verifyToken, (req, res) => {
  const { project_id, message_id } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  console.log(`✏️ Edit chat message ${message_id} by user ${userId} in ${project_id}`);

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message content required.' });
  }

  // First, check if the user owns this message
  db.query(
    'SELECT * FROM project_chat WHERE id = ? AND project_id = ? AND user_id = ?',
    [message_id, project_id, userId],
    (err, results) => {
      if (err) {
        console.error('❌ DB error during message lookup:', err);
        return res.status(500).json({ error: 'DB error' });
      }

      if (results.length === 0) {
        return res.status(403).json({ error: 'Unauthorized or message not found.' });
      }

      db.query(
        'UPDATE project_chat SET message = ?, edited_at = NOW() WHERE id = ?',
        [message, message_id],
        (err2) => {
          if (err2) {
            console.error('❌ DB error during message update:', err2);
            return res.status(500).json({ error: 'DB update error' });
          }

          console.log(`✅ Message ${message_id} updated`);
          res.json({ success: true, message: 'Message updated' });
        }
      );
    }
  );
});

// 🗑️ Delete a chat message
router.delete('/:project_id/chat/:message_id', verifyToken, (req, res) => {
  const { project_id, message_id } = req.params;
  const userId = req.user.id;

  console.log(`🗑️ Delete chat message ${message_id} from project ${project_id} by user ${userId}`);

  // Only allow deletion if user is the author
  db.query(
    'SELECT * FROM project_chat WHERE id = ? AND project_id = ? AND user_id = ?',
    [message_id, project_id, userId],
    (err, results) => {
      if (err) {
        console.error('❌ DB error on chat lookup:', err);
        return res.status(500).json({ error: 'DB error' });
      }

      if (results.length === 0) {
        return res.status(403).json({ error: 'Unauthorized or message not found.' });
      }

      db.query(
        'DELETE FROM project_chat WHERE id = ?',
        [message_id],
        (err2) => {
          if (err2) {
            console.error('❌ DB error on chat delete:', err2);
            return res.status(500).json({ error: 'Could not delete message' });
          }

          console.log(`✅ Message ${message_id} deleted`);
          res.json({ success: true, message: 'Message deleted' });
        }
      );
    }
  );
});

// =============================================================
// ===================== ✅ PROJECT TASKS =======================
// =============================================================

// ✅ Create a new task
router.post('/:project_id/tasks', verifyToken, (req, res) => {
  const { project_id } = req.params;
  const { description } = req.body;
  const userId = req.user.id;

  if (!description) {
    return res.status(400).json({ error: 'Description is required.' });
  }

  db.query(
    `INSERT INTO project_tasks (project_id, description, created_by)
     VALUES (?, ?, ?)`,
    [project_id, description, userId],
    (err) => {
      if (err) {
        console.error('❌ Error creating task:', err);
        return res.status(500).json({ error: 'Failed to create task.' });
      }

      console.log(`✅ Task created in ${project_id} by user ${userId}`);
      res.json({ success: true, message: 'Task created.' });
    }
  );
});

// 📋 Get all tasks for a project
router.get('/:project_id/tasks', verifyToken, (req, res) => {
  const { project_id } = req.params;

  db.query(
    `SELECT t.*, u.username AS created_by_name, d.username AS done_by_name
     FROM project_tasks t
     JOIN users u ON t.created_by = u.id
     LEFT JOIN users d ON t.done_by = d.id
     WHERE t.project_id = ?
     ORDER BY t.created_at ASC`,
    [project_id],
    (err, results) => {
      if (err) {
        console.error('❌ Error fetching tasks:', err);
        return res.status(500).json({ error: 'Failed to fetch tasks.' });
      }

      res.json({ success: true, tasks: results });
    }
  );
});

// ✅ Mark task as done
router.put('/:project_id/tasks/:task_id/done', verifyToken, (req, res) => {
  const { project_id, task_id } = req.params;
  const userId = req.user.id;

  db.query(
    `UPDATE project_tasks
     SET is_done = TRUE, done_by = ?, done_at = NOW()
     WHERE id = ? AND project_id = ?`,
    [userId, task_id, project_id],
    (err) => {
      if (err) {
        console.error('❌ Error marking task as done:', err);
        return res.status(500).json({ error: 'Failed to mark task as done.' });
      }

      console.log(`✅ Task ${task_id} marked as done by user ${userId}`);
      res.json({ success: true, message: 'Task completed.' });
    }
  );
});
// ✏️ Edit task description
router.put('/:project_id/tasks/:task_id', verifyToken, (req, res) => {
  const { project_id, task_id } = req.params;
  const { description } = req.body;
  const userId = req.user.id;

  if (!description || description.trim() === '') {
    return res.status(400).json({ error: 'Description is required.' });
  }

  // Only creator of the task can edit
  db.query(
    `SELECT * FROM project_tasks WHERE id = ? AND project_id = ? AND created_by = ?`,
    [task_id, project_id, userId],
    (err, results) => {
      if (err) {
        console.error('❌ DB error on edit lookup:', err);
        return res.status(500).json({ error: 'DB error' });
      }

      if (results.length === 0) {
        return res.status(403).json({ error: 'Unauthorized or task not found.' });
      }

      db.query(
        `UPDATE project_tasks SET description = ? WHERE id = ?`,
        [description, task_id],
        (err2) => {
          if (err2) {
            console.error('❌ DB error on edit:', err2);
            return res.status(500).json({ error: 'Failed to update task.' });
          }

          console.log(`✅ Task ${task_id} edited by user ${userId}`);
          res.json({ success: true, message: 'Task updated.' });
        }
      );
    }
  );
});

// 🗑️ Delete task
router.delete('/:project_id/tasks/:task_id', verifyToken, (req, res) => {
  const { project_id, task_id } = req.params;
  const userId = req.user.id;

  // Only creator of the task can delete
  db.query(
    `SELECT * FROM project_tasks WHERE id = ? AND project_id = ? AND created_by = ?`,
    [task_id, project_id, userId],
    (err, results) => {
      if (err) {
        console.error('❌ DB error on delete lookup:', err);
        return res.status(500).json({ error: 'DB error' });
      }

      if (results.length === 0) {
        return res.status(403).json({ error: 'Unauthorized or task not found.' });
      }

      db.query(
        `DELETE FROM project_tasks WHERE id = ?`,
        [task_id],
        (err2) => {
          if (err2) {
            console.error('❌ DB error on delete:', err2);
            return res.status(500).json({ error: 'Failed to delete task.' });
          }

          console.log(`✅ Task ${task_id} deleted by user ${userId}`);
          res.json({ success: true, message: 'Task deleted.' });
        }
      );
    }
  );
});



module.exports = router;

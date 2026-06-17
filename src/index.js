require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const db = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/health', (req, res) => res.json({ status: 'ok', version: '9.0.0', ts: new Date() }));

app.get('/api/brain/status', async (req, res) => {
  try {
    const [goals, tasks, agents, delegations, memories] = await Promise.all([
      db.query("SELECT COUNT(*) FROM projects WHERE status='active'"),
      db.query("SELECT COUNT(*) FROM tasks WHERE status NOT IN ('completed','failed')"),
      db.query("SELECT COUNT(DISTINCT assigned_agent) FROM tasks WHERE assigned_agent IS NOT NULL"),
      db.query("SELECT COUNT(*) FROM delegations WHERE status IN ('assigned','working')"),
      db.query("SELECT COUNT(*) FROM memories"),
    ]);
    res.json({
      activeGoals: parseInt(goals.rows[0].count),
      activeTasks: parseInt(tasks.rows[0].count),
      activeAgents: parseInt(agents.rows[0].count),
      pendingDelegations: parseInt(delegations.rows[0].count),
      memoryEntries: parseInt(memories.rows[0].count),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/memory/store', async (req, res) => {
  const { content, memory_type, project_id, business_id, importance_score, agent_id } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO memories (content, memory_type, project_id, business_id, importance_score, agent_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [content, memory_type || 'fact', project_id, business_id, importance_score || 5, agent_id]
    );
    await db.query(`INSERT INTO events (event_type, payload) VALUES ('MEMORY_STORED', $1)`, [JSON.stringify({ memory_id: r.rows[0].id })]);
    res.json({ success: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/memory/search', async (req, res) => {
  const { q, limit = 10 } = req.query;
  try {
    const r = await db.query(
      `SELECT id, content, memory_type, importance_score FROM memories WHERE ($1::text IS NULL OR content ILIKE '%' || $1 || '%') ORDER BY importance_score DESC LIMIT $2`,
      [q || null, parseInt(limit)]
    );
    res.json({ results: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects', async (req, res) => { const r = await db.query('SELECT * FROM projects ORDER BY created_at DESC'); res.json(r.rows); });
app.post('/api/projects', async (req, res) => {
  const { name, business_id, goals } = req.body;
  const r = await db.query('INSERT INTO projects (name, business_id, goals) VALUES ($1,$2,$3) RETURNING *', [name, business_id, JSON.stringify(goals || [])]);
  res.json(r.rows[0]);
});

app.get('/api/tasks', async (req, res) => { const r = await db.query('SELECT * FROM tasks ORDER BY priority DESC, created_at DESC'); res.json(r.rows); });
app.post('/api/tasks', async (req, res) => {
  const { title, description, project_id, business_id, assigned_agent, priority } = req.body;
  const r = await db.query(`INSERT INTO tasks (title, description, project_id, business_id, assigned_agent, priority) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [title, description, project_id, business_id, assigned_agent, priority || 5]);
  await db.query(`INSERT INTO events (event_type, payload) VALUES ('TASK_CREATED', $1)`, [JSON.stringify({ task_id: r.rows[0].id, title })]);
  res.json(r.rows[0]);
});

app.get('/api/delegations', async (req, res) => { const r = await db.query(`SELECT d.*, t.title as task_title FROM delegations d LEFT JOIN tasks t ON d.task_id = t.id ORDER BY d.created_at DESC`); res.json(r.rows); });
app.get('/api/knowledge-graph', async (req, res) => { const r = await db.query('SELECT * FROM knowledge_graph ORDER BY created_at DESC LIMIT 100'); res.json(r.rows); });
app.post('/api/knowledge-graph', async (req, res) => {
  const { entity_a, relationship, entity_b, business_id } = req.body;
  const r = await db.query('INSERT INTO knowledge_graph (entity_a, relationship, entity_b, business_id) VALUES ($1,$2,$3,$4) RETURNING *', [entity_a, relationship, entity_b, business_id]);
  res.json(r.rows[0]);
});

app.get('/api/system-health', async (req, res) => {
  try { await db.query('SELECT 1'); res.json({ db: 'ok', status: 'healthy', version: '9.0.0' }); }
  catch (e) { res.status(500).json({ db: 'error', error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`JARVIS OS v9.0 running on :${PORT}`));

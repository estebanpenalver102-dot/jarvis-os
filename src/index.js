require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
db.on('error', (err) => console.error('DB pool error:', err.message));

// OpenRouter = primary reasoning (free nex-n2-pro), OpenAI = fallback
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || 'placeholder',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://jarvis.openroad-autos.com',
    'X-Title': 'JARVIS OS',
  },
});
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function executivePlanner(prompt, context = '') {
  const messages = [
    { role: 'system', content: `You are JARVIS ExecutivePlanner. Analyze tasks and return structured JSON plans. Memory context:\n${context}` },
    { role: 'user', content: prompt },
  ];
  try {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'placeholder') {
      const res = await openrouter.chat.completions.create({ model: 'nex-agi/nex-n2-pro:free', messages, max_tokens: 1024 });
      return { source: 'openrouter/nex-n2-pro', result: res.choices[0].message.content };
    }
  } catch (e) { console.error('OpenRouter error:', e.message); }
  if (openai) {
    try {
      const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages, max_tokens: 1024 });
      return { source: 'openai/gpt-4o-mini', result: res.choices[0].message.content };
    } catch (e) { console.error('OpenAI error:', e.message); }
  }
  return { source: 'none', result: null, error: 'No AI provider configured' };
}

app.get('/health', (req, res) => res.json({ status: 'ok', version: '9.0.0', ts: new Date() }));

app.get('/api/system-health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    res.json({ db: 'ok', status: 'healthy', version: '9.0.0', tables: tables.rows.map(r => r.table_name), ai_provider: process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'placeholder' ? 'openrouter/nex-n2-pro' : (process.env.OPENAI_API_KEY ? 'openai' : 'none') });
  } catch (e) { res.status(500).json({ db: 'error', error: e.message }); }
});

app.get('/api/brain/status', async (req, res) => {
  try {
    const [goals, tasks, delegations, memories] = await Promise.all([
      db.query("SELECT COUNT(*) FROM projects WHERE status='active'"),
      db.query("SELECT COUNT(*) FROM tasks WHERE status NOT IN ('completed','failed')"),
      db.query("SELECT COUNT(*) FROM delegations WHERE status IN ('assigned','working')"),
      db.query('SELECT COUNT(*) FROM memories'),
    ]);
    res.json({ activeGoals: parseInt(goals.rows[0].count), activeTasks: parseInt(tasks.rows[0].count), pendingDelegations: parseInt(delegations.rows[0].count), memoryEntries: parseInt(memories.rows[0].count), aiProvider: process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'placeholder' ? 'openrouter/nex-n2-pro' : 'none' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/brain/analyze', async (req, res) => {
  const { task, business_id } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });
  try {
    const mem = await db.query(`SELECT content, memory_type FROM memories WHERE ($1::uuid IS NULL OR business_id = $1::uuid) ORDER BY importance_score DESC LIMIT 5`, [business_id || null]);
    const context = mem.rows.map(r => `[${r.memory_type}] ${r.content}`).join('\n');
    res.json(await executivePlanner(`Analyze and return JSON: {complexity,requiresDelegation,estimatedSteps,recommendedAgent,subtasks,reasoning}. Task: ${task}`, context));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/memory/store', async (req, res) => {
  const { content, memory_type, project_id, business_id, importance_score, agent_id, metadata } = req.body;
  try {
    const r = await db.query(`INSERT INTO memories (content,memory_type,project_id,business_id,importance_score,agent_id,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [content, memory_type||'fact', project_id, business_id, importance_score||5, agent_id, JSON.stringify(metadata||{})]);
    await db.query(`INSERT INTO events (event_type,payload) VALUES ('MEMORY_STORED',$1)`, [JSON.stringify({memory_id:r.rows[0].id,memory_type,preview:content.slice(0,100)})]);
    res.json({ success: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/memory/search', async (req, res) => {
  const { q, limit=10, business_id, memory_type } = req.query;
  try {
    const r = await db.query(`SELECT id,content,memory_type,importance_score,last_accessed,agent_id FROM memories WHERE ($1::text IS NULL OR content ILIKE '%'||$1||'%') AND ($2::uuid IS NULL OR business_id=$2::uuid) AND ($3::text IS NULL OR memory_type=$3) ORDER BY importance_score DESC, last_accessed DESC LIMIT $4`, [q||null, business_id||null, memory_type||null, parseInt(limit)]);
    if (r.rows.length) await db.query('UPDATE memories SET last_accessed=NOW() WHERE id=ANY($1)', [r.rows.map(x=>x.id)]);
    res.json({ results: r.rows, count: r.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects', async (req, res) => { try { res.json((await db.query('SELECT * FROM projects ORDER BY created_at DESC')).rows); } catch(e){res.status(500).json({error:e.message});} });
app.post('/api/projects', async (req, res) => {
  const { name, business_id, goals, milestones } = req.body;
  try {
    const r = await db.query('INSERT INTO projects (name,business_id,goals,milestones) VALUES ($1,$2,$3,$4) RETURNING *', [name, business_id, JSON.stringify(goals||[]), JSON.stringify(milestones||[])]);
    await db.query(`INSERT INTO events (event_type,payload) VALUES ('GOAL_UPDATED',$1)`, [JSON.stringify({project_id:r.rows[0].id,name})]);
    res.json(r.rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/goals', async (req, res) => {
  try {
    const r = await db.query(`SELECT p.id,p.name,p.goals,p.status,p.created_at,COUNT(t.id) as total_tasks,COUNT(CASE WHEN t.status='completed' THEN 1 END) as completed_tasks FROM projects p LEFT JOIN tasks t ON t.project_id=p.id GROUP BY p.id ORDER BY p.created_at DESC`);
    res.json(r.rows);
  } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/tasks', async (req, res) => {
  const {status,agent} = req.query;
  try {
    const r = await db.query(`SELECT t.*,p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id=p.id WHERE ($1::text IS NULL OR t.status=$1) AND ($2::text IS NULL OR t.assigned_agent=$2) ORDER BY t.priority DESC,t.created_at DESC`, [status||null, agent||null]);
    res.json(r.rows);
  } catch(e){res.status(500).json({error:e.message});}
});
app.post('/api/tasks', async (req, res) => {
  const {title,description,project_id,business_id,assigned_agent,priority,parent_task_id}=req.body;
  try {
    const r=await db.query(`INSERT INTO tasks (title,description,project_id,business_id,assigned_agent,priority,parent_task_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[title,description,project_id,business_id,assigned_agent,priority||5,parent_task_id]);
    await db.query(`INSERT INTO events (event_type,payload) VALUES ('TASK_CREATED',$1)`,[JSON.stringify({task_id:r.rows[0].id,title,assigned_agent})]);
    res.json(r.rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/delegations', async (req, res) => { try { res.json((await db.query('SELECT d.*,t.title as task_title FROM delegations d LEFT JOIN tasks t ON d.task_id=t.id ORDER BY d.created_at DESC')).rows); } catch(e){res.status(500).json({error:e.message});} });
app.post('/api/delegations', async (req, res) => {
  const {task_id,agent_name}=req.body;
  try {
    const r=await db.query('INSERT INTO delegations (task_id,agent_name) VALUES ($1,$2) RETURNING *',[task_id,agent_name]);
    await db.query(`INSERT INTO events (event_type,payload) VALUES ('AGENT_ASSIGNED',$1)`,[JSON.stringify({task_id,agent_name})]);
    res.json(r.rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/executions', async (req, res) => { try { res.json((await db.query('SELECT e.*,t.title as task_title FROM execution_history e LEFT JOIN tasks t ON e.task_id=t.id ORDER BY e.started_at DESC LIMIT 50')).rows); } catch(e){res.status(500).json({error:e.message});} });

app.get('/api/knowledge-graph', async (req, res) => { try { res.json((await db.query('SELECT * FROM knowledge_graph ORDER BY created_at DESC LIMIT 200')).rows); } catch(e){res.status(500).json({error:e.message});} });
app.post('/api/knowledge-graph', async (req, res) => {
  const {entity_a,relationship,entity_b,business_id}=req.body;
  try { res.json((await db.query('INSERT INTO knowledge_graph (entity_a,relationship,entity_b,business_id) VALUES ($1,$2,$3,$4) RETURNING *',[entity_a,relationship,entity_b,business_id])).rows[0]); } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/agents', async (req, res) => {
  try {
    const r=await db.query(`SELECT assigned_agent as name,COUNT(*) as total,COUNT(CASE WHEN status='completed' THEN 1 END) as completed FROM tasks WHERE assigned_agent IS NOT NULL GROUP BY assigned_agent`);
    const defined=['executive','developer','research','operations','sales','marketing','project_manager'];
    res.json(defined.map(n=>{ const row=r.rows.find(a=>a.name===n)||{}; return {name:n,total:parseInt(row.total||0),completed:parseInt(row.completed||0)}; }));
  } catch(e){res.status(500).json({error:e.message});}
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log(`JARVIS OS v9.0 | OpenRouter: ${process.env.OPENROUTER_API_KEY&&process.env.OPENROUTER_API_KEY!=='placeholder'?'nex-n2-pro':'not set'} | :${PORT}`));

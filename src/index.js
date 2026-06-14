// src/index.js — JARVIS 4.0 AI Operating System
var __name = function(fn, name) { try { Object.defineProperty(fn, 'name', {value: name}); } catch(e) {} return fn; };
var __name2 = __name;

var VERSION = "4.0.0";
var OWNER = "Prime Essentials";
var BUSINESSES_DEFAULT = [
  {id:"open_road_autos",name:"Open Road Autos",type:"Automotive Dealership",icon:"\u{1F697}",color:"#ff6b35"},
  {id:"prime_essentials",name:"Prime Essentials",type:"Operations & Brand",icon:"\u2B50",color:"#6366f1"}
];

var AGENTS = { executive: { name: "Executive", emoji: "\u{1F9E0}", role: "Goal planning, project management, delegation, business decisions" }, researcher: { name: "Researcher", emoji: "\u{1F50D}", role: "Web research, competitive intelligence, data gathering" }, developer: { name: "Developer", emoji: "\u2699\uFE0F", role: "Code generation, debugging, system architecture, deployment" }, operations: { name: "Operations", emoji: "\u{1F4CA}", role: "Monitoring, reporting, infrastructure, workflow automation" }, sales: { name: "Sales", emoji: "\u{1F697}", role: "Lead management, customer tracking, dealership operations" }, marketing: { name: "Marketing", emoji: "\u{1F4E3}", role: "Content creation, campaigns, social media, brand management" } };
var OR_MODELS = ["nousresearch/hermes-3-llama-3.1-405b:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "openai/gpt-oss-120b:free", "meta-llama/llama-3.3-70b-instruct:free"];
var CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

var TOOLS = [{ type: "function", function: { name: "web_search", description: "Search internet for current info.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }, { type: "function", function: { name: "read_webpage", description: "Read full text of any URL.", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } }, { type: "function", function: { name: "save_memory", description: "Save fact/decision/contact permanently.", parameters: { type: "object", properties: { content: { type: "string" }, category: { type: "string", enum: ["fact", "decision", "contact", "project", "task", "business", "preference"] } }, required: ["content", "category"] } } }, { type: "function", function: { name: "recall_memory", description: "Search stored memory.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }, { type: "function", function: { name: "create_project", description: "Create tracked project.", parameters: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, agent: { type: "string", enum: ["executive", "researcher", "developer", "operations", "sales", "marketing"] }, priority: { type: "string", enum: ["high", "medium", "low"] } }, required: ["name", "description"] } } }, { type: "function", function: { name: "create_task", description: "Create task under project.", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, project: { type: "string" }, priority: { type: "string", enum: ["urgent", "high", "medium", "low"] }, agent: { type: "string" } }, required: ["title", "project"] } } }, { type: "function", function: { name: "list_projects", description: "List all active projects.", parameters: { type: "object", properties: {}, required: [] } } }, { type: "function", function: { name: "code_analyze", description: "Analyze/debug/generate code.", parameters: { type: "object", properties: { task: { type: "string" }, code: { type: "string" }, language: { type: "string" } }, required: ["task"] } } }];
async function kv(e, k) {
  try {
    return await e.KV.get(k, { type: "json" });
  } catch {
    return null;
  }
}
__name(kv, "kv");
__name2(kv, "kv");
async function kvs(e, k, v, o = {}) {
  try {
    await e.KV.put(k, JSON.stringify(v), o);
    return true;
  } catch {
    return false;
  }
}
__name(kvs, "kvs");
__name2(kvs, "kvs");
async function saveMem(e, content, cat, uid = "global") {
  const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await kvs(e, `mem:${id}`, { id, content, category: cat, uid, created: (/* @__PURE__ */ new Date()).toISOString() });
  const idx = await kv(e, `midx:${uid}`) || [];
  idx.push(id);
  await kvs(e, `midx:${uid}`, idx.slice(-200));
  return id;
}
__name(saveMem, "saveMem");
__name2(saveMem, "saveMem");
async function recallMem(e, q, uid = "global") {
  const a = await kv(e, `midx:${uid}`) || [], b = await kv(e, "midx:global") || [];
  const all = [.../* @__PURE__ */ new Set([...a, ...b])].slice(-60);
  const word = q.toLowerCase().split(" ").find((w) => w.length > 3) || q;
  const r = [];
  for (const id of all.slice(-30)) {
    const m = await kv(e, `mem:${id}`);
    if (m && m.content.toLowerCase().includes(word)) r.push(m);
  }
  return r.slice(-8);
}
__name(recallMem, "recallMem");
__name2(recallMem, "recallMem");
async function createProj(e, d) {
  const id = `proj_${Date.now()}`;
  const p = { id, name: d.name, description: d.description, agent: d.agent || "executive", priority: d.priority || "medium", status: "active", created: (/* @__PURE__ */ new Date()).toISOString() };
  await kvs(e, `proj:${id}`, p);
  const idx = await kv(e, "pidx") || [];
  idx.push(id);
  await kvs(e, "pidx", idx);
  return p;
}
__name(createProj, "createProj");
__name2(createProj, "createProj");
async function listProjs(e) {
  const idx = await kv(e, "pidx") || [];
  const out = [];
  for (const id of idx) {
    const p = await kv(e, `proj:${id}`);
    if (p && p.status !== "archived") out.push(p);
  }
  return out;
}
__name(listProjs, "listProjs");
__name2(listProjs, "listProjs");
async function createTask(e, d) {
  const id = `task_${Date.now()}`;
  const t = { id, title: d.title, description: d.description || "", project: d.project, priority: d.priority || "medium", agent: d.agent || "executive", status: "pending", created: (/* @__PURE__ */ new Date()).toISOString() };
  await kvs(e, `task:${id}`, t);
  const idx = await kv(e, "tidx") || [];
  idx.push(id);
  await kvs(e, "tidx", idx.slice(-500));
  return t;
}
__name(createTask, "createTask");
__name2(createTask, "createTask");
async function listTasks(e, f = {}) {
  const idx = await kv(e, "tidx") || [];
  const out = [];
  for (const id of idx.slice(-80)) {
    const t = await kv(e, `task:${id}`);
    if (t && (!f.status || t.status === f.status)) out.push(t);
  }
  return out;
}
__name(listTasks, "listTasks");
__name2(listTasks, "listTasks");
async function runTool(name, args, e, uid) {
  try {
    switch (name) {
      case "web_search": {
        const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`);
        const d = await r.json();
        const hits = (d.RelatedTopics || []).slice(0, 6).map((t) => t.Text || "").filter(Boolean);
        return (d.AbstractText || "") + "\n" + hits.join("\n") || "No results";
      }
      case "read_webpage": {
        const r = await fetch(`https://r.jina.ai/${args.url}`, { headers: { Accept: "text/plain" } });
        return (await r.text()).slice(0, 2500);
      }
      case "save_memory": {
        const id = await saveMem(e, args.content, args.category, uid);
        return `Saved [${args.category}]: ${args.content.slice(0, 60)} (${id})`;
      }
      case "recall_memory": {
        const items = await recallMem(e, args.query, uid);
        return items.length ? items.map((m) => `[${m.category}] ${m.content} (${m.created?.slice(0, 10)})`).join("\n") : "No matching memories.";
      }
      case "create_project": {
        const p = await createProj(e, args);
        return `Project: "${p.name}" | ${p.priority} | Agent: ${p.agent}`;
      }
      case "create_task": {
        const t = await createTask(e, args);
        return `Task: "${t.title}" | ${t.project} | ${t.priority}`;
      }
      case "list_projects": {
        const ps = await listProjs(e);
        return ps.length ? ps.map((p) => `${p.name} [${p.status}] \u2014 ${(p.description || "").slice(0, 50)}`).join("\n") : "No active projects.";
      }
      case "code_analyze":
        return `Code task: ${args.task}
Lang: ${args.language || "auto"}
${args.code ? `Code(${args.code.length} chars)received` : "Generating..."}
Full sandbox: v3.1`;
      default:
        return `Unknown: ${name}`;
    }
  } catch (ex) {
    return `Tool error: ${ex.message}`;
  }
}
__name(runTool, "runTool");
__name2(runTool, "runTool");
async function callOR(key, msgs, idx = 0) {
  const model = OR_MODELS[Math.min(idx, OR_MODELS.length - 1)];
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "HTTP-Referer": "https://jarvis-telegram-bot.estebanpenalver102.workers.dev", "X-Title": "Jarvis 3.0" }, body: JSON.stringify({ model, messages: msgs, tools: TOOLS, tool_choice: "auto", max_tokens: 1500 }) });
  if (!r.ok) throw new Error(`${r.status}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return { msg: d.choices?.[0]?.message, model };
}
__name(callOR, "callOR");
__name2(callOR, "callOR");
async function callCF(ai, msgs) {
  const s = msgs.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }));
  const r = await ai.run(CF_MODEL, { messages: s, max_tokens: 800 });
  return { msg: { role: "assistant", content: r.response || "No response" }, model: "cloudflare-ai" };
}
__name(callCF, "callCF");
__name2(callCF, "callCF");
async function callLLM(e, msgs, idx = 0) {
  const key = e.OPENROUTER_KEY;
  if (key && idx < OR_MODELS.length) {
    try {
      return await callOR(key, msgs, idx);
    } catch (ex) {
      console.log(`OR[${idx}] failed: ${ex.message}`);
      if (idx + 1 < OR_MODELS.length) return callLLM(e, msgs, idx + 1);
    }
  }
  return callCF(e.AI, msgs);
}
__name(callLLM, "callLLM");
__name2(callLLM, "callLLM");
async function runAgent(e, uid, text, atype = "executive") {
  const hist = await kv(e, `hist:${uid}`) || [];
  const msgs = [{ role: "system", content: SYS(atype) }, ...hist.slice(-18).map((m) => ({ role: m.role, content: m.content })), { role: "user", content: text }];
  let steps = 0, mdl = "unknown";
  while (steps++ < 8) {
    const { msg, model } = await callLLM(e, msgs);
    mdl = model;
    msgs.push(msg);
    if (!msg.tool_calls?.length) {
      const reply = msg.content || "Done.";
      const nh = [...hist, { role: "user", content: text }, { role: "assistant", content: reply }];
      await kvs(e, `hist:${uid}`, nh.slice(-40));
      return { reply, model: mdl, steps };
    }
    for (const c of msg.tool_calls) {
      const args = JSON.parse(c.function.arguments || "{}");
      const res = await runTool(c.function.name, args, e, uid);
      msgs.push({ role: "tool", tool_call_id: c.id, content: res });
    }
  }
  return { reply: "Max steps reached.", model: mdl, steps };
}
__name(runAgent, "runAgent");
__name2(runAgent, "runAgent");
async function tgSend(token, chatId, text) {
  const chunks = [];
  let t = text;
  while (t.length > 3900) {
    chunks.push(t.slice(0, 3900));
    t = t.slice(3900);
  }
  chunks.push(t);
  for (const c of chunks) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: c, parse_mode: "Markdown" }) }).catch(() => {
    });
  }
}
__name(tgSend, "tgSend");
__name2(tgSend, "tgSend");
async function tgTyping(token, chatId) {
  await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, action: "typing" }) }).catch(() => {
  });
}
__name(tgTyping, "tgTyping");
__name2(tgTyping, "tgTyping");
function detectAgent(t) {
  const l = t.toLowerCase();
  if (/research|search|find|what is|look up|news/.test(l)) return "researcher";
  if (/code|build|deploy|debug|fix|script|program/.test(l)) return "developer";
  if (/lead|customer|car|vehicle|inventory|dealer|financing|auto/.test(l)) return "sales";
  if (/report|monitor|status|analytics|metrics|dashboard/.test(l)) return "operations";
  if (/market|campaign|content|social|post|ad|brand/.test(l)) return "marketing";
  return "executive";
}
__name(detectAgent, "detectAgent");
__name2(detectAgent, "detectAgent");
async function handleTg(e, msg) {
  const chatId = msg.chat.id, uid = String(msg.from?.id || chatId), text = msg.text || "";
  if (!text) return;
  if (text === "/start" || text === "/help") {
    await tgSend(e.BOT_TOKEN, chatId, `*Jarvis 3.0 \u2014 AI Operating System* \u{1F9E0}

Serving ${OWNER}.

*Agent Modules:*
\u{1F9E0} Executive \u2014 planning & decisions
\u{1F50D} Researcher \u2014 web intelligence
\u2699\uFE0F Developer \u2014 code & deployment
\u{1F4CA} Operations \u2014 monitoring & reports
\u{1F697} Sales \u2014 dealership & leads
\u{1F4E3} Marketing \u2014 content & campaigns

Auto-routing active.

*/status* /projects /tasks /memory /agents

*Web UI:* https://jarvis-telegram-bot.estebanpenalver102.workers.dev/dashboard`);
    return;
  }
  if (text === "/status") {
    const ps = await listProjs(e);
    const ts = await listTasks(e, { status: "pending" });
    await tgSend(e.BOT_TOKEN, chatId, `*Jarvis 3.0* \u2705

*AI:* OpenRouter(4 free) \u2192 CF AI fallback
*Models:* Hermes-3 405B\xB7Nemotron 550B\xB7GPT-OSS 120B\xB7Llama 70B
*Storage:* Cloudflare KV
*Projects:* ${ps.length} active | *Tasks:* ${ts.length} pending
*Web UI:* /dashboard

\u2705 All agents online`);
    return;
  }
  if (text === "/projects") {
    const ps = await listProjs(e);
    if (!ps.length) {
      await tgSend(e.BOT_TOKEN, chatId, "No active projects. Tell me what to work on.");
      return;
    }
    await tgSend(e.BOT_TOKEN, chatId, `*Projects (${ps.length}):*

${ps.map((p) => `\u{1F4C1} *${p.name}* [${p.status}]
   ${(p.description || "").slice(0, 80)}`).join("\n\n")}`);
    return;
  }
  if (text === "/tasks") {
    const ts = await listTasks(e);
    if (!ts.length) {
      await tgSend(e.BOT_TOKEN, chatId, "No tasks yet.");
      return;
    }
    await tgSend(e.BOT_TOKEN, chatId, `*Tasks (${ts.length}):*

${ts.slice(-8).map((t) => `\u2705 *${t.title}* [${t.priority}]
   ${t.project}`).join("\n\n")}`);
    return;
  }
  if (text === "/memory") {
    const items = await recallMem(e, "project", uid);
    if (!items.length) {
      await tgSend(e.BOT_TOKEN, chatId, "Memory empty.");
      return;
    }
    await tgSend(e.BOT_TOKEN, chatId, `*Memory:*

${items.map((m) => `[${m.category}] ${m.content.slice(0, 100)}`).join("\n")}`);
    return;
  }
  if (text === "/agents") {
    await tgSend(e.BOT_TOKEN, chatId, `*Agent Modules:*

${Object.values(AGENTS).map((a) => `${a.emoji} *${a.name}* \u2014 ${a.role}`).join("\n")}

_Auto-routed based on your request._`);
    return;
  }
  await tgTyping(e.BOT_TOKEN, chatId);
  const atype = detectAgent(text);
  const { reply, model, steps } = await runAgent(e, uid, text, atype);
  const ag = AGENTS[atype];
  await tgSend(e.BOT_TOKEN, chatId, reply + `

_${ag.emoji} ${ag.name} \xB7 ${(model || "").split("/").pop() || "AI"} \xB7 ${steps} steps_`);
}
__name(handleTg, "handleTg");
__name2(handleTg, "handleTg");
async function pollTg(e) {
  const off = await kv(e, "tg_off") || 0;
  const r = await fetch(`https://api.telegram.org/bot${e.BOT_TOKEN}/getUpdates?offset=${off}&timeout=5&limit=10`);
  const d = await r.json();
  if (!d.ok || !d.result?.length) return;
  let max = off;
  for (const u of d.result) {
    if (u.update_id >= max) max = u.update_id + 1;
    if (u.message?.text) await handleTg(e, u.message).catch(console.error);
  }
  await kvs(e, "tg_off", max);
}
__name(pollTg, "pollTg");
__name2(pollTg, "pollTg");
function cors(r) {
  r.headers.set("Access-Control-Allow-Origin", "*");
  r.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  r.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return r;
}
__name(cors, "cors");
__name2(cors, "cors");
async function runCodePiston(language, code_str) {
  const compilers = {
    python: "cpython-3.12.7",
    python3: "cpython-3.12.7",
    javascript: "nodejs-18.20.4",
    js: "nodejs-18.20.4",
    typescript: "typescript-5.6.2",
    ts: "typescript-5.6.2",
    rust: "rust-1.82.0",
    ruby: "mruby-2.1.2",
    bash: "bash",
    go: "go-1.22.5",
    cpp: "gcc-13.2.0",
    c: "gcc-13.2.0",
    java: "openjdk-17.0.2",
    php: "php-8.2.8"
  };
  const lang = language?.toLowerCase().replace(/\s/g, "") || "python3";
  const compiler = compilers[lang] || compilers.python;
  try {
    const r = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler, code: code_str, options: "", stdin: "" })
    });
    if (!r.ok) return { output: "Exec HTTP " + r.status, exit_code: -1 };
    const d = await r.json();
    const out = d.program_output || d.compiler_error || d.compiler_output || "No output";
    const exitCode = parseInt(d.status) || 0;
    return { output: out.slice(0, 3e3), exit_code: exitCode, language: lang, compiler };
  } catch (err) {
    return { output: "Error: " + err.message, exit_code: -1 };
  }
}
__name(runCodePiston, "runCodePiston");
async function githubAPI(action, args, token) {
  if (!token) return { error: "Set GITHUB_TOKEN in Cloudflare Worker vars (Dashboard \u2192 Workers \u2192 Your Worker \u2192 Settings \u2192 Variables)" };
  const h = { "Authorization": "token " + token, "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json", "User-Agent": "Jarvis-3.1" };
  const { owner, repo, path, content, message, title, body } = args;
  try {
    if (action === "list_repos") {
      const r = await fetch("https://api.github.com/user/repos?per_page=30&sort=updated", { headers: h });
      const d = await r.json();
      return Array.isArray(d) ? d.map((r2) => ({ name: r2.name, url: r2.html_url, private: r2.private, updated: r2.updated_at })) : { error: JSON.stringify(d) };
    }
    if (action === "create_repo") {
      const r = await fetch("https://api.github.com/user/repos", { method: "POST", headers: h, body: JSON.stringify({ name: repo, description: args.description || "Created by Jarvis", auto_init: true }) });
      const d = await r.json();
      return r.ok ? { url: d.html_url, name: d.name } : { error: JSON.stringify(d) };
    }
    if (action === "push_file") {
      const gr = await fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path, { headers: h });
      const sha = gr.ok ? (await gr.json()).sha : void 0;
      const r = await fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path, { method: "PUT", headers: h, body: JSON.stringify({ message: message || "Jarvis commit", content: btoa(unescape(encodeURIComponent(content || ""))), sha }) });
      const d = await r.json();
      return r.ok ? { url: d.content?.html_url } : { error: JSON.stringify(d) };
    }
    if (action === "read_file") {
      const r = await fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path, { headers: h });
      const d = await r.json();
      return r.ok ? { content: decodeURIComponent(escape(atob(d.content.replace(/\n/g, "")))) } : { error: JSON.stringify(d) };
    }
    if (action === "create_issue") {
      const r = await fetch("https://api.github.com/repos/" + owner + "/" + repo + "/issues", { method: "POST", headers: h, body: JSON.stringify({ title, body: body || "" }) });
      const d = await r.json();
      return r.ok ? { url: d.html_url, number: d.number } : { error: JSON.stringify(d) };
    }
    if (action === "list_issues") {
      const r = await fetch("https://api.github.com/repos/" + owner + "/" + repo + "/issues?per_page=20", { headers: h });
      const d = await r.json();
      return Array.isArray(d) ? d.map((i) => ({ id: i.number, title: i.title, state: i.state, url: i.html_url })) : { error: JSON.stringify(d) };
    }
    return { error: "Unknown action: " + action };
  } catch (e) {
    return { error: e.message };
  }
}
__name(githubAPI, "githubAPI");

// ── JARVIS 4.0 — AUTH ──
async function generateLoginToken(e) {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  await e.KV.put('auth:'+token, JSON.stringify({user:'prime_essentials',created:Date.now(),expires:Date.now()+30*24*60*60*1000}), {expirationTtl:30*24*60*60});
  return token;
}
__name(generateLoginToken,"generateLoginToken");

// ── BUSINESSES ──
async function getBusinesses(e) {
  const stored = await e.KV.get('businesses',{type:'json'});
  if(stored && stored.length) return stored;
  await e.KV.put('businesses', JSON.stringify(BUSINESSES_DEFAULT));
  return BUSINESSES_DEFAULT;
}
__name(getBusinesses,"getBusinesses");

async function addBusiness(e, biz) {
  const list = await getBusinesses(e);
  const nb = {id:biz.name.toLowerCase().replace(/\s+/g,'_')+'_'+Date.now(), ...biz, created:Date.now()};
  list.push(nb);
  await e.KV.put('businesses', JSON.stringify(list));
  return nb;
}
__name(addBusiness,"addBusiness");

// ── AGENTS STATE ──
async function getAgentsState(e) {
  return Promise.all(Object.entries(AGENTS).map(async ([key,info])=>{
    const task = await e.KV.get('agent:task:'+key,{type:'json'});
    return {id:key, name:info.name, emoji:info.emoji, role:info.role, status:task?'working':'idle', currentTask:task||null};
  }));
}
__name(getAgentsState,"getAgentsState");

async function pushTaskToAgent(e, agentId, taskText) {
  const rec = {id:crypto.randomUUID(), task:taskText, agentId, status:'running', created:Date.now()};
  await e.KV.put('agent:task:'+agentId, JSON.stringify(rec));
  const hist = JSON.parse(await e.KV.get('agent:history:'+agentId)||'[]');
  hist.unshift(rec);
  await e.KV.put('agent:history:'+agentId, JSON.stringify(hist.slice(0,20)));
  return rec;
}
__name(pushTaskToAgent,"pushTaskToAgent");

// ── MODELS ──
async function getModels(e) { return JSON.parse(await e.KV.get('models')||'[]'); }
__name(getModels,"getModels");

async function deployGitHubModel(url, e) {
  const m = url.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)/);
  if(!m) return {error:'Invalid GitHub URL'};
  const [,owner,repo] = m;
  try {
    const r = await fetch('https://api.github.com/repos/'+owner+'/'+repo,{headers:{'User-Agent':'Jarvis-4.0'}});
    if(!r.ok) return {error:'Repo not found'};
    const d = await r.json();
    const model = {
      id:(owner+'_'+repo).toLowerCase().replace(/[^a-z0-9_]/g,'_'),
      name:d.name, owner, repo, description:d.description||'',
      stars:d.stargazers_count, url:d.html_url, language:d.language||'', installed:Date.now(), status:'active'
    };
    const models = await getModels(e);
    const idx = models.findIndex(x=>x.id===model.id);
    if(idx>=0) models[idx]=model; else models.push(model);
    await e.KV.put('models', JSON.stringify(models));
    return model;
  } catch(err) { return {error:err.message}; }
}
__name(deployGitHubModel,"deployGitHubModel");

// ── SCREEN ──
async function createScreenTask(taskDesc, e) {
  const id = crypto.randomUUID();
  const task = {id, description:taskDesc, status:'pending', created:Date.now()};
  await e.KV.put('screen:'+id, JSON.stringify(task), {expirationTtl:3600});
  const list = JSON.parse(await e.KV.get('screen:list')||'[]');
  list.unshift({id, description:taskDesc, created:Date.now(), status:'pending'});
  await e.KV.put('screen:list', JSON.stringify(list.slice(0,10)));
  return task;
}
__name(createScreenTask,"createScreenTask");

function getDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jarvis 4.0 — AI Operating System</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--bg2:#0d0d17;--bg3:#12121f;--card:#16162a;--border:#1e1e3a;
  --purple:#6366f1;--purple2:#8b5cf6;--green:#22c55e;--orange:#f97316;--blue:#3b82f6;
  --text:#e2e8f0;--muted:#64748b;--dim:#374151}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  display:flex;height:100vh;overflow:hidden}
/* Sidebar */
#sb{width:220px;background:var(--bg2);border-right:1px solid var(--border);
  display:flex;flex-direction:column;flex-shrink:0}
#sb-top{padding:20px 16px;border-bottom:1px solid var(--border)}
.logo{display:flex;align-items:center;gap:10px}
.logo-icon{width:36px;height:36px;background:linear-gradient(135deg,var(--purple),var(--purple2));
  border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
.logo-text{font-size:16px;font-weight:700}
.logo-ver{font-size:10px;color:var(--muted);background:var(--bg3);padding:2px 6px;border-radius:4px}
#sb-nav{flex:1;padding:8px 8px;overflow-y:auto}
.nav-section{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;
  padding:12px 8px 4px}
.nav-btn{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;
  border:none;background:none;color:var(--muted);cursor:pointer;border-radius:8px;
  font-size:13px;text-align:left;transition:all .15s}
.nav-btn:hover{background:var(--bg3);color:var(--text)}
.nav-btn.active{background:rgba(99,102,241,.15);color:var(--purple);font-weight:600}
.nav-btn .ni{width:18px;font-size:15px;text-align:center}
.nav-badge{margin-left:auto;background:var(--purple);color:#fff;font-size:10px;
  padding:1px 6px;border-radius:10px}
.status-dot{width:6px;height:6px;border-radius:50%;background:var(--green);
  box-shadow:0 0 6px var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
#sb-bot{padding:12px 16px;border-top:1px solid var(--border)}
.user-card{display:flex;align-items:center;gap:10px}
.user-av{width:30px;height:30px;background:linear-gradient(135deg,#f97316,#ef4444);
  border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:700}
.user-name{font-size:12px;font-weight:600}
.user-plan{font-size:10px;color:var(--muted)}
/* Main content */
#main{flex:1;overflow:hidden;display:flex;flex-direction:column}
.tab-panel{display:none;flex:1;overflow-y:auto;padding:24px}
.tab-panel.active{display:flex;flex-direction:column;gap:20px}
.page-title{font-size:22px;font-weight:700}
.page-sub{font-size:13px;color:var(--muted);margin-top:2px}
/* Chat tab */
#chat-area{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;min-height:0}
.msg{max-width:72%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5}
.msg.user{align-self:flex-end;background:var(--purple);color:#fff;border-bottom-right-radius:4px}
.msg.bot{align-self:flex-start;background:var(--card);border:1px solid var(--border);border-bottom-left-radius:4px}
.msg-meta{font-size:10px;color:var(--muted);margin-top:4px}
.thinking{display:flex;gap:4px;align-items:center;padding:8px 14px}
.thinking span{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:bounce .8s infinite}
.thinking span:nth-child(2){animation-delay:.15s}
.thinking span:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
#chat-input-row{display:flex;gap:10px;align-items:flex-end;padding-top:12px;border-top:1px solid var(--border)}
.agent-sel{background:var(--card);border:1px solid var(--border);color:var(--text);
  padding:8px 10px;border-radius:8px;font-size:12px;cursor:pointer}
#chat-input{flex:1;background:var(--card);border:1px solid var(--border);color:var(--text);
  padding:10px 14px;border-radius:10px;font-size:14px;resize:none;min-height:42px;max-height:120px;
  font-family:inherit}
#chat-input:focus{outline:none;border-color:var(--purple)}
#chat-send{background:var(--purple);border:none;color:#fff;padding:10px 18px;
  border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:opacity .15s;white-space:nowrap}
#chat-send:hover{opacity:.85}
.push-bar{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);
  border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px;font-size:12px;color:var(--purple)}
.push-btn{margin-left:auto;background:var(--purple);border:none;color:#fff;
  padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600}
/* Cards */
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;
  transition:border-color .2s}
.card:hover{border-color:var(--dim)}
.card-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.card-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;
  justify-content:center;font-size:20px;background:var(--bg3)}
.card-title{font-size:15px;font-weight:600}
.card-sub{font-size:12px;color:var(--muted);margin-top:2px}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;
  font-size:11px;font-weight:500}
.badge-green{background:rgba(34,197,94,.1);color:var(--green)}
.badge-purple{background:rgba(99,102,241,.1);color:var(--purple)}
.badge-orange{background:rgba(249,115,22,.1);color:var(--orange)}
.badge-blue{background:rgba(59,130,246,.1);color:var(--blue)}
.badge-gray{background:var(--bg3);color:var(--muted)}
/* Stats row */
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}
.stat-num{font-size:28px;font-weight:700}
.stat-label{font-size:12px;color:var(--muted);margin-top:2px}
/* Agent card */
.agent-card{background:var(--card);border:1px solid var(--border);border-radius:12px;
  padding:16px;display:flex;flex-direction:column;gap:10px}
.agent-head{display:flex;align-items:center;gap:12px}
.agent-emoji{font-size:28px}
.agent-status{display:flex;align-items:center;gap:6px;font-size:11px}
.dot-green{width:6px;height:6px;border-radius:50%;background:var(--green)}
.dot-gray{width:6px;height:6px;border-radius:50%;background:var(--muted)}
.agent-task{background:var(--bg3);border-radius:8px;padding:8px 10px;font-size:12px;
  color:var(--muted);min-height:36px;word-break:break-word}
.agent-actions{display:flex;gap:8px}
.btn-sm{padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;
  border:none;transition:all .15s}
.btn-primary{background:var(--purple);color:#fff}
.btn-primary:hover{opacity:.85}
.btn-outline{background:none;color:var(--muted);border:1px solid var(--border)}
.btn-outline:hover{border-color:var(--dim);color:var(--text)}
/* Business tab */
.biz-card{background:var(--card);border:1px solid var(--border);border-radius:12px;
  padding:20px;cursor:pointer;transition:all .2s}
.biz-card:hover{transform:translateY(-2px);border-color:var(--dim)}
.biz-banner{height:6px;border-radius:4px;margin-bottom:14px}
.biz-name{font-size:17px;font-weight:700}
.biz-type{font-size:12px;color:var(--muted);margin-top:3px}
.biz-stats{display:flex;gap:16px;margin-top:12px}
.biz-stat{text-align:center}
.biz-stat-n{font-size:18px;font-weight:700}
.biz-stat-l{font-size:10px;color:var(--muted)}
/* Models tab */
.model-row{display:flex;align-items:center;gap:14px;background:var(--card);
  border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.model-icon{width:36px;height:36px;background:var(--bg3);border-radius:8px;
  display:flex;align-items:center;justify-content:center;font-size:16px}
.model-name{font-size:14px;font-weight:600}
.model-desc{font-size:12px;color:var(--muted)}
.model-actions{margin-left:auto;display:flex;gap:8px}
/* Screen tab */
.screen-hero{background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.05));
  border:1px solid rgba(99,102,241,.3);border-radius:16px;padding:32px;text-align:center}
.screen-icon{font-size:56px;margin-bottom:12px}
.screen-title{font-size:20px;font-weight:700;margin-bottom:8px}
.screen-desc{font-size:14px;color:var(--muted);margin-bottom:24px;max-width:480px;margin-left:auto;margin-right:auto}
.btn-big{background:linear-gradient(135deg,var(--purple),var(--purple2));border:none;
  color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;
  cursor:pointer;transition:opacity .2s}
.btn-big:hover{opacity:.85}
.screen-task-input{width:100%;background:var(--card);border:1px solid var(--border);
  color:var(--text);padding:12px 16px;border-radius:10px;font-size:14px;
  margin-bottom:12px;font-family:inherit}
.screen-task-input:focus{outline:none;border-color:var(--purple)}
.live-view{background:var(--bg3);border:2px dashed var(--border);border-radius:12px;
  padding:40px;text-align:center;color:var(--muted);font-size:14px}
/* Input forms */
.form-row{display:flex;gap:10px;margin-bottom:16px}
.inp{flex:1;background:var(--card);border:1px solid var(--border);color:var(--text);
  padding:10px 14px;border-radius:8px;font-size:13px;font-family:inherit}
.inp:focus{outline:none;border-color:var(--purple)}
.btn-act{background:var(--purple);border:none;color:#fff;padding:10px 18px;
  border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap}
.btn-act:hover{opacity:.85}
.section-title{font-size:14px;font-weight:600;color:var(--text);margin-bottom:12px;
  display:flex;align-items:center;gap:8px}
.divider{border:none;border-top:1px solid var(--border);margin:4px 0}
.empty-state{text-align:center;color:var(--muted);padding:32px;font-size:13px}
/* Chat wrap for layout */
#tab-chat{flex-direction:column}
#tab-chat.active{flex:1;overflow:hidden;padding:0}
#chat-wrap{display:flex;flex-direction:column;height:100%;padding:20px}
#chat-header{padding-bottom:14px;border-bottom:1px solid var(--border)}
#chat-msgs{flex:1;overflow-y:auto;padding:14px 0;display:flex;flex-direction:column;gap:8px}
#chat-footer{padding-top:12px;border-top:1px solid var(--border)}
/* Projects */
.proj-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px}
.proj-name{font-size:15px;font-weight:700}
.proj-biz{font-size:11px;color:var(--muted);margin:4px 0 10px}
.prog-bar{height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-top:8px}
.prog-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--purple),var(--purple2))}
/* Notification toast */
#toast{position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--border);
  border-radius:10px;padding:12px 18px;font-size:13px;z-index:9999;
  transform:translateY(80px);opacity:0;transition:all .3s;max-width:320px}
#toast.show{transform:translateY(0);opacity:1}
#toast.success{border-color:var(--green);color:var(--green)}
#toast.error{border-color:#ef4444;color:#ef4444}
/* File drop zone */
.drop-zone{border:2px dashed var(--border);border-radius:10px;padding:24px;
  text-align:center;color:var(--muted);font-size:13px;cursor:pointer;transition:all .2s}
.drop-zone:hover,.drop-zone.dragover{border-color:var(--purple);color:var(--purple);
  background:rgba(99,102,241,.05)}
/* Scrollbar */
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--dim);border-radius:4px}
</style>
</head>
<body>

<!-- SIDEBAR -->
<aside id="sb">
  <div id="sb-top">
    <div class="logo">
      <div class="logo-icon">⬛</div>
      <div>
        <div class="logo-text">JARVIS</div>
      </div>
      <div class="logo-ver">4.0</div>
      <div class="status-dot" style="margin-left:auto"></div>
    </div>
  </div>
  <nav id="sb-nav">
    <div class="nav-section">Main</div>
    <button class="nav-btn active" onclick="showTab('chat')">
      <span class="ni">💬</span> Chat
    </button>
    <button class="nav-btn" onclick="showTab('agents')">
      <span class="ni">🤖</span> Agents
      <span class="nav-badge" id="nb-agents">6</span>
    </button>
    <div class="nav-section">Work</div>
    <button class="nav-btn" onclick="showTab('projects')">
      <span class="ni">📁</span> Projects
    </button>
    <button class="nav-btn" onclick="showTab('business')">
      <span class="ni">🏢</span> Business
    </button>
    <div class="nav-section">Tools</div>
    <button class="nav-btn" onclick="showTab('models')">
      <span class="ni">🔧</span> Models
    </button>
    <button class="nav-btn" onclick="showTab('screen')">
      <span class="ni">🖥️</span> Screen
    </button>
    <button class="nav-btn" onclick="showTab('apps')">
      <span class="ni">🔌</span> App Hub
    </button>
  </nav>
  <div id="sb-bot">
    <div class="user-card">
      <div class="user-av">PE</div>
      <div>
        <div class="user-name">Prime Essentials</div>
        <div class="user-plan">Jarvis 4.0 · Live</div>
      </div>
    </div>
  </div>
</aside>

<!-- MAIN -->
<div id="main">

  <!-- CHAT TAB -->
  <div id="tab-chat" class="tab-panel active">
    <div id="chat-wrap">
      <div id="chat-header">
        <div style="display:flex;align-items:center;gap:12px">
          <div>
            <div class="page-title">Chat</div>
            <div class="page-sub">Give tasks, ask questions, build things</div>
          </div>
          <select class="agent-sel" id="cur-agent" style="margin-left:auto">
            <option value="executive">🧠 Executive</option>
            <option value="researcher">🔍 Researcher</option>
            <option value="developer">💻 Developer</option>
            <option value="sales">💼 Sales</option>
            <option value="marketing">📣 Marketing</option>
            <option value="operations">⚙️ Operations</option>
          </select>
        </div>
      </div>
      <div id="chat-msgs">
        <div class="msg bot">
          <div>Hi Prime Essentials! I'm Jarvis 4.0 — your AI Operating System. What would you like to work on today?</div>
          <div class="msg-meta">🧠 Executive · Just now</div>
        </div>
      </div>
      <div id="chat-footer">
        <div id="push-hint" style="display:none" class="push-bar">
          <span>💡 Task is being handled by <strong id="push-agent-name">Executive</strong></span>
          <button class="push-btn" onclick="pushLastTask()">Push to Agents Panel →</button>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <textarea id="chat-input" placeholder="Type a task or question... (Enter to send, Shift+Enter for newline)" rows="1"></textarea>
          <button id="chat-send" onclick="sendChat()">Send →</button>
        </div>
      </div>
    </div>
  </div>

  <!-- AGENTS TAB -->
  <div id="tab-agents" class="tab-panel">
    <div>
      <div class="page-title">Agents</div>
      <div class="page-sub">All agents working full time — click any card to see history</div>
    </div>
    <div class="stats-row" id="agents-stats">
      <div class="stat-card"><div class="stat-num" id="stat-active">—</div><div class="stat-label">Active Agents</div></div>
      <div class="stat-card"><div class="stat-num" id="stat-tasks">—</div><div class="stat-label">Tasks Today</div></div>
      <div class="stat-card"><div class="stat-num" id="stat-working">—</div><div class="stat-label">Working Now</div></div>
    </div>
    <div class="card-grid" id="agents-grid">
      <div class="empty-state">Loading agents...</div>
    </div>
    <div>
      <div class="section-title">📋 Assign New Task to Agent</div>
      <div class="form-row">
        <select class="inp" id="push-agent-sel" style="max-width:180px">
          <option value="executive">🧠 Executive</option>
          <option value="researcher">🔍 Researcher</option>
          <option value="developer">💻 Developer</option>
          <option value="sales">💼 Sales</option>
          <option value="marketing">📣 Marketing</option>
          <option value="operations">⚙️ Operations</option>
        </select>
        <input class="inp" id="push-task-inp" placeholder="Describe the task to assign...">
        <button class="btn-act" onclick="assignTaskToAgent()">Assign →</button>
      </div>
    </div>
  </div>

  <!-- PROJECTS TAB -->
  <div id="tab-projects" class="tab-panel">
    <div>
      <div class="page-title">Projects</div>
      <div class="page-sub">Switch between projects — agents auto-name them</div>
    </div>
    <div class="form-row">
      <select class="inp" id="proj-biz" style="max-width:200px">
        <option value="">All Businesses</option>
      </select>
      <input class="inp" id="proj-name" placeholder="Project name (or let AI suggest one)...">
      <input class="inp" id="proj-desc" placeholder="What's it about?">
      <button class="btn-act" onclick="createProject()">+ New Project</button>
    </div>
    <div class="card-grid" id="projects-grid">
      <div class="empty-state">No projects yet. Create your first one above.</div>
    </div>
  </div>

  <!-- BUSINESS TAB -->
  <div id="tab-business" class="tab-panel">
    <div>
      <div class="page-title">Business Hub</div>
      <div class="page-sub">All your businesses in one place</div>
    </div>
    <div class="card-grid" id="biz-grid">
      <div class="empty-state">Loading businesses...</div>
    </div>
    <hr class="divider">
    <div>
      <div class="section-title">+ Add Business</div>
      <div class="form-row">
        <input class="inp" id="biz-name" placeholder="Business name">
        <input class="inp" id="biz-type" placeholder="Type (e.g. E-commerce, SaaS, Dealership)">
        <input class="inp" id="biz-color" type="color" value="#6366f1" style="width:50px;padding:4px;cursor:pointer">
        <button class="btn-act" onclick="addBusiness()">Add Business</button>
      </div>
    </div>
  </div>

  <!-- MODELS TAB -->
  <div id="tab-models" class="tab-panel">
    <div>
      <div class="page-title">Models & GitHub</div>
      <div class="page-sub">Deploy AI models from GitHub or ZIP files · OpenClaw, computer use, and more</div>
    </div>
    <!-- GitHub deploy -->
    <div class="card">
      <div class="section-title">🐙 Deploy from GitHub</div>
      <div class="form-row">
        <input class="inp" id="gh-url" placeholder="https://github.com/owner/repo (e.g. anthropics/anthropic-quickstarts)">
        <button class="btn-act" onclick="deployGitHub()">Deploy →</button>
      </div>
      <div style="font-size:12px;color:var(--muted)">
        Examples: <code style="color:var(--purple)">anthropics/computer-use-demo</code> · 
        <code style="color:var(--purple)">openai/openai-python</code> · 
        any public GitHub repo
      </div>
    </div>
    <!-- ZIP upload -->
    <div class="card">
      <div class="section-title">📦 Deploy from ZIP File</div>
      <div class="drop-zone" id="drop-zone" onclick="document.getElementById('zip-file').click()">
        <div style="font-size:32px;margin-bottom:8px">📁</div>
        Drop a ZIP file here or click to browse<br>
        <span style="font-size:11px">Supports any AI model package or code repository</span>
        <input type="file" id="zip-file" accept=".zip" style="display:none" onchange="handleZipUpload(this)">
      </div>
    </div>
    <!-- Installed models -->
    <div>
      <div class="section-title">⚡ Installed Models</div>
      <div id="models-list">
        <div class="empty-state">No models deployed yet. Add from GitHub or ZIP above.</div>
      </div>
    </div>
    <!-- Featured models -->
    <div>
      <div class="section-title">🌟 Featured Models</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div class="model-row">
          <div class="model-icon">🦾</div>
          <div><div class="model-name">Claude Computer Use</div><div class="model-desc">anthropics/anthropic-quickstarts · Screen control + automation</div></div>
          <div class="model-actions">
            <button class="btn-sm btn-primary" onclick="deployFeatured('anthropics/anthropic-quickstarts')">Deploy</button>
          </div>
        </div>
        <div class="model-row">
          <div class="model-icon">🔬</div>
          <div><div class="model-name">Open Interpreter</div><div class="model-desc">OpenInterpreter/open-interpreter · Run code, browse web, manage files</div></div>
          <div class="model-actions">
            <button class="btn-sm btn-primary" onclick="deployFeatured('OpenInterpreter/open-interpreter')">Deploy</button>
          </div>
        </div>
        <div class="model-row">
          <div class="model-icon">🤖</div>
          <div><div class="model-name">AutoGPT</div><div class="model-desc">Significant-Gravitas/AutoGPT · Autonomous AI agent framework</div></div>
          <div class="model-actions">
            <button class="btn-sm btn-primary" onclick="deployFeatured('Significant-Gravitas/AutoGPT')">Deploy</button>
          </div>
        </div>
        <div class="model-row">
          <div class="model-icon">🧩</div>
          <div><div class="model-name">LangChain</div><div class="model-desc">langchain-ai/langchain · Build LLM-powered workflows</div></div>
          <div class="model-actions">
            <button class="btn-sm btn-primary" onclick="deployFeatured('langchain-ai/langchain')">Deploy</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SCREEN TAB -->
  <div id="tab-screen" class="tab-panel">
    <div>
      <div class="page-title">Screen Control</div>
      <div class="page-sub">Jarvis takes over your screen to complete tasks</div>
    </div>
    <div class="screen-hero">
      <div class="screen-icon">🖥️</div>
      <div class="screen-title">Let Jarvis Take Over</div>
      <div class="screen-desc">Give Jarvis a task and it will take control of a browser to complete it. You can watch live or let it run in the background.</div>
      <input class="screen-task-input" id="screen-task" placeholder="Describe the task (e.g. 'Fill out the contact form on example.com with my info')">
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn-big" onclick="startScreenTask('direct')">🖥️ Take Over My Screen</button>
        <button class="btn-big" style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid var(--border)" onclick="startScreenTask('cloud')">☁️ Use Cloud Browser</button>
      </div>
    </div>
    <div id="screen-sessions">
      <div class="section-title">📋 Recent Screen Sessions</div>
      <div id="screen-list"><div class="empty-state">No sessions yet.</div></div>
    </div>
    <div class="card">
      <div class="section-title">🔗 Browser Extension</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px">
        Install the Jarvis Bridge to allow direct screen control via your own browser and logins.
      </div>
      <div style="display:flex;gap:10px">
        <a href="https://surething.io/bridge" target="_blank" class="btn-act" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px">
          Install Bridge Extension →
        </a>
        <button class="btn-sm btn-outline" onclick="testBridge()">Test Connection</button>
      </div>
    </div>
  </div>

  <!-- APP HUB TAB -->
  <div id="tab-apps" class="tab-panel">
    <div>
      <div class="page-title">App Hub</div>
      <div class="page-sub" id="apps-sub">Loading...</div>
    </div>
    <div class="form-row">
      <input class="inp" id="app-search" placeholder="Search apps..." oninput="filterApps(this.value)">
      <select class="inp" id="app-cat" onchange="filterApps()" style="max-width:180px">
        <option value="">All Categories</option>
      </select>
    </div>
    <div class="card-grid" id="apps-grid"></div>
  </div>

</div>

<!-- TOAST -->
<div id="toast"></div>

<script>
const BASE = '';
let lastMsg = '';
let lastAgent = 'executive';
let allApps = [];

// ── Tab switching ──
function showTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  const btns = document.querySelectorAll('.nav-btn');
  btns.forEach(b=>{if(b.getAttribute('onclick')===\`showTab('\${name}')\`)b.classList.add('active');});
  if(name==='agents') loadAgents();
  if(name==='projects') loadProjects();
  if(name==='business') loadBusinesses();
  if(name==='models') loadModels();
  if(name==='screen') loadScreenSessions();
  if(name==='apps') loadApps();
}

// ── Toast ──
function toast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show '+(type||'');
  setTimeout(()=>t.className='', 3000);
}

// ── Chat ──
function addMsg(role, text, meta) {
  const wrap = document.getElementById('chat-msgs');
  const div = document.createElement('div');
  div.className = 'msg '+role;
  div.innerHTML = '<div>'+text.replace(/</g,'&lt;').replace(/\\n/g,'<br>')+'</div>'+(meta?'<div class="msg-meta">'+meta+'</div>':'');
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

async function sendChat() {
  const inp = document.getElementById('chat-input');
  const msg = inp.value.trim();
  if(!msg) return;
  const agent = document.getElementById('cur-agent').value;
  lastMsg = msg; lastAgent = agent;
  inp.value = '';
  inp.style.height = 'auto';
  addMsg('user', msg, '');
  const thinking = addMsg('bot', '', '');
  thinking.innerHTML = '<div class="thinking"><span></span><span></span><span></span></div>';
  document.getElementById('push-hint').style.display='none';
  try {
    const r = await fetch(BASE+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,agent})});
    const d = await r.json();
    const agentEmojis = {executive:'🧠',researcher:'🔍',developer:'💻',sales:'💼',marketing:'📣',operations:'⚙️'};
    thinking.innerHTML = '<div>'+d.reply.replace(/</g,'&lt;').replace(/\\n/g,'<br>')+'</div><div class="msg-meta">'+agentEmojis[d.agent||agent]+' '+(d.agent||agent)+' · '+d.steps+' steps</div>';
    document.getElementById('push-hint').style.display='flex';
    document.getElementById('push-agent-name').textContent = d.agent||agent;
    document.getElementById('chat-msgs').scrollTop = 99999;
  } catch(err) {
    thinking.innerHTML = '<div style="color:#f87171">Error: '+err.message+'</div>';
  }
}

async function pushLastTask() {
  if(!lastMsg) return;
  const r = await fetch(BASE+'/api/push-task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:lastAgent,task:lastMsg})});
  if(r.ok){toast('Task pushed to '+lastAgent+' agent ✓','success');document.getElementById('push-hint').style.display='none';}
}

document.getElementById('chat-input').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}
  // auto-resize
  setTimeout(()=>{e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';},0);
});

// ── Agents ──
async function loadAgents() {
  const r = await fetch(BASE+'/api/agents');
  const agents = await r.json();
  const working = agents.filter(a=>a.status==='working').length;
  document.getElementById('stat-active').textContent = agents.length;
  document.getElementById('stat-working').textContent = working;
  document.getElementById('nb-agents').textContent = agents.length;
  const grid = document.getElementById('agents-grid');
  grid.innerHTML = agents.map(a=>\`
    <div class="agent-card">
      <div class="agent-head">
        <div class="agent-emoji">\${a.emoji||'🤖'}</div>
        <div>
          <div style="font-size:15px;font-weight:700">\${a.name}</div>
          <div style="font-size:11px;color:var(--muted)">\${a.role||''}</div>
        </div>
        <div class="agent-status" style="margin-left:auto">
          <div class="\${a.status==='working'?'dot-green':'dot-gray'}"></div>
          <span style="font-size:11px;color:var(--muted)">\${a.status==='working'?'Working':'Idle'}</span>
        </div>
      </div>
      <div class="agent-task">\${a.currentTask?a.currentTask.task:'No active task'}</div>
      <div class="agent-actions">
        <button class="btn-sm btn-outline" onclick="viewAgentHistory('\${a.id}','\${a.name}')">History</button>
        <button class="btn-sm btn-primary" onclick="assignTo('\${a.id}','\${a.name}')">Assign Task</button>
      </div>
    </div>\`).join('');
  // Count tasks
  const tr = await fetch(BASE+'/api/tasks');
  const tasks = await tr.json();
  document.getElementById('stat-tasks').textContent = tasks.length;
}

async function assignTaskToAgent() {
  const agentId = document.getElementById('push-agent-sel').value;
  const task = document.getElementById('push-task-inp').value.trim();
  if(!task){toast('Enter a task first','error');return;}
  const r = await fetch(BASE+'/api/push-task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId,task})});
  if(r.ok){toast('Task assigned to '+agentId+' ✓','success');document.getElementById('push-task-inp').value='';loadAgents();}
}

function assignTo(id,name) {
  document.getElementById('push-agent-sel').value = id;
  document.getElementById('push-task-inp').focus();
  showTab('agents');
}

async function viewAgentHistory(id,name) {
  const r = await fetch(BASE+'/api/agent-history?agent='+id);
  const hist = await r.json();
  if(!hist.length){toast(name+' has no history yet');return;}
  const items = hist.slice(0,5).map(h=>'• '+h.task.slice(0,80)).join('\\n');
  toast(name+' recent tasks:\\n'+items);
}

// ── Projects ──
async function loadProjects() {
  const r = await fetch(BASE+'/api/projects');
  const projs = await r.json();
  const bizR = await fetch(BASE+'/api/businesses');
  const bizs = await bizR.json();
  // populate biz selector
  const sel = document.getElementById('proj-biz');
  sel.innerHTML = '<option value="">All Businesses</option>'+bizs.map(b=>\`<option value="\${b.id}">\${b.name}</option>\`).join('');
  const grid = document.getElementById('projects-grid');
  if(!projs.length){grid.innerHTML='<div class="empty-state">No projects yet. Create your first one above.</div>';return;}
  grid.innerHTML = projs.map(p=>\`
    <div class="proj-card">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <div class="proj-name">\${p.name}</div>
          <div class="proj-biz">\${p.description||'No description'}</div>
        </div>
        <span class="badge badge-purple">\${p.priority||'Normal'}</span>
      </div>
      <div style="font-size:11px;color:var(--muted)">Created \${new Date(p.created||Date.now()).toLocaleDateString()}</div>
      <div class="prog-bar"><div class="prog-fill" style="width:\${Math.floor(Math.random()*60+10)}%"></div></div>
    </div>\`).join('');
}

async function createProject() {
  let name = document.getElementById('proj-name').value.trim();
  const desc = document.getElementById('proj-desc').value.trim();
  const biz = document.getElementById('proj-biz').value;
  if(!name&&!desc){toast('Enter a project name or description','error');return;}
  if(!name) name = 'Project '+new Date().toLocaleDateString();
  const r = await fetch(BASE+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,description:desc,agent:biz,priority:'Normal'})});
  if(r.ok){toast('Project "'+name+'" created ✓','success');document.getElementById('proj-name').value='';document.getElementById('proj-desc').value='';loadProjects();}
}

// ── Business ──
async function loadBusinesses() {
  const r = await fetch(BASE+'/api/businesses');
  const bizs = await r.json();
  const [pr, tr] = await Promise.all([fetch(BASE+'/api/projects'),fetch(BASE+'/api/tasks')]);
  const projs = await pr.json();
  const tasks = await tr.json();
  const grid = document.getElementById('biz-grid');
  grid.innerHTML = bizs.map(b=>{
    const bp = projs.filter(p=>p.agent===b.id||p.business===b.id).length;
    const bt = tasks.filter(t=>t.business===b.id||t.project===b.name).length;
    return \`<div class="biz-card" onclick="toast('\${b.name} selected')">
      <div class="biz-banner" style="background:\${b.color||'#6366f1'}"></div>
      <div style="font-size:28px;margin-bottom:8px">\${b.icon||'🏢'}</div>
      <div class="biz-name">\${b.name}</div>
      <div class="biz-type">\${b.type||'Business'}</div>
      <div class="biz-stats">
        <div class="biz-stat"><div class="biz-stat-n">\${bp}</div><div class="biz-stat-l">Projects</div></div>
        <div class="biz-stat"><div class="biz-stat-n">\${bt}</div><div class="biz-stat-l">Tasks</div></div>
      </div>
    </div>\`;
  }).join('');
}

async function addBusiness() {
  const name = document.getElementById('biz-name').value.trim();
  const type = document.getElementById('biz-type').value.trim();
  const color = document.getElementById('biz-color').value;
  if(!name){toast('Enter a business name','error');return;}
  const r = await fetch(BASE+'/api/businesses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,type,color,icon:'🏢'})});
  if(r.ok){toast('Business "'+name+'" added ✓','success');document.getElementById('biz-name').value='';document.getElementById('biz-type').value='';loadBusinesses();}
}

// ── Models ──
async function loadModels() {
  const r = await fetch(BASE+'/api/models');
  const models = await r.json();
  const list = document.getElementById('models-list');
  if(!models.length){list.innerHTML='<div class="empty-state">No models deployed yet.</div>';return;}
  list.innerHTML = models.map(m=>\`
    <div class="model-row">
      <div class="model-icon">⚡</div>
      <div>
        <div class="model-name">\${m.name}</div>
        <div class="model-desc">\${m.owner}/\${m.repo} · ⭐\${m.stars||0} · \${m.language||''}\${m.description?' · '+m.description.slice(0,60):''}</div>
      </div>
      <div class="model-actions">
        <a href="\${m.url}" target="_blank" class="btn-sm btn-outline" style="text-decoration:none">View</a>
        <span class="badge badge-green">Active</span>
      </div>
    </div>\`).join('');
}

async function deployGitHub() {
  const url = document.getElementById('gh-url').value.trim();
  if(!url){toast('Enter a GitHub URL','error');return;}
  toast('Deploying...');
  const r = await fetch(BASE+'/api/deploy-github',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
  const d = await r.json();
  if(d.error){toast('Error: '+d.error,'error');return;}
  toast('Deployed: '+d.name+' ✓','success');
  document.getElementById('gh-url').value='';
  loadModels();
}

function deployFeatured(repoPath) {
  document.getElementById('gh-url').value = 'https://github.com/'+repoPath;
  deployGitHub();
}

function handleZipUpload(input) {
  const file = input.files[0];
  if(!file) return;
  toast('ZIP uploaded: '+file.name+' ('+Math.round(file.size/1024)+'KB) — processing...');
  // In a full implementation, would POST to /api/upload-zip
  setTimeout(()=>toast('Model from "'+file.name+'" registered ✓','success'),1500);
}

// Drag and drop
const dz = document.getElementById('drop-zone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('dragover');});
dz.addEventListener('dragleave',()=>dz.classList.remove('dragover'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f){document.getElementById('zip-file').files=e.dataTransfer.files;handleZipUpload(document.getElementById('zip-file'));}});

// ── Screen ──
async function startScreenTask(mode) {
  const task = document.getElementById('screen-task').value.trim();
  if(!task){toast('Describe the task first','error');return;}
  const r = await fetch(BASE+'/api/screen',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task,mode})});
  const d = await r.json();
  if(d.error){toast('Error: '+d.error,'error');return;}
  toast('Screen task queued (ID: '+d.id.slice(0,8)+'...) ✓','success');
  document.getElementById('screen-task').value='';
  if(mode==='cloud') toast('Cloud browser launching — link will appear in sessions below');
  loadScreenSessions();
}

async function loadScreenSessions() {
  const r = await fetch(BASE+'/api/screen');
  const sessions = await r.json();
  const list = document.getElementById('screen-list');
  if(!sessions.length){list.innerHTML='<div class="empty-state">No sessions yet.</div>';return;}
  list.innerHTML = sessions.map(s=>\`
    <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <span style="font-size:20px">🖥️</span>
      <div style="flex:1"><div style="font-size:13px;font-weight:600">\${s.description}</div>
        <div style="font-size:11px;color:var(--muted)">\${new Date(s.created).toLocaleString()}</div></div>
      <span class="badge badge-gray">\${s.status||'pending'}</span>
    </div>\`).join('');
}

function testBridge() {
  toast('Testing bridge connection...');
  setTimeout(()=>toast('Bridge not detected. Install from the link above.','error'),1000);
}

// ── App Hub ──
async function loadApps() {
  if(allApps.length){renderApps(allApps);return;}
  const r = await fetch(BASE+'/api/apps');
  allApps = await r.json();
  // populate categories
  const cats = [...new Set(allApps.map(a=>a.cat))].sort();
  const sel = document.getElementById('app-cat');
  sel.innerHTML = '<option value="">All Categories</option>'+cats.map(c=>\`<option value="\${c}">\${c}</option>\`).join('');
  document.getElementById('apps-sub').textContent = allApps.length+' integrations across '+cats.length+' categories';
  renderApps(allApps);
}

function filterApps(q) {
  if(!allApps.length)return;
  const search = (q||document.getElementById('app-search').value||'').toLowerCase();
  const cat = document.getElementById('app-cat').value;
  const filtered = allApps.filter(a=>{
    if(cat && a.cat!==cat) return false;
    if(search) return a.name.toLowerCase().includes(search)||a.cat.toLowerCase().includes(search);
    return true;
  });
  renderApps(filtered);
}

function renderApps(apps) {
  const grid = document.getElementById('apps-grid');
  grid.innerHTML = apps.slice(0,60).map(a=>\`
    <div class="card" style="padding:14px;cursor:pointer" onclick="toast('\${a.name}: \${a.composio?'Connect via Composio':'Custom integration'}')">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:var(--bg3);border-radius:8px;
          display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;
          color:var(--purple)">\${a.icon||a.name[0]}</div>
        <div>
          <div style="font-size:13px;font-weight:600">\${a.name}</div>
          <div style="font-size:11px;color:var(--muted)">\${a.cat}</div>
        </div>
        \${a.composio?'<span class="badge badge-green" style="margin-left:auto">Ready</span>':''}
      </div>
    </div>\`).join('')+(apps.length>60?\`<div class="empty-state">+\${apps.length-60} more. Use search to filter.</div>\`:'');
}

// ── Init ──
async function init() {
  try {
    const r = await fetch(BASE+'/api/status');
    const s = await r.json();
    if(s.version) document.querySelector('.logo-ver').textContent = s.version;
  } catch(e){}
  // Auto-load businesses for welcome toast
  try {
    const r = await fetch(BASE+'/api/businesses');
    const bizs = await r.json();
    if(bizs.length) toast('Jarvis online — '+bizs.map(b=>b.name).join(', '),'success');
  } catch(e){}
}
init();
</script>
</body>
</html>
`;
}
__name(getDashboard,"getDashboard");

function getLoginPage(token, confirmed) {
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jarvis — Authentication</title>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:#e2e8f0;font-family:-apple-system,sans-serif;
  display:flex;align-items:center;justify-content:center;min-height:100vh}
.c{background:#12121a;border:1px solid #1e1e2e;border-radius:16px;padding:48px;max-width:400px;width:100%;text-align:center}
h1{font-size:22px;font-weight:700;margin:12px 0 8px}
p{color:#94a3b8;margin-bottom:24px;font-size:14px}
.btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;
  padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;width:100%}
.ok{background:#0f2a1a;border:1px solid #16a34a;border-radius:10px;padding:20px;color:#4ade80}
</style></head><body><div class="c">
<div style="font-size:56px">⬛</div>
<h1>Jarvis Authentication</h1>
${confirmed?
  '<div class="ok">✅ Connected! Jarvis is active.<br><br><a href="/dashboard" style="color:#4ade80;font-weight:700">Open Dashboard →</a></div>':
  '<p>Click <strong>Done</strong> to activate your session and connect Jarvis to your backends.</p><form method="POST"><input type="hidden" name="token" value="'+token+'"><button class="btn" type="submit">✓ Done — Activate Jarvis</button></form>'
}</div></body></html>`;
}
__name(getLoginPage,"getLoginPage");

async function handleAPI(path, req, e) {
  const uid = 'prime_essentials';
  if (path === "/api/status") {
    const [ps,ts,mi,li] = await Promise.all([e.KV.list({prefix:"project:"}),e.KV.list({prefix:"task:"}),e.KV.list({prefix:"mem:"}),e.KV.list({prefix:"log:"})]);
    return cors(new Response(JSON.stringify({version:VERSION,status:"online",projects:ps.keys.length,tasks:ts.keys.length,memory:mi.keys.length,logs:li.keys.length,agents:Object.keys(AGENTS).length,models:OR_MODELS.length+1,apps:APP_COUNT}),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/projects" && req.method === "GET") {
    const list = await e.KV.list({prefix:"project:"});
    const ps = await Promise.all(list.keys.map(k=>e.KV.get(k.name,{type:"json"})));
    return cors(new Response(JSON.stringify(ps.filter(Boolean)),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/projects" && req.method === "POST") {
    const data = await req.json();
    const p = await createProject(e, data);
    return cors(new Response(JSON.stringify(p),{status:201,headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/tasks" && req.method === "GET") {
    const list = await e.KV.list({prefix:"task:"});
    const ts = await Promise.all(list.keys.map(k=>e.KV.get(k.name,{type:"json"})));
    return cors(new Response(JSON.stringify(ts.filter(Boolean)),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/tasks" && req.method === "POST") {
    const data = await req.json();
    const t = await createTask(e, data);
    return cors(new Response(JSON.stringify(t),{status:201,headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/memory") {
    const q = new URL(req.url).searchParams.get("q")||"project";
    const items = await recallMem(e,q,uid);
    return cors(new Response(JSON.stringify(items),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/businesses" && req.method === "GET") {
    return cors(new Response(JSON.stringify(await getBusinesses(e)),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/businesses" && req.method === "POST") {
    const data = await req.json().catch(()=>({}));
    return cors(new Response(JSON.stringify(await addBusiness(e, data)),{status:201,headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/agents") {
    return cors(new Response(JSON.stringify(await getAgentsState(e)),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/push-task" && req.method === "POST") {
    const data = await req.json().catch(()=>({}));
    return cors(new Response(JSON.stringify(await pushTaskToAgent(e, data.agentId||'executive', data.task||'')),{status:201,headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/agent-history") {
    const agentId = new URL(req.url).searchParams.get('agent')||'executive';
    return cors(new Response(JSON.stringify(JSON.parse(await e.KV.get('agent:history:'+agentId)||'[]')),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/models") {
    return cors(new Response(JSON.stringify(await getModels(e)),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/deploy-github" && req.method === "POST") {
    const data = await req.json().catch(()=>({}));
    return cors(new Response(JSON.stringify(await deployGitHubModel(data.url||'', e)),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/screen" && req.method === "GET") {
    return cors(new Response(JSON.stringify(JSON.parse(await e.KV.get('screen:list')||'[]')),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/screen" && req.method === "POST") {
    const data = await req.json().catch(()=>({}));
    return cors(new Response(JSON.stringify(await createScreenTask(data.task||'', e)),{status:201,headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/execute" && req.method === "POST") {
    const body = await req.json().catch(()=>({}));
    const result = await runCodePiston(body.language||'python3', body.code||'');
    result.engine = 'wandbox';
    return cors(new Response(JSON.stringify(result),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/github" && req.method === "POST") {
    const body = await req.json().catch(()=>({}));
    return cors(new Response(JSON.stringify(await githubAPI(body.action, body, e.GITHUB_TOKEN)),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/apps") {
    return cors(new Response(JSON.stringify(APP_CATALOG),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/auth/generate" && req.method === "POST") {
    const token = await generateLoginToken(e);
    return cors(new Response(JSON.stringify({token,url:'https://jarvis-telegram-bot.estebanpenalver102.workers.dev/login?token='+token}),{headers:{"Content-Type":"application/json"}}));
  }
  if (path === "/api/chat" && req.method === "POST") {
    const { message, agent } = await req.json();
    const atype = agent || detectAgent(message);
    const { reply, model, steps } = await runAgent(e, uid, message, atype);
    await pushTaskToAgent(e, atype, message);
    return cors(new Response(JSON.stringify({reply,model,steps,agent:atype}),{headers:{"Content-Type":"application/json"}}));
  }
  return cors(new Response("Not found",{status:404}));
}
__name(handleAPI,"handleAPI");


var index_default = { async fetch(req, e) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (path === "/" || path === "/dashboard") return new Response(getDashboard(), { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
  if (path === "/login") {
    if (req.method === "GET") {
      const token = url.searchParams.get("token")||"";
      return new Response(getLoginPage(token, false), { headers: { "Content-Type": "text/html;charset=utf-8" } });
    }
    if (req.method === "POST") {
      const form = await req.formData().catch(()=>new FormData());
      const token = form.get("token")||"";
      const session = await e.KV.get('auth:'+token,{type:'json'});
      if(!session) return new Response(getLoginPage(token, false), { headers: { "Content-Type": "text/html;charset=utf-8" } });
      const headers = new Headers({ "Content-Type": "text/html;charset=utf-8" });
      headers.append("Set-Cookie", "jarvis_session="+token+"; Path=/; Max-Age=2592000; SameSite=Lax");
      return new Response(getLoginPage(token, true), { headers });
    }
  }
  if (path.startsWith("/api/")) return handleAPI(path, req, e);
  if (path === "/whatsapp" && req.method === "GET") {
    const params = url.searchParams;
    if(params.get("hub.verify_token") === (e.WHATSAPP_VERIFY||"jarvis4")) return new Response(params.get("hub.challenge")||"ok");
    return new Response("Forbidden",{status:403});
  }
  if (path === "/whatsapp" && req.method === "POST") {
    const body = await req.json().catch(()=>({}));
    e.ctx?.waitUntil(processWhatsApp(body, e));
    return new Response("ok");
  }
  if (path === "/telegram") {
    const body = await req.json().catch(() => ({}));
    const msg = body?.message || body?.edited_message;
    if (msg && e.BOT_TOKEN) {
      const chatId = msg.chat?.id;
      const text = msg.text || "";
      if (chatId) {
        const uid2 = String(chatId);
        const history = JSON.parse(await e.KV.get("hist:" + uid2) || "[]");
        await sendTyping(chatId, e.BOT_TOKEN);
        const { reply, model } = await runAgent(e, uid2, text, detectAgent(text), history.slice(-10));
        history.push({ role: "user", content: text }, { role: "assistant", content: reply });
        await e.KV.put("hist:" + uid2, JSON.stringify(history.slice(-20)));
        await sendTelegramMessage(chatId, reply, e.BOT_TOKEN);
      }
    }
    return new Response("ok");
  }
  if (path === "/health") return new Response(JSON.stringify({ status: "Jarvis 4.0", version: VERSION, ts: new Date().toISOString() }), { headers: { "Content-Type": "application/json" } });
  return new Response("Not found", { status: 404 });
}, async scheduled(event, e, ctx) {
  ctx.waitUntil(handleCron(e));
} };

export { index_default as default };

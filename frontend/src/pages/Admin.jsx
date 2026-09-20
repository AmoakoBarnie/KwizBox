import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api.js'

const ADMIN_TOKEN = 'ghana_admin_token'
const ADMIN_INFO = 'ghana_admin_info'

function Stat({ label, value }) {
  return (
    <motion.div className="stat-card"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  )
}

export default function Admin() {
  const nav = useNavigate()
  const [token, setToken] = useState(localStorage.getItem(ADMIN_TOKEN) || '')
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const perms = me ? new Set(me.permissions) : new Set()

  const doLogin = async (username, password) => {
    setErr(''); setBusy(true)
    try {
      const r = await api.admin.login({ username, password })
      localStorage.setItem(ADMIN_TOKEN, r.access_token)
      localStorage.setItem(ADMIN_INFO, JSON.stringify({ username: r.username, role: r.role, full_name: r.full_name }))
      setToken(r.access_token)
      const info = await api.admin.me(r.access_token)
      setMe(info)
    } catch (e) { setErr(e.message || 'Login failed') }
    finally { setBusy(false) }
  }

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN); localStorage.removeItem(ADMIN_INFO)
    setToken(''); setMe(null)
  }

  useEffect(() => {
    if (token && !me) {
      api.admin.me(token).then(setMe).catch(() => { logout() })
    }
  }, [token])

  if (!token || !me) {
    return <AdminLogin onLogin={doLogin} err={err} busy={busy} />
  }

  return (
    <div className="screen admin">
      <div className="admin-nav">
        <div className="admin-brand">🛡️ STEM Admin <span className="role-badge">{me.role}</span></div>
        <div className="admin-tabs">
          {perms.has('users') && <button className={tab==='dashboard'?'tab active':'tab'} onClick={()=>setTab('dashboard')}>Dashboard</button>}
          {perms.has('users') && <button className={tab==='users'?'tab active':'tab'} onClick={()=>setTab('users')}>Users</button>}
          {perms.has('questions') && <button className={tab==='questions'?'tab active':'tab'} onClick={()=>setTab('questions')}>Questions</button>}
          {perms.has('schools') && <button className={tab==='schools'?'tab active':'tab'} onClick={()=>setTab('schools')}>School Codes</button>}
          {perms.has('leaderboard') && <button className={tab==='leaderboard'?'tab active':'tab'} onClick={()=>setTab('leaderboard')}>Leaderboards</button>}
          {perms.has('monitor') && <button className={tab==='monitor'?'tab active':'tab'} onClick={()=>setTab('monitor')}>Live / Monitor</button>}
          {perms.has('settings') && <button className={tab==='settings'?'tab active':'tab'} onClick={()=>setTab('settings')}>Settings</button>}
          {perms.has('audit') && <button className={tab==='audit'?'tab active':'tab'} onClick={()=>setTab('audit')}>Audit Log</button>}
          {perms.has('settings') && <button className={tab==='admins'?'tab active':'tab'} onClick={()=>setTab('admins')}>Admins</button>}
        </div>
        <button className="btn ghost" onClick={logout}>Logout</button>
      </div>
      <div className="admin-body">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          {tab === 'dashboard' && <Dashboard token={token} perms={perms} />}
          {tab === 'users' && <Users token={token} />}
          {tab === 'questions' && <Questions token={token} />}
          {tab === 'schools' && <SchoolCodes token={token} />}
          {tab === 'leaderboard' && <Leaderboards token={token} />}
          {tab === 'monitor' && <Monitor token={token} />}
          {tab === 'settings' && <Settings token={token} />}
          {tab === 'audit' && <Audit token={token} />}
          {tab === 'admins' && <Admins token={token} />}
        </motion.div>
      </div>
    </div>
  )
}

function AdminLogin({ onLogin, err, busy }) {
  const [u, setU] = useState(''); const [p, setP] = useState('')
  const [localErr, setLocalErr] = useState('')
  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalErr('')
    onLogin(u, p)
  }
  return (
    <form className="screen admin-login" onSubmit={handleSubmit}>
      <h2>🔐 Admin Login</h2>
      <p className="hint">Authorized staff only. Activity is logged.</p>
      {(localErr || err) && <p className="err">{(localErr || err)}</p>}
      <input placeholder="Username" value={u} onChange={e=>{setU(e.target.value); setLocalErr('')}} autoFocus />
      <input type="password" placeholder="Password" value={p} onChange={e=>setP(e.target.value)} />
      <button type="submit" className="btn primary big" disabled={busy}>Login</button>
      <p className="hint">Authorized staff only. Activity is logged and audited.</p>
    </form>
  )
}

function Dashboard({ token }) {
  const [d, setD] = useState(null)
  useEffect(()=>{ api.admin.dashboard(token).then(setD).catch(()=>{}) }, [token])
  if (!d) return <div className="spinner" />
  return (
    <div>
      <div className="stat-grid">
        <Stat label="Registered Users" value={d.registered_users} />
        <Stat label="Active (24h)" value={d.active_players} />
        <Stat label="Online Now" value={d.online_players} />
        <Stat label="Total Questions" value={d.total_questions} />
        <Stat label="Active Questions" value={d.active_questions} />
        <Stat label="Schools" value={d.schools} />
        <Stat label="Games Played" value={d.games_played} />
        <Stat label="Avg Accuracy" value={(d.avg_accuracy*100).toFixed(1)+'%'} />
      </div>
      <h3>Recent Activity</h3>
      <ul className="activity">
        {d.recent_activity.map((a,i)=>(<li key={i}><span className="t">{a.time?.slice(11,19)}</span> {a.text}</li>))}
      </ul>
    </div>
  )
}

function Users({ token }) {
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(()=>{ load() }, [search])
  const load = () => api.admin.users(search?{search}:{}, token).then(setList).catch(()=>{})
  const open = (id) => api.admin.userDetail(id, token).then(setDetail).catch(()=>{})
  const toggle = async (u) => {
    await api.admin.setUserStatus(u.id, { is_active: u.account_status!=='disabled' }, token)
    setMsg(`User ${u.account_status==='disabled'?'activated':'disabled'}`); load()
    if (detail) open(u.id)
  }
  return (
    <div>
      <input placeholder="Search username…" value={search} onChange={e=>setSearch(e.target.value)} />
      {msg && <p className="hint">{msg}</p>}
      <table className="grid-table">
        <thead><tr><th>#</th><th>Username</th><th>Class</th><th>School</th><th>Score</th><th>Acc</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map(u=>(
            <tr key={u.id}>
              <td>{u.id}</td><td>{u.nickname}{u.is_online?' 🟢':''}</td><td>{u.class_level}</td>
              <td>{u.school_code||'-'}</td><td>{u.lifetime_score}</td><td>{(u.accuracy*100).toFixed(0)}%</td>
              <td><span className={u.account_status==='disabled'?'badge off':'badge on'}>{u.account_status}</span></td>
              <td><button className="btn small" onClick={()=>open(u.id)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {detail && (
        <div className="modal">
          <h3>{detail.nickname}</h3>
          <p>School: {detail.school||'-'} · Code: {detail.school_code||'-'} · Registered: {detail.created_at?.slice(0,10)}</p>
          <p>Last active: {detail.last_played?.slice(0,10)||'never'}</p>
          <h4>Game Statistics</h4>
          <p>Games: {detail.games_played} · Questions: {detail.total_questions} · Correct: {detail.total_correct} · Wrong: {(detail.total_questions||0)-(detail.total_correct||0)}</p>
          <p>Accuracy: {(detail.accuracy*100).toFixed(1)}% · Score: {detail.lifetime_score} · Rank by score</p>
          <p>Streak: {detail.current_streak} (best {detail.longest_streak}) · Status: {detail.account_status}</p>
          <h4>Game History</h4>
          <table className="grid-table">
            <thead><tr><th>Date</th><th>Score</th><th>Q</th><th>Correct</th><th>Subject</th><th>Result</th></tr></thead>
            <tbody>{detail.games.map(g=>(
              <tr key={g.id}><td>{g.date?.slice(0,10)}</td><td>{g.score}</td><td>{g.total}</td><td>{g.correct}</td><td>{g.subject}</td><td>{g.status}</td></tr>
            ))}</tbody>
          </table>
          <button className="btn primary" onClick={()=>toggle(detail)}>{detail.account_status==='disabled'?'Activate':'Disable'} account</button>
          <button className="btn ghost" onClick={()=>setDetail(null)}>Close</button>
        </div>
      )}
    </div>
  )
}

function Questions({ token }) {
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [f, setF] = useState({})
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')
  const load = () => { const p={limit:100}; if(search)p.search=search; Object.assign(p,f); api.admin.questions(p,token).then(setList).catch(()=>{}) }
  useEffect(()=>{ load() }, [search, f])
  const save = async (q) => {
    if (q.id) await api.admin.updateQuestion(q.id, q, token); else await api.admin.createQuestion(q, token)
    setMsg('Saved'); setEditing(null); load()
  }
  const del = async (id) => { if (confirm('Delete question?')) { await api.admin.deleteQuestion(id, token); setMsg('Deleted'); load() } }
  const tog = async (q) => { await api.admin.setQuestionActive(q.id, {is_active:!q.is_active}, token); load() }
  return (
    <div>
      <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
      <select value={f.class_level||''} onChange={e=>setF({...f,class_level:e.target.value||undefined})}><option value="">All classes</option>{['B4','B5','B6','B7','B8','B9','S1','S2','S3'].map(c=><option key={c}>{c}</option>)}</select>
      <select value={f.subject||''} onChange={e=>setF({...f,subject:e.target.value||undefined})}><option value="">All subjects</option>{['Mathematics','Science','Computing','English','Social Studies','French','Ghanaian Language','History','Our World and Our People','Creative Arts','Physical Education','Religious and Moral Education','Career Technology','Arabic','Mixed'].map(c=><option key={c}>{c}</option>)}</select>
      <select value={f.question_type||''} onChange={e=>setF({...f,question_type:e.target.value||undefined})}><option value="">All types</option><option value="mcq">MCQ</option><option value="true_false">True/False</option><option value="image_mcq">Image MCQ</option></select>
      <button className="btn primary" onClick={()=>setEditing({class_level:'B4',subject:'Mathematics',topic:'',strand:'',difficulty:'Easy',question:'',options:['','','',''],answer_index:0,explanation:'',question_type:'mcq',image_url:''})}>+ New Question</button>
      {msg && <p className="hint">{msg}</p>}
      <table className="grid-table">
        <thead><tr><th>ID</th><th>Q</th><th>Type</th><th>Subject</th><th>Answered</th><th>Correct%</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {list.map(q=>(
            <tr key={q.id}>
              <td>{q.id}</td><td>{q.question.slice(0,50)}…</td><td>{q.question_type||'mcq'}</td><td>{q.subject}</td>
              <td>{q.times_answered}</td><td>{q.correct_rate!=null?(q.correct_rate*100).toFixed(0)+'%':'-'}</td>
              <td>{q.is_active?'✅':'⛔'}</td>
              <td><button className="btn small" onClick={()=>setEditing(q)}>Edit</button><button className="btn small" onClick={()=>tog(q)}>{q.is_active?'Off':'On'}</button><button className="btn small danger" onClick={()=>del(q.id)}>Del</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && <QuestionEditor q={editing} onSave={save} onCancel={()=>setEditing(null)} />}
    </div>
  )
}

function QuestionEditor({ q, onSave, onCancel }) {
  const [d, setD] = useState(JSON.parse(JSON.stringify({
    question_type: 'mcq', image_url: '', options: ['','','',''], ...q,
  })))
  const set=(k,v)=>setD({...d,[k]:v})
  const setOpt=(i,v)=>{const o=[...d.options];o[i]=v;set('options',o)}
  const setType=(t)=>{
    if (t === 'true_false') {
      setD({...d, question_type: t, options: [d.options[0]||'True', d.options[1]||'False'], answer_index: d.answer_index>1?0:d.answer_index})
    } else if (t === 'image_mcq') {
      const opts = [...(d.options||[])]
      while (opts.length < 4) opts.push('')
      setD({...d, question_type: t, options: opts.slice(0,4)})
    } else {
      const opts = [...(d.options||[])]
      while (opts.length < 4) opts.push('')
      setD({...d, question_type: t, options: opts.slice(0,4)})
    }
  }
  const isTF = d.question_type === 'true_false'
  const shown = isTF ? (d.options||[]).slice(0,2) : (d.options||['','','',''])
  return (
    <div className="modal">
      <h3>{d.id?'Edit':'New'} Question</h3>
      <div className="row">
        <label>Type: <select value={d.question_type||'mcq'} onChange={e=>setType(e.target.value)}>
          <option value="mcq">Multiple choice</option>
          <option value="true_false">True / False</option>
          <option value="image_mcq">Image MCQ</option>
        </select></label>
      </div>
      <input value={d.question} onChange={e=>set('question',e.target.value)} placeholder="Question" />
      <input value={d.image_url||''} onChange={e=>set('image_url',e.target.value)} placeholder="Image URL (optional, e.g. /media/questions/lever.svg)" />
      {shown.map((o,i)=>(<input key={i} value={o} onChange={e=>setOpt(i,e.target.value)} placeholder={isTF ? (i===0?'True':'False') : `Option ${i+1}`} />))}
      <div className="row">
        <label>Answer: <select value={d.answer_index} onChange={e=>set('answer_index',+e.target.value)}>{shown.map((_,i)=><option key={i} value={i}>{isTF ? (i===0?'True':'False') : (i+1)}</option>)}</select></label>
        <label>Class: <select value={d.class_level} onChange={e=>set('class_level',e.target.value)}>{['B4','B5','B6','B7','B8','B9','S1','S2','S3'].map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Subject: <select value={d.subject} onChange={e=>set('subject',e.target.value)}>{['Mathematics','Science','Computing','English','Social Studies','French','Ghanaian Language','History','Our World and Our People','Creative Arts','Physical Education','Religious and Moral Education','Career Technology','Arabic','Mixed'].map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Difficulty: <select value={d.difficulty} onChange={e=>set('difficulty',e.target.value)}>{['Easy','Medium','Hard'].map(c=><option key={c}>{c}</option>)}</select></label>
      </div>
      <input value={d.topic} onChange={e=>set('topic',e.target.value)} placeholder="Topic" />
      <input value={d.explanation} onChange={e=>set('explanation',e.target.value)} placeholder="Explanation" />
      <button className="btn primary" onClick={()=>onSave(d)}>Save</button>
      <button className="btn ghost" onClick={onCancel}>Cancel</button>
    </div>
  )
}

function SchoolCodes({ token }) {
  const [list, setList] = useState([])
  const [name, setName] = useState(''); const [school, setSchool] = useState(''); const [count, setCount] = useState(1)
  const load = () => api.admin.schoolCodes(token).then(setList).catch(()=>{})
  useEffect(()=>{ load() }, [])
  const create = async () => { await api.admin.createSchoolCodes({name, school, count:+count}, token); setName(''); setSchool(''); load() }
  const tog = async (c) => { await api.admin.updateSchoolCode(c.id, {is_active:!c.is_active}, token); load() }
  return (
    <div>
      <div className="row">
        <input placeholder="Code name (e.g. Adisadel JHS 1)" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="School" value={school} onChange={e=>setSchool(e.target.value)} />
        <input type="number" min="1" max="20" value={count} onChange={e=>setCount(e.target.value)} style={{width:60}} />
        <button className="btn primary" onClick={create}>Generate</button>
      </div>
      <table className="grid-table">
        <thead><tr><th>Code</th><th>Name</th><th>School</th><th>Used</th><th>Active</th><th></th></tr></thead>
        <tbody>{list.map(c=>(
          <tr key={c.id}><td><code>{c.code}</code></td><td>{c.name}</td><td>{c.school||'-'}</td><td>{c.users_using}</td><td>{c.is_active?'✅':'⛔'}</td><td><button className="btn small" onClick={()=>tog(c)}>{c.is_active?'Disable':'Enable'}</button></td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function Leaderboards({ token }) {
  const [scope, setScope] = useState('global')
  const [rows, setRows] = useState([])
  const [classLevel, setClassLevel] = useState('')
  useEffect(()=>{
    const p={scope, limit:50}; if(classLevel)p.class_level=classLevel
    api.admin.leaderboard(p, token).then(setRows).catch(()=>{})
  }, [scope, classLevel])
  return (
    <div>
      <div className="tabs tabs-4">
        {['global','daily','weekly','monthly'].map(s=>(<button key={s} className={scope===s?'tab active':'tab'} onClick={()=>setScope(s)}>{s}</button>))}
      </div>
      {scope!=='global' && <select value={classLevel} onChange={e=>setClassLevel(e.target.value)}><option value="">All classes</option>{['B4','B5','B6','B7','B8','B9','S1','S2','S3'].map(c=><option key={c}>{c}</option>)}</select>}
      <ol className="board">
        {rows.map(r=>(
          <li key={r.rank} className="board-row"><span className="rank">{r.rank}</span><span className="name">{r.nickname} {r.class_level}</span><span className="pts">{r.lifetime_score} pts</span><span className="acc">{(r.accuracy*100).toFixed(0)}%</span></li>
        ))}
      </ol>
      <a className="btn small" href={api.admin.exportUrl('leaderboard')+'?scope='+scope} target="_blank" rel="noreferrer">Export CSV</a>
    </div>
  )
}

function Monitor({ token }) {
  const [m, setM] = useState(null)
  const refresh = () => api.admin.monitor(token).then(setM).catch(()=>{})
  useEffect(()=>{ refresh(); const t=setInterval(refresh,5000); return ()=>clearInterval(t) }, [])
  if (!m) return <div className="spinner" />
  return (
    <div>
      <div className="stat-grid">
        <Stat label="Active Games" value={m.active_games} />
        <Stat label="Completed" value={m.completed_games} />
        <Stat label="Abandoned" value={m.abandoned_games} />
        <Stat label="Playing Now" value={m.players_currently_playing} />
      </div>
      <h3>🟢 LIVE PLAYERS</h3>
      <table className="grid-table">
        <thead><tr><th>Player</th><th>School</th><th>Score</th><th>Status</th><th>Started</th></tr></thead>
        <tbody>{m.live_players.map((p,i)=>(<tr key={i}><td>{p.nickname}</td><td>{p.school}</td><td>{p.score}</td><td>{p.status}</td><td>{p.started_at?.slice(11,19)}</td></tr>))}</tbody>
      </table>
      <p className="hint">Auto-refreshes every 5s.</p>
    </div>
  )
}

function Settings({ token }) {
  const [s, setS] = useState({})
  const [msg, setMsg] = useState('')
  useEffect(()=>{ api.admin.settings(token).then(setS).catch(()=>{}) }, [])
  const upd = async (k) => { await api.admin.updateSetting(k, {value:String(s[k])}, token); setMsg(`Saved ${k}`) }
  return (
    <div>
      {Object.entries(s).map(([k,v])=>(
        <div className="row" key={k}><label style={{minWidth:200}}>{k}</label>
          <input value={v} onChange={e=>setS({...s,[k]:e.target.value})} /><button className="btn small" onClick={()=>upd(k)}>Save</button></div>
      ))}
      {msg && <p className="hint">{msg}</p>}
    </div>
  )
}

function Audit({ token }) {
  const [rows, setRows] = useState([])
  useEffect(()=>{ api.admin.audit(token).then(setRows).catch(()=>{}) }, [])
  return (
    <table className="grid-table">
      <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
      <tbody>{rows.map(a=>(
        <tr key={a.id}><td>{a.created_at?.slice(0,19)}</td><td>{a.admin_username}</td><td>{a.action}</td><td>{a.target||'-'}</td><td>{a.detail||'-'}</td></tr>
      ))}</tbody>
    </table>
  )
}

function Admins({ token }) {
  const [list, setList] = useState([])
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [r, setR] = useState('moderator')
  const load = () => api.admin.admins(token).then(setList).catch(()=>{})
  useEffect(()=>{ load() }, [])
  const create = async () => { await api.admin.createAdmin({username:u,password:p,role:r}, token); setU(''); setP(''); load() }
  return (
    <div>
      <div className="row">
        <input placeholder="username" value={u} onChange={e=>setU(e.target.value)} />
        <input type="password" placeholder="password" value={p} onChange={e=>setP(e.target.value)} />
        <select value={r} onChange={e=>setR(e.target.value)}>{['super_admin','question_manager','school_manager','moderator'].map(x=><option key={x}>{x}</option>)}</select>
        <button className="btn primary" onClick={create}>Add Admin</button>
      </div>
      <table className="grid-table">
        <thead><tr><th>Username</th><th>Role</th><th>Active</th></tr></thead>
        <tbody>{list.map(a=>(<tr key={a.id}><td>{a.username}</td><td>{a.role}</td><td>{a.is_active?'✅':'⛔'}</td></tr>))}</tbody>
      </table>
    </div>
  )
}

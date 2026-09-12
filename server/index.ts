import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import cookieParser from 'cookie-parser'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = Number(process.env.PORT || 3001)
const HOST = process.env.HOST || '127.0.0.1'
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
const dataDir = path.resolve(process.env.WAVE_DATA_DIR || './data')
fs.mkdirSync(dataDir, { recursive: true })
const db = new Database(path.join(dataDir, 'wave.sqlite'))
db.pragma('journal_mode = WAL')
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, avatar_url TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS stations (id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, icon_url TEXT, is_private INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS memberships (station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'member', joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(station_id,user_id)); CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS invites (id INTEGER PRIMARY KEY, station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE, code_hash TEXT UNIQUE NOT NULL, created_by INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER); CREATE INDEX IF NOT EXISTS stations_public_idx ON stations(is_private,category,name); CREATE INDEX IF NOT EXISTS messages_station_idx ON messages(station_id,id DESC); CREATE INDEX IF NOT EXISTS members_user_idx ON memberships(user_id);`)
const app = express(); app.use(express.json({limit:'32kb'})); app.use(cookieParser()); app.use(express.static(path.resolve('./public')))
const limiter = new Map<string,{count:number; reset:number}>()
function limited(key:string, max=60) { const now=Date.now(); const item=limiter.get(key); if(!item||item.reset<now){limiter.set(key,{count:1,reset:now+60000});return true} item.count++; return item.count<=max }
function hash(value:string){return crypto.createHash('sha256').update(value).digest('hex')}
function sessionUser(req:express.Request){const token=req.cookies.wave_session; if(!token)return null; const row=db.prepare('SELECT u.id,u.email,u.username,u.avatar_url FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(token),Date.now()) as any; return row||null}
function requireUser(req:express.Request,res:express.Response){const user=sessionUser(req); if(!user){res.status(401).json({error:'Please sign in to continue'});return null}return user}
function slugify(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)+'-'+crypto.randomBytes(3).toString('hex')}
app.get('/api/health',(_,res)=>res.json({ok:true}))
app.post('/api/auth/register',async(req,res)=>{if(!limited(req.ip||'anon',8))return res.status(429).json({error:'Too many attempts. Try again later.'}); const {email,username,password}=req.body||{}; if(typeof email!=='string'||!/^\\S+@\\S+\\.\\S+$/.test(email)||typeof username!=='string'||username.length<2||username.length>24||typeof password!=='string'||password.length<8)return res.status(400).json({error:'Use a valid email, username, and password of at least 8 characters.'}); try{const info=db.prepare('INSERT INTO users(email,username,password_hash) VALUES (?,?,?)').run(email.toLowerCase().trim(),username.trim(),await bcrypt.hash(password,12)); const token=crypto.randomBytes(32).toString('hex'); db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').run(hash(token),info.lastInsertRowid,Date.now()+2592000000); res.cookie('wave_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:2592000000});res.status(201).json({user:{id:info.lastInsertRowid,email,username}})}catch{res.status(409).json({error:'That email or username is already in use.'})}})
app.post('/api/auth/login',async(req,res)=>{if(!limited(req.ip||'anon',12))return res.status(429).json({error:'Too many attempts. Try again later.'}); const {email,password}=req.body||{}; const user=db.prepare('SELECT * FROM users WHERE email=?').get(String(email||'').toLowerCase().trim()) as any; if(!user||!(await bcrypt.compare(String(password||''),user.password_hash)))return res.status(401).json({error:'Email or password is incorrect.'}); const token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').run(hash(token),user.id,Date.now()+2592000000);res.cookie('wave_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:2592000000});res.json({user:{id:user.id,email:user.email,username:user.username}})})
app.post('/api/auth/logout',(req,res)=>{const token=req.cookies.wave_session;if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));res.clearCookie('wave_session');res.status(204).end()})
app.get('/api/me',(req,res)=>{const user=sessionUser(req);if(!user)return res.status(401).json({error:'Not signed in'});res.json({user})})
app.get('/api/stations',(req,res)=>{const q=String(req.query.q||'').trim();const category=String(req.query.category||'');const values:any[]=[];let sql='SELECT s.id,s.name,s.description,s.category,s.icon_url AS icon,s.is_private AS isPrivate,COUNT(m.user_id) AS members FROM stations s LEFT JOIN memberships m ON m.station_id=s.id WHERE s.is_private=0';if(q){sql+=' AND (s.name LIKE ? OR s.description LIKE ? OR s.category LIKE ?)';const term=`%${q}%`;values.push(term,term,term)}if(category){sql+=' AND s.category=?';values.push(category)}sql+=' GROUP BY s.id ORDER BY s.created_at DESC LIMIT 50';res.json({stations:db.prepare(sql).all(...values)})})
app.post('/api/stations',(req,res)=>{const user=requireUser(req,res);if(!user)return;const {name,description,category,isPrivate}=req.body||{};if(typeof name!=='string'||name.trim().length<3||name.length>60||typeof description!=='string'||description.length>280)return res.status(400).json({error:'Check the station name and description.'});const result=db.transaction(()=>{const info=db.prepare('INSERT INTO stations(owner_id,name,slug,description,category,is_private) VALUES (?,?,?,?,?,?)').run(user.id,name.trim(),slugify(name),description.trim(),String(category||'Community'),isPrivate?1:0);db.prepare('INSERT INTO memberships(station_id,user_id,role) VALUES (?,?,?)').run(info.lastInsertRowid,user.id,'owner');return info.lastInsertRowid})();res.status(201).json({id:result})})
app.get('/api/stations/:id',(req,res)=>{const user=sessionUser(req);const station=db.prepare('SELECT id,name,description,category,icon_url AS icon,is_private AS isPrivate,owner_id FROM stations WHERE id=?').get(req.params.id) as any;if(!station)return res.status(404).json({error:'Station not found'});const member=!!user&&!!db.prepare('SELECT 1 FROM memberships WHERE station_id=? AND user_id=?').get(station.id,user.id);if(station.isPrivate&&!member)return res.status(404).json({error:'Station not found'});res.json({station,member})})
app.post('/api/stations/:id/join',(req,res)=>{const user=requireUser(req,res);if(!user)return;const station=db.prepare('SELECT * FROM stations WHERE id=?').get(req.params.id) as any;if(!station)return res.status(404).json({error:'Station not found'});if(station.is_private&&!req.body?.inviteCode)return res.status(403).json({error:'This station requires an invite code.'});db.prepare('INSERT OR IGNORE INTO memberships(station_id,user_id) VALUES (?,?)').run(station.id,user.id);res.json({ok:true})})
app.get('/api/stations/:id/messages',(req,res)=>{const user=requireUser(req,res);if(!user)return;const allowed=db.prepare('SELECT 1 FROM memberships WHERE station_id=? AND user_id=?').get(req.params.id,user.id);if(!allowed)return res.status(403).json({error:'Join the station to view its chat.'});const before=Number(req.query.before||Number.MAX_SAFE_INTEGER);res.json({messages:db.prepare('SELECT m.id,m.content,m.created_at AS createdAt,u.username,u.avatar_url AS avatar FROM messages m JOIN users u ON u.id=m.user_id WHERE m.station_id=? AND m.id<? ORDER BY m.id DESC LIMIT 50').all(req.params.id,before).reverse()})})
const server=http.createServer(app)
const wss=new WebSocketServer({server,path:'/ws'})
const clients=new Map<WebSocket,{userId:number;stationId:number}>()
wss.on('connection',(socket,req)=>{
  try {
    const url=new URL(req.url||'',`http://${req.headers.host}`)
    const stationId=Number(url.searchParams.get('stationId'))
    const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('wave_session='))?.split('=')[1]
    const user=token?db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token),Date.now()) as any:null
    if(!user||!stationId||!db.prepare('SELECT 1 FROM memberships WHERE station_id=? AND user_id=?').get(stationId,user.user_id)){socket.close(1008,'Unauthorized');return}
    clients.set(socket,{userId:user.user_id,stationId})
    socket.on('message',raw=>{
      try {
        const event=JSON.parse(raw.toString())
        if(event.type==='message'&&typeof event.content==='string'&&event.content.trim().length<=1000){
          const content=event.content.trim(); const info=db.prepare('INSERT INTO messages(station_id,user_id,content) VALUES (?,?,?)').run(stationId,user.user_id,content)
          const msg={type:'message',id:info.lastInsertRowid,content,userId:user.user_id}
          for(const [peer,meta] of clients) if(meta.stationId===stationId&&peer.readyState===WebSocket.OPEN) peer.send(JSON.stringify(msg))
        }
        if(event.type==='typing') for(const [peer,meta] of clients) if(meta.stationId===stationId&&peer!==socket&&peer.readyState===WebSocket.OPEN) peer.send(JSON.stringify({type:'typing',userId:user.user_id,active:!!event.active}))
      } catch {}
    })
    socket.on('close',()=>clients.delete(socket))
  } catch { socket.close(1011,'Server error') }
})
server.listen(PORT,HOST,()=>console.log(`Wave server running at http://${HOST}:${PORT}`))

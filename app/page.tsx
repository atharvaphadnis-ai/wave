'use client'

import { useMemo, useState } from 'react'
import { Compass, Home, MessageCircle, Moon, Plus, Search, Settings, Sun, Users, Radio, Lock, ArrowRight, MoreHorizontal, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

type Station = { id:number; name:string; description:string; category:string; icon:string; members:number; online:number; isPrivate?:boolean; color:string }
const stations: Station[] = [
  { id:1, name:'Late Night Frequencies', description:'For night owls, deep thinkers, and anyone still awake.', category:'Music', icon:'LN', members:248, online:32, color:'coral' },
  { id:2, name:'The Creative Current', description:'A studio space for artists, makers, and curious minds.', category:'Creative', icon:'CC', members:184, online:21, color:'aqua' },
  { id:3, name:'Local Voices', description:'Good news, neighborhood stories, and community updates.', category:'Community', icon:'LV', members:96, online:12, color:'sun' },
  { id:4, name:'Indie Signal', description:'New music, rough cuts, and the people who listen closely.', category:'Music', icon:'IS', members:421, online:68, color:'violet' },
  { id:5, name:'Study Hall FM', description:'Quiet company for focus sessions and small wins.', category:'Study', icon:'SH', members:312, online:44, color:'mint' },
  { id:6, name:'Weekend Wanderers', description:'Routes, recs, and stories from the road less travelled.', category:'Lifestyle', icon:'WW', members:127, online:18, color:'blue' },
]

const chat = [
  { name:'Maya Chen', initials:'MC', time:'2m', text:'That new session was unreal. The bass line at 2:14??', color:'coral' },
  { name:'Jon Bell', initials:'JB', time:'4m', text:'I know! Adding it to the late-night rotation immediately.', color:'aqua' },
  { name:'Priya Nair', initials:'PN', time:'7m', text:'Just joined — this is exactly the energy I needed today.', color:'sun' },
  { name:'Maya Chen', initials:'MC', time:'9m', text:'Welcome Priya. Grab a seat, we are sharing new finds all night.', color:'coral' },
]

function StationIcon({ station, size='md' }: { station: Station; size?: 'sm'|'md'|'lg' }) {
  return <div className={`station-icon ${station.color} ${size}`} aria-hidden="true"><span>{station.icon}</span><i /></div>
}

function StationCard({ station, onOpen }: { station: Station; onOpen: (s:Station)=>void }) {
  return <button className="station-card" onClick={()=>onOpen(station)}>
    <div className="card-top"><StationIcon station={station}/><span className="live-pill"><i />{station.online} live</span></div>
    <div className="card-copy"><h3>{station.name}</h3><p>{station.description}</p></div>
    <div className="card-footer"><span>{station.members} members</span><span className="card-category">{station.category}</span><ArrowRight size={16}/></div>
  </button>
}

export default function Page() {
  const [active, setActive] = useState('Home')
  const [selected, setSelected] = useState<Station | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [dark, setDark] = useState(true)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(chat)
  const [joined, setJoined] = useState<number[]>([2])

  const filtered = useMemo(()=>stations.filter(s => (category==='All'||s.category===category) && `${s.name} ${s.description} ${s.category}`.toLowerCase().includes(search.toLowerCase())),[category,search])
  const send = ()=>{ if(!message.trim()) return; setMessages([...messages,{name:'You',initials:'AP',time:'now',text:message.trim(),color:'aqua'}]); setMessage(''); toast.success('Message sent') }
  const join = (id:number)=>{ setJoined([...joined,id]); toast.success('You joined the station') }

  return <div className={dark?'wave-app dark':'wave-app'}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Radio size={21}/></div><span>WAVE</span></div>
      <div className="sidebar-label">YOUR SPACE</div>
      <nav className="nav-list">
        {[[Home,'Home'],[Compass,'Discover'],[MessageCircle,'Messages']].map(([Icon,label]:any)=><button key={label} className={active===label?'nav-item active':'nav-item'} onClick={()=>{setActive(label);setSelected(null)}}><Icon size={18}/><span>{label}</span>{label==='Messages'&&<b>3</b>}</button>)}
      </nav>
      <div className="sidebar-label stations-label">YOUR STATIONS <button onClick={()=>setCreateOpen(true)}><Plus size={14}/></button></div>
      <div className="mini-stations">{stations.slice(0,3).map(s=><button key={s.id} onClick={()=>setSelected(s)}><StationIcon station={s} size="sm"/><span>{s.name}</span></button>)}</div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={()=>setActive('Settings')}><Settings size={18}/><span>Settings</span></button><button className="profile-chip" onClick={()=>setActive('Profile')}><Avatar><AvatarFallback>AP</AvatarFallback></Avatar><span><strong>Atharva</strong><small>View profile</small></span><MoreHorizontal size={17}/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Radio size={18}/></div>WAVE</div><div className="top-actions"><button className="icon-btn" onClick={()=>setDark(!dark)} aria-label="Toggle theme">{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button className="icon-btn"><MessageCircle size={18}/><i /></button><Avatar className="top-avatar"><AvatarFallback>AP</AvatarFallback></Avatar></div></header>
      {selected ? <StationView station={selected} joined={joined.includes(selected.id)} onBack={()=>setSelected(null)} onJoin={()=>join(selected.id)} messages={messages} message={message} setMessage={setMessage} send={send}/> : <>
        <section className="hero"><div><span className="eyebrow"><Sparkles size={14}/> YOUR FREQUENCY, YOUR PEOPLE</span><h1>Find your <em>frequency.</em></h1><p>Discover communities that sound like you. Tune in, join the conversation, and make your own corner of the world.</p></div><button className="hero-orbit" onClick={()=>setCreateOpen(true)}><div className="orbit-ring"/><Radio size={32}/><span>Start a<br/><strong>station</strong></span></button></section>
        <div className="toolbar"><div className="search-wrap"><Search size={17}/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stations, topics, people..."/></div><Button className="create-btn" onClick={()=>setCreateOpen(true)}><Plus data-icon="inline-start"/>Create station</Button></div>
        <div className="content-heading"><div><p className="eyebrow">{active==='Discover'?'CURATED FOR YOU':'YOUR COMMUNITY MAP'}</p><h2>{active==='Discover'?'Explore stations':'Good evening, Atharva'}</h2></div><div className="filter-row">{['All','Music','Creative','Community','Study','Lifestyle'].map(c=><button key={c} className={category===c?'filter active':'filter'} onClick={()=>setCategory(c)}>{c}</button>)}</div></div>
        <section className="station-grid">{filtered.map(s=><StationCard key={s.id} station={s} onOpen={setSelected}/>)}</section>
        {filtered.length===0&&<div className="empty"><Radio size={28}/><h3>No stations on this frequency</h3><p>Try another search or create the first one.</p></div>}
      </>}
      <footer>Wave <span>•</span> Create your station. Find your people. <strong>Made by Atharva Phadnis</strong></footer>
    </main>
    <nav className="mobile-nav">{[[Home,'Home'],[Compass,'Discover'],[Plus,'Create'],[MessageCircle,'Messages']].map(([Icon,label]:any)=><button key={label} onClick={()=>label==='Create'?setCreateOpen(true):setActive(label)} className={active===label?'active':''}><Icon size={19}/><span>{label}</span></button>)}</nav>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="wave-dialog"><DialogHeader><DialogTitle>Create a station</DialogTitle></DialogHeader><p className="dialog-sub">Make a place for your people to tune in.</p><label>Station name<Input placeholder="e.g. Sunday Morning Radio"/></label><label>Description<Textarea placeholder="What is your station about?"/></label><label>Category<select defaultValue="Music"><option>Music</option><option>Creative</option><option>Community</option><option>Study</option><option>Lifestyle</option></select></label><div className="visibility-row"><button className="visibility active"><Radio size={18}/><span><strong>Public</strong><small>Anyone can discover and join</small></span></button><button className="visibility"><Lock size={18}/><span><strong>Private</strong><small>Invite-only community</small></span></button></div><Button className="create-submit" onClick={()=>{setCreateOpen(false);toast.success('Station created — welcome aboard')}}>Create station <ArrowRight data-icon="inline-end"/></Button></DialogContent></Dialog>
  </div>
}

function StationView({station,joined,onBack,onJoin,messages,message,setMessage,send}:{station:Station;joined:boolean;onBack:()=>void;onJoin:()=>void;messages:any[];message:string;setMessage:(v:string)=>void;send:()=>void}) { return <section className="station-view"><button className="back-link" onClick={onBack}>← Back to stations</button><div className="station-header"><StationIcon station={station} size="lg"/><div><span className="eyebrow">{station.category.toUpperCase()} STATION</span><h1>{station.name}</h1><p>{station.description}</p><div className="station-meta"><span><i className="online-dot"/>{station.online} online now</span><span>{station.members} members</span></div></div><Button variant={joined?'outline':'default'} onClick={onJoin}>{joined?'Joined':'Join station'}</Button></div><div className="station-layout"><div className="chat-panel"><div className="panel-heading"><div><h2>Station chat</h2><p>Live conversation with your community</p></div><span className="live-pill"><i/> Live</span></div><div className="chat-messages">{messages.map((m,i)=><div className="message" key={i}><Avatar className={`message-avatar ${m.color}`}><AvatarFallback>{m.initials}</AvatarFallback></Avatar><div><div className="message-meta"><strong>{m.name}</strong><span>{m.time}</span></div><p>{m.text}</p></div></div>)}</div><div className="composer"><Input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)send()}} placeholder="Say something to the station..."/><Button size="icon" onClick={send} aria-label="Send message"><ArrowRight/></Button></div></div><aside className="members-panel"><div className="panel-heading"><div><h2>People here</h2><p>{station.online} members online</p></div><Users size={18}/></div>{['Maya Chen','Jon Bell','Priya Nair','Leo Martins','Nora Singh'].map((n,i)=><div className="member-row" key={n}><Avatar className={`message-avatar ${['coral','aqua','sun','violet','mint'][i]}`}><AvatarFallback>{n.split(' ').map(x=>x[0]).join('')}</AvatarFallback></Avatar><span>{n}</span><i className="online-dot"/></div>)}<button className="view-all">View all members <ArrowRight size={14}/></button></aside></div></section> }

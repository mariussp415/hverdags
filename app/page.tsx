'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { configured, supabase } from '@/lib/supabase';
import type { Event as HomeEvent, Grocery, Household, Page, Task, Visibility } from '@/lib/models';

const locale = 'nb-NO';
const niceDate = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString(locale, { day:'numeric', month:'short' });
const niceEventDate = (day: string) => new Date(day).toLocaleDateString(locale, { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

function Icon({ name, size=21 }: { name: string; size?:number }) {
  const icons:Record<string,ReactNode> = {
    home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-8h6v8"/></>,
    tasks:<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 1.5 1.5L11 8m2 2h4m-10 6 1.5 1.5L11 15m2 2h4"/></>,
    shopping:<><path d="M3 4h2l2 12h12l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
    calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
    plus:<path d="M12 5v14m-7-7h14"/>,
    heart:<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    users:<><circle cx="8" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m4 9v-2a6 6 0 0 0-4-5.7"/></>,
    arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,
    chevron:<path d="m9 6 6 6-6 6"/>,
    close:<path d="M5 5 19 19M19 5 5 19"/>,
    check:<path d="m5 12 5 5L20 7"/>,
    trash:<><path d="M4 7h16m-10-3h4m-8 3 1 14h10l1-14M10 11v6m4-6v6"/></>,
    copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/></>,
    logout:<><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m5-4 4-4-4-4m4 4H9"/></>,
    sparkle:<><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/></>,
    edit:<><path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L9.5 16.5 5 17.5l1-4.5 10.4-9.4Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name] || icons.heart}</svg>;
}

function SmallBadge({ type }:{ type:Visibility }) {
  return <span className={`badge ${type}`}><Icon name={type==='private'?'lock':'users'} size={12}/>{type==='private'?'Privat':'Felles'}</span>;
}
function Empty({ title, detail }:{title:string;detail:string}) {
  return <div className="empty"><div className="empty-graphic"><Icon name="heart" size={24}/></div><strong>{title}</strong><p>{detail}</p></div>;
}
function Modal({ title, onClose, children }:{title:string;onClose:()=>void;children:ReactNode}) {
  return <div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
    <div className="dialog-header"><h2>{title}</h2><button className="icon-btn" type="button" onClick={onClose} aria-label="Lukk"><Icon name="close"/></button></div>{children}
  </div></div>;
}

export default function Home() {
  const [user, setUser] = useState<User|null>(null);
  const [initializing, setInitializing] = useState(true);
  const [household, setHousehold] = useState<Household|null>(null);
  const [homeLoading,setHomeLoading] = useState(false);
  const [page,setPage] = useState<Page>('home');
  const [tasks,setTasks] = useState<Task[]>([]);
  const [groceries,setGroceries] = useState<Grocery[]>([]);
  const [events,setEvents] = useState<HomeEvent[]>([]);
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [modal,setModal] = useState<'task'|'event'|null>(null);
  const [editingTask,setEditingTask] = useState<Task|null>(null);
  const [editingEvent,setEditingEvent] = useState<HomeEvent|null>(null);
  const [taskFilter,setTaskFilter] = useState<'all'|'private'|'shared'>('all');
  const [eventFilter,setEventFilter] = useState<'all'|'private'|'shared'>('all');
  const [passwordRecovery,setPasswordRecovery] = useState(false);
  const [newPassword,setNewPassword] = useState('');
  const [authMode,setAuthMode] = useState<'login'|'signup'>('login');
  const [authName,setAuthName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [createMode,setCreateMode] = useState<'create'|'join'>('create');
  const [homeName,setHomeName] = useState('Hjemme hos oss');
  const [joinCode,setJoinCode] = useState('');
  const [taskTitle,setTaskTitle] = useState('');
  const [taskVisibility,setTaskVisibility] = useState<Visibility>('shared');
  const [taskDue,setTaskDue] = useState('');
  const [groceryName,setGroceryName] = useState('');
  const [eventTitle,setEventTitle] = useState('');
  const [eventVisibility,setEventVisibility] = useState<Visibility>('shared');
  const [eventDate,setEventDate] = useState('');
  const [showCode,setShowCode] = useState(false);
  const api = useMemo(()=>configured()?supabase():null,[]);

  useEffect(()=>{
    if (!api) { setInitializing(false); return; }
    let live = true;
    api.auth.getUser().then(({data:{user},error})=>{
      if (live) { setUser(error?null:user); setInitializing(false); }
    }).catch(()=>{if(live)setInitializing(false);});
    const { data:{subscription} } = api.auth.onAuthStateChange((_event,session)=>{
      if (live) {
        if (_event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
        setUser(session?.user ?? null);
      }
    });
    return ()=>{live=false;subscription.unsubscribe();};
  },[api]);

  useEffect(()=>{
    if (!user) { setHousehold(null);setTasks([]);setGroceries([]);setEvents([]);setPage('home'); }
  },[user]);

  const loadHome = useCallback(async()=>{
    if (!api || !user) {setHousehold(null);setHomeLoading(false);return;}
    setHomeLoading(true);
    const {data:membership,error:memberError}=await api.from('hd_household_members').select('household_id').eq('user_id',user.id).maybeSingle();
    if (memberError) setNotice(memberError.message);
    if (!membership) {setHousehold(null);setHomeLoading(false);return;}
    const {data:home,error}=await api.from('hd_households').select('id,name,invite_code,created_by').eq('id',membership.household_id).single();
    if (error) setNotice(error.message);
    setHousehold((home as Household)??null);
    setHomeLoading(false);
  },[api,user]);
  useEffect(()=>{void loadHome();},[loadHome]);

  const loadData = useCallback(async()=>{
    if (!api||!user||!household) return;
    const [a,b,c] = await Promise.all([
      api.from('hd_tasks').select('*').order('created_at',{ascending:false}),
      api.from('hd_shopping_items').select('*').eq('household_id',household.id).order('created_at',{ascending:false}),
      api.from('hd_events').select('*').order('starts_at',{ascending:true}),
    ]);
    if (a.error||b.error||c.error) setNotice(a.error?.message||b.error?.message||c.error?.message||'Kunne ikke hente data');
    if (a.data) setTasks(a.data as Task[]);
    if (b.data) setGroceries(b.data as Grocery[]);
    if (c.data) setEvents(c.data as HomeEvent[]);
  },[api,user,household]);
  useEffect(()=>{void loadData();},[loadData]);
  useEffect(()=>{
    if(!api||!household) return;
    const channel=api.channel(`hverdags-updates-${household.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_tasks'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_shopping_items'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_events'},()=>{void loadData();})
      .subscribe();
    const interval=setInterval(()=>{void loadData();},30000); // reserve ved tapte Realtime-hendelser
    const onFocus=()=>{void loadData();};
    window.addEventListener('focus',onFocus);
    return ()=>{clearInterval(interval);window.removeEventListener('focus',onFocus);void api.removeChannel(channel);};
  },[api,household,loadData]);

  async function signIn(e:FormEvent) {
    e.preventDefault();if(!api)return;
    setNotice('');setBusy(true);
    const result=authMode==='signup'
      ? await api.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin,data:{display_name:authName.trim()}}})
      : await api.auth.signInWithPassword({email:email.trim(),password});
    setBusy(false);
    if(result.error) {setNotice(result.error.message);return;}
    if(authMode==='signup'&&!result.data.session) setNotice('Sjekk e-posten din og bekreft kontoen før du logger inn.');
    else setUser(result.data.user);
  }
  async function setupHome(e:FormEvent){
    e.preventDefault();if(!api)return;
    setBusy(true);setNotice('');
    const response=createMode==='create'
      ? await api.rpc('hd_create_household',{p_name:homeName.trim()})
      : await api.rpc('hd_join_household',{p_code:joinCode.trim()});
    setBusy(false);
    if(response.error) {setNotice(response.error.message);return;}
    await loadHome();
  }
  function openTaskEditor(task?:Task){
    setNotice('');setEditingTask(task??null);
    setTaskTitle(task?.title??'');setTaskDue(task?.due_on??'');
    setTaskVisibility(task?.visibility??'shared');setModal('task');
  }
  function openEventEditor(event?:HomeEvent){
    setNotice('');setEditingEvent(event??null);
    setEventTitle(event?.title??'');setEventVisibility(event?.visibility??'shared');
    // datetime-local bruker lokal tid, ikke UTC. Unngå å flytte avtalen ved redigering.
    if(event){const d=new Date(event.starts_at);const offset=d.getTimezoneOffset()*60000;
      setEventDate(new Date(d.getTime()-offset).toISOString().slice(0,16));}
    else setEventDate('');
    setModal('event');
  }
  function closeModal(){setModal(null);setEditingTask(null);setEditingEvent(null);setNotice('');}
  async function sendPasswordReset(){
    if(!api||!email.trim()) {setNotice('Skriv inn e-postadressen din først.');return;}
    setBusy(true);setNotice('');
    const {error}=await api.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
    setBusy(false);setNotice(error?error.message:'Hvis adressen har en konto, får du en e-post med lenke for nytt passord.');
  }
  async function saveNewPassword(e:FormEvent){
    e.preventDefault();if(!api||newPassword.length<8)return;
    setBusy(true);setNotice('');
    const {error}=await api.auth.updateUser({password:newPassword});
    setBusy(false);
    if(error){setNotice(error.message);return;}
    setNewPassword('');setPasswordRecovery(false);setNotice('Passordet er oppdatert.');
  }
  async function saveTask(e:FormEvent){
    e.preventDefault();if(!api||!user||!household||!taskTitle.trim())return;
    setBusy(true);setNotice('');
    const {error}=editingTask
      ? await api.from('hd_tasks').update({title:taskTitle.trim(),due_on:taskDue||null}).eq('id',editingTask.id)
      : await api.from('hd_tasks').insert({
          owner_id:user.id,household_id:taskVisibility==='shared'?household.id:null,
          visibility:taskVisibility,title:taskTitle.trim(),due_on:taskDue||null,
        });
    setBusy(false);
    if(error){setNotice(error.message);return;}
    closeModal();setTaskTitle('');setTaskDue('');await loadData();
  }
  async function saveEvent(e:FormEvent){
    e.preventDefault();if(!api||!user||!household||!eventTitle.trim()||!eventDate)return;
    const parsed=new Date(eventDate);
    if(Number.isNaN(parsed.getTime())) {setNotice('Velg gyldig dato og klokkeslett');return;}
    setBusy(true);setNotice('');
    const {error}=editingEvent
      ? await api.from('hd_events').update({title:eventTitle.trim(),starts_at:parsed.toISOString()}).eq('id',editingEvent.id)
      : await api.from('hd_events').insert({
          owner_id:user.id,household_id:eventVisibility==='shared'?household.id:null,
          visibility:eventVisibility,title:eventTitle.trim(),starts_at:parsed.toISOString(),
        });
    setBusy(false);
    if(error){setNotice(error.message);return;}
    closeModal();setEventTitle('');setEventDate('');await loadData();
  }
  async function saveGrocery(e:FormEvent){
    e.preventDefault();if(!api||!user||!household||!groceryName.trim())return;
    setBusy(true);setNotice('');
    const {error}=await api.from('hd_shopping_items').insert({name:groceryName.trim(),added_by:user.id,household_id:household.id});
    setBusy(false);
    if(error){setNotice(error.message);return;}
    setGroceryName('');await loadData();
  }
  async function toggleTask(task:Task){
    if(!api)return;
    setTasks(a=>a.map(t=>t.id===task.id?{...t,completed:!t.completed}:t));
    const {error}=await api.from('hd_tasks').update({completed:!task.completed}).eq('id',task.id);
    if(error)setNotice(error.message);
    await loadData();
  }
  async function toggleGrocery(item:Grocery){
    if(!api)return;
    setGroceries(a=>a.map(t=>t.id===item.id?{...t,checked:!t.checked}:t));
    const {error}=await api.from('hd_shopping_items').update({checked:!item.checked}).eq('id',item.id);
    if(error)setNotice(error.message);
    await loadData();
  }
  async function remove(table:'hd_tasks'|'hd_shopping_items'|'hd_events',id:string){
    if(!api)return;
    if(!window.confirm('Vil du slette dette permanent?'))return;
    setNotice('');const {error}=await api.from(table).delete().eq('id',id);
    if(error)setNotice(error.message);
    await loadData();
  }
  const nextEvents=events.filter(item=>new Date(item.starts_at).getTime()>=Date.now()).slice(0,3);
  const openTasks=tasks.filter(item=>!item.completed);
  const visibleOpenTasks=openTasks.filter(item=>taskFilter==='all'||item.visibility===taskFilter);
  const visibleDoneTasks=tasks.filter(item=>item.completed&&(taskFilter==='all'||item.visibility===taskFilter));
  const visibleEvents=events.filter(item=>eventFilter==='all'||item.visibility===eventFilter);
  const unchecked=groceries.filter(item=>!item.checked);
  const displayName=((user?.user_metadata?.display_name as string|undefined)||user?.email?.split('@')[0]||'dere').trim().split(' ')[0];
  const greeting=new Date().getHours()<11?'God morgen':new Date().getHours()<17?'God ettermiddag':'God kveld';
  const nav:[Page,string,string][]=[['home','Hjem','home'],['tasks','Oppgaver','tasks'],['shopping','Handleliste','shopping'],['calendar','Kalender','calendar']];

  if(!api) return <main className="fullscreen"><div className="setup-card"><div className="brand-icon"><Icon name="heart" size={30}/></div><h1>hverdags<span>.</span></h1><p>Prosjektet er klart til å kobles til en database.</p><div className="info-panel">Opprett et Supabase-prosjekt, kjør <code>supabase/schema.sql</code>, og fyll inn <code>.env.local</code> som beskrevet i README.</div></div></main>;
  if(initializing||homeLoading) return <main className="fullscreen"><div className="loading"><span className="brand-icon"><Icon name="heart"/></span><p>Gjør Hverdags klart …</p></div></main>;
  if(passwordRecovery) return <main className="fullscreen"><div className="auth-layout"><div className="brand-icon"><Icon name="lock" size={27}/></div><h1>Nytt passord<span>.</span></h1><p className="subtitle">Velg et nytt passord til Hverdags-kontoen din.</p><form className="auth-card" onSubmit={saveNewPassword}><label>Nytt passord<input type="password" minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" required placeholder="Minst 8 tegn" /></label>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy}>{busy?'Lagrer …':'Lagre nytt passord'}</button></form></div></main>;
  if(!user) return <main className="fullscreen"><div className="auth-layout"><div className="brand-icon"><Icon name="heart" size={30}/></div><h1>hverdags<span>.</span></h1><p className="subtitle">Mer tid sammen. Mindre å huske på.</p>
    <form onSubmit={signIn} className="auth-card"><div className="eyebrow">VELKOMMEN HJEM</div><h2>{authMode==='login'?'Logg inn':'Opprett konto'}</h2>
      {authMode==='signup'&&<label>Hva heter du?<input type="text" value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Fornavn" maxLength={60} required/></label>}
      <label>E-post<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="deg@eksempel.no" autoComplete="email" required/></label>
      <label>Passord<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} placeholder="Minst 8 tegn" autoComplete={authMode==='login'?'current-password':'new-password'} required/></label>
      {notice&&<div className="notice" role="alert">{notice}</div>}
      <button className="primary full" type="submit" disabled={busy}>{busy?'Et øyeblikk …':authMode==='login'?'Logg inn':'Opprett konto'}<Icon name="arrow" size={18}/></button>
      {authMode==='login'&&<button className="text-button" type="button" disabled={busy} onClick={()=>{void sendPasswordReset();}}>Glemt passord?</button>}
      <button className="text-button" type="button" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setNotice('');}}>{authMode==='login'?'Ny her? Opprett konto':'Har du allerede konto? Logg inn'}</button>
    </form><p className="footer-note">Et lite digitalt hjem for dere to ♡</p></div></main>;
  if(!household) return <main className="fullscreen"><div className="auth-layout"><div className="brand-icon"><Icon name="home" size={29}/></div><h1>Deres lille hjem<span>.</span></h1><p className="subtitle">Lag deres eget sted, eller bli med i et hjem du er invitert til.</p>
    <div className="setup-tabs"><button className={createMode==='create'?'active':''} onClick={()=>{setCreateMode('create');setNotice('');}}>Opprett hjem</button><button className={createMode==='join'?'active':''} onClick={()=>{setCreateMode('join');setNotice('');}}>Bli med</button></div>
    <form className="auth-card" onSubmit={setupHome}>{createMode==='create'?<><h2>Gi hjemmet et navn</h2><label>Navn på hjemmet<input value={homeName} onChange={e=>setHomeName(e.target.value)} maxLength={60} required placeholder="Hjemme hos oss"/></label><p className="helper">Etterpå får du en kode du kan sende til kjæresten din.</p></>:<><h2>Har du en kode?</h2><label>Invitasjonskode<input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Lim inn kode" autoCapitalize="characters" required/></label><p className="helper">Koden får du fra personen som opprettet hjemmet.</p></>}
      {notice&&<div className="notice" role="alert">{notice}</div>}
      <button className="primary full" disabled={busy}>{busy?'Oppretter …':createMode==='create'?'Opprett vårt hjem':'Bli med i hjemmet'}<Icon name="arrow" size={18}/></button>
    </form><button className="text-button" onClick={()=>{void api.auth.signOut();}}>Logg ut</button></div></main>;

  return <div className="shell"><div className="desktop-side"><div className="sidebar-brand"><div className="brand-icon small"><Icon name="heart" size={23}/></div><strong>hverdags<span>.</span></strong></div><div className="side-label">VÅRT LILLE HJEM</div><div className="side-home"><Icon name="home" size={18}/><span>{household.name}</span></div><nav className="side-nav">{nav.map(([id,text,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon name={icon}/>{text}</button>)}</nav><div className="sidebar-bottom"><button onClick={()=>{void api.auth.signOut();}}><Icon name="logout" size={18}/> Logg ut</button></div></div>
    <div className="main-area"><header className="topbar"><div className="mobile-brand"><div className="brand-icon mini"><Icon name="heart" size={18}/></div><span>hverdags<b>.</b></span></div><span className="topbar-house"><Icon name="home" size={15}/>{household.name}</span><div className="topbar-actions"><button className="icon-btn" title="Oppdater" onClick={()=>{void loadData();}}><Icon name="refresh" size={19}/></button><button className="avatar" title="Vis invitasjon" onClick={()=>setShowCode(true)}>{displayName.slice(0,1).toUpperCase()}</button></div></header>
    <main className="content">
      {notice&&<div className="notice in-app" role="alert"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Lukk melding"><Icon name="close" size={15}/></button></div>}
      {page==='home'&&<>
        <section className="hero"><div className="eyebrow">VÅRT LILLE HJEM ✦</div><h1>{greeting}, {displayName} <span className="wave">☀</span></h1><p>Her er det som skjer hos dere i dag.</p><button className="hero-share" onClick={()=>setShowCode(true)}><Icon name="users" size={17}/> Inviter kjæresten din <Icon name="chevron" size={15}/></button></section>
        <div className="stat-grid"><button className="stat" onClick={()=>setPage('tasks')}><div className="stat-icon peach"><Icon name="tasks"/></div><strong>{openTasks.length}</strong><span>Aktive oppgaver</span><Icon name="chevron" size={16}/></button><button className="stat" onClick={()=>setPage('shopping')}><div className="stat-icon mint"><Icon name="shopping"/></div><strong>{unchecked.length}</strong><span>Varer å handle</span><Icon name="chevron" size={16}/></button><button className="stat" onClick={()=>setPage('calendar')}><div className="stat-icon lilac"><Icon name="calendar"/></div><strong>{nextEvents.length}</strong><span>Kommende avtaler</span><Icon name="chevron" size={16}/></button></div>
        <div className="home-grid"><section className="panel"><div className="panel-head"><div><div className="eyebrow">OVERSIKT</div><h2>Gjøremål <span className="round-count">{openTasks.length}</span></h2></div><button className="small-link" onClick={()=>setPage('tasks')}>Se alle <Icon name="chevron" size={15}/></button></div>
          {openTasks.slice(0,4).map(task=><div className="task-row" key={task.id}><button className="check-circle" onClick={()=>{void toggleTask(task);}} aria-label={`Fullfør ${task.title}`}><Icon name="check" size={14}/></button><div className="item-text"><strong>{task.title}</strong><div className="item-meta"><SmallBadge type={task.visibility}/>{task.due_on&&<span>{niceDate(task.due_on)}</span>}</div></div></div>)}
          {openTasks.length===0&&<Empty title="Helt ajour!" detail="Ingen oppgaver akkurat nå."/>}
          <button className="panel-add" onClick={()=>openTaskEditor()}><Icon name="plus" size={17}/> Legg til oppgave</button></section>
          <section className="panel"><div className="panel-head"><div><div className="eyebrow">SAMMEN</div><h2>Det som kommer</h2></div><button className="small-link" onClick={()=>setPage('calendar')}>Kalender <Icon name="chevron" size={15}/></button></div>
            {nextEvents.map(ev=><div key={ev.id} className="event-row"><div className="event-date"><strong>{new Date(ev.starts_at).toLocaleDateString(locale,{day:'numeric'})}</strong><span>{new Date(ev.starts_at).toLocaleDateString(locale,{month:'short'})}</span></div><div className="item-text"><strong>{ev.title}</strong><div className="item-meta"><SmallBadge type={ev.visibility}/><span>{new Date(ev.starts_at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</span></div></div></div>)}
            {!nextEvents.length&&<Empty title="Åpen kalender" detail="Legg inn noe hyggelig dere skal gjøre."/>}
            <button className="panel-add" onClick={()=>openEventEditor()}><Icon name="plus" size={17}/> Legg til avtale</button></section></div>
      </>}
      {page==='tasks'&&<><section className="section-header"><div><div className="eyebrow">SMÅ STEG, STOR FORSKJELL</div><h1>Oppgaver</h1><p>Hold oversikt over det du gjør alene, og det dere gjør sammen.</p></div><button className="primary" onClick={()=>openTaskEditor()}><Icon name="plus" size={18}/> Ny oppgave</button></section>
        <section className="panel list-panel"><div className="panel-head"><h2>Å gjøre <span className="round-count">{visibleOpenTasks.length}</span></h2></div><div className="filters" aria-label="Filtrer oppgaver">{(['all','shared','private'] as const).map(f=><button key={f} className={taskFilter===f?'active':''} onClick={()=>setTaskFilter(f)}>{f==='all'?'Alle':f==='shared'?'Felles':'Private'}</button>)}</div>{visibleOpenTasks.map(task=><div key={task.id} className="task-row"><button className="check-circle" onClick={()=>{void toggleTask(task);}} aria-label={`Fullfør ${task.title}`}><Icon name="check" size={14}/></button><div className="item-text"><strong>{task.title}</strong><div className="item-meta"><SmallBadge type={task.visibility}/>{task.due_on&&<span>Frist {niceDate(task.due_on)}</span>}</div></div><button className="edit-button" onClick={()=>openTaskEditor(task)} aria-label={`Rediger ${task.title}`}><Icon name="edit" size={17}/></button><button className="remove" onClick={()=>{void remove('hd_tasks',task.id);}} aria-label={`Slett ${task.title}`}><Icon name="trash" size={17}/></button></div>)}{!visibleOpenTasks.length&&<Empty title="Alt er gjort" detail="Legg til en oppgave når det dukker opp noe."/>}</section>
        {!!visibleDoneTasks.length&&<section className="panel list-panel done-panel"><h2>Fullført</h2>{visibleDoneTasks.map(task=><div key={task.id} className="task-row"><button className="check-circle checked" onClick={()=>{void toggleTask(task);}} aria-label={`Gjenåpne ${task.title}`}><Icon name="check" size={14}/></button><div className="item-text"><strong>{task.title}</strong></div><button className="edit-button" onClick={()=>openTaskEditor(task)} aria-label={`Rediger ${task.title}`}><Icon name="edit" size={17}/></button><button className="remove" onClick={()=>{void remove('hd_tasks',task.id);}} aria-label={`Slett ${task.title}`}><Icon name="trash" size={17}/></button></div>)}</section>}
      </>}
      {page==='shopping'&&<><section className="section-header"><div><div className="eyebrow">HANDLE SAMMEN</div><h1>Handleliste</h1><p>Den samme listen for dere begge – alltid oppdatert.</p></div></section><section className="panel list-panel"><div className="panel-head"><h2>På listen <span className="round-count">{unchecked.length}</span></h2><SmallBadge type="shared"/></div><form onSubmit={saveGrocery} className="shopping-form"><input value={groceryName} onChange={e=>setGroceryName(e.target.value)} maxLength={100} placeholder="F.eks. melk, brød eller kaffe" required/><button className="primary" disabled={busy} aria-label="Legg til vare"><Icon name="plus"/></button></form>
        {groceries.map(item=><div key={item.id} className={`task-row ${item.checked?'dimmed':''}`}><button className={`check-circle ${item.checked?'checked':''}`} onClick={()=>{void toggleGrocery(item);}} aria-label={`${item.checked?'Fjern kryss':'Marker kjøpt'} ${item.name}`}><Icon name="check" size={14}/></button><div className="item-text"><strong>{item.name}</strong></div><button className="remove" onClick={()=>{void remove('hd_shopping_items',item.id);}} aria-label={`Slett ${item.name}`}><Icon name="trash" size={17}/></button></div>)}{!groceries.length&&<Empty title="Handlelisten er tom" detail="Legg til den første varen over."/>}</section></>}
      {page==='calendar'&&<><section className="section-header"><div><div className="eyebrow">PLASS TIL DET SOM BETYR NOE</div><h1>Kalender</h1><p>Ha oversikt over private og felles planer.</p></div><button className="primary" onClick={()=>openEventEditor()}><Icon name="plus" size={18}/> Ny avtale</button></section><section className="panel list-panel"><div className="panel-head"><h2>Avtaler <span className="round-count">{visibleEvents.length}</span></h2></div><div className="filters" aria-label="Filtrer avtaler">{(['all','shared','private'] as const).map(f=><button key={f} className={eventFilter===f?'active':''} onClick={()=>setEventFilter(f)}>{f==='all'?'Alle':f==='shared'?'Felles':'Private'}</button>)}</div>
        {visibleEvents.map(ev=><div key={ev.id} className="event-row"><div className="event-date"><strong>{new Date(ev.starts_at).toLocaleDateString(locale,{day:'numeric'})}</strong><span>{new Date(ev.starts_at).toLocaleDateString(locale,{month:'short'})}</span></div><div className="item-text"><strong>{ev.title}</strong><div className="item-meta"><SmallBadge type={ev.visibility}/><span>{niceEventDate(ev.starts_at)}</span></div></div><button className="edit-button" onClick={()=>openEventEditor(ev)} aria-label={`Rediger ${ev.title}`}><Icon name="edit" size={17}/></button><button className="remove" onClick={()=>{void remove('hd_events',ev.id);}} aria-label={`Slett ${ev.title}`}><Icon name="trash" size={17}/></button></div>)}{!visibleEvents.length&&<Empty title="Ingen avtaler enda" detail="Legg til en plan – bare for deg, eller for dere begge."/>}</section></>}
      <footer className="page-footer"><Icon name="heart" size={14}/> Litt mindre stress, litt mer oss.</footer>
    </main></div>
    <nav className="bottom-nav" aria-label="Hovedmeny">{nav.map(([id,label,icon])=><button key={id} className={page===id?'selected':''} onClick={()=>setPage(id)}><Icon name={icon} size={21}/><span>{label}</span></button>)}</nav>
    {modal==='task'&&<Modal title={editingTask?"Rediger oppgave":"Ny oppgave"} onClose={closeModal}><form onSubmit={saveTask} className="dialog-form"><label>Hva skal gjøres?<input autoFocus value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} maxLength={100} placeholder="F.eks. vaske klær" required/></label><label>Frist (valgfritt)<input type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)}/></label><div className="form-label">Hvem kan se den?</div><div className="visibility-grid"><button type="button" disabled={!!editingTask} className={taskVisibility==='private'?'chosen':''} onClick={()=>setTaskVisibility('private')}><Icon name="lock" size={18}/><strong>Kun meg</strong><small>Privat</small></button><button type="button" disabled={!!editingTask} className={taskVisibility==='shared'?'chosen':''} onClick={()=>setTaskVisibility('shared')}><Icon name="users" size={18}/><strong>Felles</strong><small>Synlig for begge</small></button></div>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy}>{busy?'Lagrer …':editingTask?'Lagre endringer':'Legg til oppgave'}<Icon name="arrow" size={18}/></button></form></Modal>}
    {modal==='event'&&<Modal title={editingEvent?"Rediger avtale":"Ny avtale"} onClose={closeModal}><form onSubmit={saveEvent} className="dialog-form"><label>Hva skal skje?<input autoFocus value={eventTitle} onChange={e=>setEventTitle(e.target.value)} maxLength={100} placeholder="F.eks. middag sammen" required/></label><label>Når?<input type="datetime-local" value={eventDate} onChange={e=>setEventDate(e.target.value)} required/></label><div className="form-label">Hvem kan se den?</div><div className="visibility-grid"><button type="button" disabled={!!editingEvent} className={eventVisibility==='private'?'chosen':''} onClick={()=>setEventVisibility('private')}><Icon name="lock" size={18}/><strong>Kun meg</strong><small>Privat</small></button><button type="button" disabled={!!editingEvent} className={eventVisibility==='shared'?'chosen':''} onClick={()=>setEventVisibility('shared')}><Icon name="users" size={18}/><strong>Felles</strong><small>Synlig for begge</small></button></div>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy}>{busy?'Lagrer …':editingEvent?'Lagre endringer':'Legg til avtale'}<Icon name="arrow" size={18}/></button></form></Modal>}
    {showCode&&<Modal title="Inviter kjæresten din" onClose={()=>setShowCode(false)}><div className="invite-content"><div className="invite-graphic"><Icon name="heart" size={32}/></div><p>Be kjæresten din lage en konto i Hverdags og velge <b>«Bli med»</b>. Del denne koden privat:</p><div className="invite-code">{household.invite_code}</div><button className="primary full" onClick={()=>{if(navigator.clipboard)void navigator.clipboard.writeText(household.invite_code).then(()=>setNotice('Invitasjonskoden er kopiert')).catch(()=>setNotice('Marker og kopier koden manuelt'));else setNotice('Marker og kopier koden manuelt');setShowCode(false);}}><Icon name="copy" size={18}/> Kopier invitasjonskode</button><p className="helper">Hvert hjem har plass til to personer. Koden gir tilgang til felles innhold, så del den kun med kjæresten din.</p><button className="text-button" onClick={()=>{setShowCode(false);void api.auth.signOut();}}>Logg ut</button></div></Modal>}
  </div>;
}

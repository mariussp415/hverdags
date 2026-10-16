'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { configured, supabase } from '@/lib/supabase';
import type { Event as HomeEvent, Grocery, Household, MealPlan, Page, Task, Visibility, Recipe, Routine, RoutineCompletion, MemberProfile } from '@/lib/models';
import { routineOccurrences } from '@/lib/routines.mjs';
import { mondayOfWeek, shiftISODate, weekDates, localISODate } from '@/lib/meal-dates.mjs';
import { monthGrid, shiftMonth } from '@/lib/calendar.mjs';

import { groceryUnits, normalizedGroceryName, parseIngredients } from '@/lib/shopping.mjs';

type GroceryDraft = {name:string;quantity:string;unit:string;selected:boolean;merge:boolean};
const locale = 'nb-NO';
// Bekreftelseslenker fra Supabase skal tilbake til riktig repo-sti.
const authRedirectUrl = () => `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`;
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
    meals:<><path d="M4 3v8a4 4 0 0 0 4 4v6M8 3v12M12 3v8a4 4 0 0 1-4 4M19 3c-3 3-4 6-4 10h4v8"/></>,
    left:<path d="m15 18-6-6 6-6"/>,
    edit:<><path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L9.5 16.5 5 17.5l1-4.5 10.4-9.4Z"/></>,
    repeat:<><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
    book:<><path d="M4 19V5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1-2-2Z"/><path d="M4 18a2 2 0 0 1 2-2h14"/></>,
    star:<path d="m12 3 2.6 5.6 6.2.8-4.5 4.5 1.1 6.3-5.4-2.9-5.4 2.9 1.1-6.3-4.5-4.5 6.2-.8Z"/>,
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
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[onClose]);
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
  const [meals,setMeals] = useState<MealPlan[]>([]);
  const [recipes,setRecipes] = useState<Recipe[]>([]);
  const [routines,setRoutines] = useState<Routine[]>([]);
  const [routineCompletions,setRoutineCompletions] = useState<RoutineCompletion[]>([]);
  const [memberProfiles,setMemberProfiles] = useState<MemberProfile[]>([]);
  const [overviewWeek,setOverviewWeek] = useState(()=>mondayOfWeek(new Date()));
  const [expandedWeekDay,setExpandedWeekDay] = useState<string|null>(null);
  const [recipeFilter,setRecipeFilter] = useState<'all'|'favorites'>('all');
  const [editingRecipe,setEditingRecipe] = useState<Recipe|null>(null);
  const [recipeName,setRecipeName] = useState('');
  const [recipeIngredients,setRecipeIngredients] = useState('');
  const [recipeInstructions,setRecipeInstructions] = useState('');
  const [recipeFavorite,setRecipeFavorite] = useState(false);
  const [editingRoutine,setEditingRoutine] = useState<Routine|null>(null);
  const [routineTitle,setRoutineTitle] = useState('');
  const [routineStart,setRoutineStart] = useState('');
  const [routineInterval,setRoutineInterval] = useState<1|2>(1);
  const [routineVisibility,setRoutineVisibility] = useState<Visibility>('shared');
  const [selectedRecipeId,setSelectedRecipeId] = useState('');
  const [mealWeek,setMealWeek] = useState(()=>mondayOfWeek(new Date()));
  const [editingMeal,setEditingMeal] = useState<MealPlan|null>(null);
  const [mealDate,setMealDate] = useState('');
  const [mealName,setMealName] = useState('');
  const [mealActual,setMealActual] = useState('');
  const [mealNotes,setMealNotes] = useState('');
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [modal,setModal] = useState<'task'|'event'|'meal'|'recipe'|'routine'|'grocery'|'ingredients'|null>(null);
  const [editingTask,setEditingTask] = useState<Task|null>(null);
  const [editingEvent,setEditingEvent] = useState<HomeEvent|null>(null);
  const [taskFilter,setTaskFilter] = useState<'all'|'private'|'shared'>('all');
  const [eventFilter,setEventFilter] = useState<'all'|'private'|'shared'>('all');
  const [calendarMonth,setCalendarMonth] = useState(()=>todayStr().slice(0,7));
  const [selectedCalendarDay,setSelectedCalendarDay] = useState(()=>todayStr());
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
  const [groceryQuantity,setGroceryQuantity] = useState('1');
  const [groceryUnit,setGroceryUnit] = useState('stk');
  const [editingGrocery,setEditingGrocery] = useState<Grocery|null>(null);
  const [editGroceryName,setEditGroceryName] = useState('');
  const [editGroceryQuantity,setEditGroceryQuantity] = useState('1');
  const [editGroceryUnit,setEditGroceryUnit] = useState('stk');
  const [ingredientRows,setIngredientRows] = useState<GroceryDraft[]>([]);
  const [ingredientTitle,setIngredientTitle] = useState('');
  const [ingredientScope,setIngredientScope] = useState<Visibility>('shared');
  const [shoppingSuccess,setShoppingSuccess] = useState('');
  const [shoppingVisibility,setShoppingVisibility] = useState<Visibility>('shared');
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
    if (!user) { setHousehold(null);setTasks([]);setGroceries([]);setEvents([]);setMeals([]);setRecipes([]);setRoutines([]);setRoutineCompletions([]);setMemberProfiles([]);setPage('home'); }
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

  // Only a profile's owner can write it; other household members can read the name.
  useEffect(()=>{
    if(!api||!user||!household) return;
    const name=String(user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Medlem').trim().slice(0,60);
    void api.from('hd_member_profiles').upsert({user_id:user.id,household_id:household.id,display_name:name},{onConflict:'user_id'}).then(({error})=>{
      if(error) setNotice(error.message);
    });
  },[api,user,household]);

  const loadData = useCallback(async()=>{
    if (!api||!user||!household) return;
    const {error:cleanupError}=await api.rpc('hd_cleanup_shopping');
    if(cleanupError)setNotice(cleanupError.message);
    const [a,b,c,d,e,f,g,h] = await Promise.all([
      api.from('hd_tasks').select('*').order('created_at',{ascending:false}),
      api.from('hd_shopping_items').select('*').eq('household_id',household.id).order('created_at',{ascending:false}),
      api.from('hd_events').select('*').order('starts_at',{ascending:true}),
      api.from('hd_meal_plans').select('*').eq('household_id',household.id).order('meal_date',{ascending:false}).limit(400),
      api.from('hd_recipes').select('*').eq('household_id',household.id).order('favorite',{ascending:false}).order('name'),
      api.from('hd_routines').select('*').order('created_at',{ascending:false}),
      api.from('hd_routine_completions').select('*').order('occurrence_date',{ascending:false}).limit(500),
      api.from('hd_member_profiles').select('user_id,household_id,display_name').eq('household_id',household.id),
    ]);
    if (a.error||b.error||c.error||d.error||e.error||f.error||g.error||h.error) setNotice(a.error?.message||b.error?.message||c.error?.message||d.error?.message||e.error?.message||f.error?.message||g.error?.message||h.error?.message||'Kunne ikke hente data');
    if (a.data) setTasks(a.data as Task[]);
    if (b.data) setGroceries(b.data as Grocery[]);
    if (c.data) setEvents(c.data as HomeEvent[]);
    if (d.data) setMeals(d.data as MealPlan[]);
    if (e.data) setRecipes(e.data as Recipe[]);
    if (f.data) setRoutines(f.data as Routine[]);
    if (g.data) setRoutineCompletions(g.data as RoutineCompletion[]);
    if (h.data) setMemberProfiles(h.data as MemberProfile[]);
  },[api,user,household]);
  useEffect(()=>{void loadData();},[loadData]);
  useEffect(()=>{
    if(!api||!household) return;
    const channel=api.channel(`hverdags-updates-${household.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_tasks'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_shopping_items'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_events'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_meal_plans'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_recipes'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_routines'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_routine_completions'},()=>{void loadData();})
      .on('postgres_changes',{event:'*',schema:'public',table:'hd_member_profiles'},()=>{void loadData();})
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
      ? await api.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:authRedirectUrl(),data:{display_name:authName.trim()}}})
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
  function openEventEditor(event?:HomeEvent, date?:string){
    setNotice('');setEditingEvent(event??null);
    setEventTitle(event?.title??'');setEventVisibility(event?.visibility??'shared');
    // datetime-local bruker lokal tid, ikke UTC. Unngå å flytte avtalen ved redigering.
    if(event){const d=new Date(event.starts_at);const offset=d.getTimezoneOffset()*60000;
      setEventDate(new Date(d.getTime()-offset).toISOString().slice(0,16));}
    else setEventDate(date?`${date}T18:00`:'');
    setModal('event');
  }
  function openMealEditor(date:string, meal?:MealPlan){
    setNotice(''); setEditingMeal(meal??null); setMealDate(date);
    setMealName(meal?.meal_name??''); setMealActual(meal?.actual_meal??''); setMealNotes(meal?.notes??''); setSelectedRecipeId(recipes.find(r=>r.name===meal?.meal_name)?.id??''); setModal('meal');
  }
  function openRecipeEditor(recipe?:Recipe){
    setNotice('');setEditingRecipe(recipe??null);
    setRecipeName(recipe?.name??'');setRecipeIngredients(recipe?.ingredients??'');
    setRecipeInstructions(recipe?.instructions??'');setRecipeFavorite(recipe?.favorite??false);setModal('recipe');
  }
  function openRoutineEditor(routine?:Routine){
    setNotice('');setEditingRoutine(routine??null);
    setRoutineTitle(routine?.title??'');setRoutineStart(routine?.start_on??todayStr());
    setRoutineInterval(routine?.interval_weeks??1);setRoutineVisibility(routine?.visibility??'shared');setModal('routine');
  }
  function closeModal(){setModal(null);setEditingTask(null);setEditingEvent(null);setEditingMeal(null);setEditingRecipe(null);setEditingRoutine(null);setNotice('');}
  async function sendPasswordReset(){
    if(!api||!email.trim()) {setNotice('Skriv inn e-postadressen din først.');return;}
    setBusy(true);setNotice('');
    const {error}=await api.auth.resetPasswordForEmail(email.trim(),{redirectTo:authRedirectUrl()});
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
  async function saveMeal(e:FormEvent){
    e.preventDefault();
    if(!api||!user||!household||!mealDate||!mealName.trim())return;
    setBusy(true);setNotice('');
    const values={meal_date:mealDate,meal_name:mealName.trim(),notes:mealNotes.trim(),
      ...(editingMeal?.status==='eaten'?{actual_meal:mealActual.trim()||mealName.trim()}:{})};
    const {error}=editingMeal
      ? await api.from('hd_meal_plans').update(values).eq('id',editingMeal.id).eq('household_id',household.id)
      : await api.from('hd_meal_plans').insert({...values, household_id:household.id,created_by:user.id});
    setBusy(false);
    if(error){setNotice(error.code==='23505'?'Det finnes allerede en middag på denne datoen. Rediger den i stedet.':error.message);return;}
    closeModal();await loadData();
  }
  async function toggleMeal(meal:MealPlan){
    if(!api||!household)return;
    setBusy(true);setNotice('');
    const status=meal.status==='eaten'?'planned':'eaten';
    const {error}=await api.from('hd_meal_plans')
      .update({status,eaten_at:status==='eaten'?new Date().toISOString():null,actual_meal:status==='eaten'?meal.meal_name:null})
      .eq('id',meal.id).eq('household_id',household.id);
    setBusy(false);
    if(error)setNotice(error.message);
    await loadData();
  }
  async function removeMeal(meal:MealPlan){
    if(!api||!household||!window.confirm(`Slette ${meal.meal_name} fra matkalenderen?`))return;
    setBusy(true);setNotice('');
    const {error}=await api.from('hd_meal_plans').delete().eq('id',meal.id).eq('household_id',household.id);
    setBusy(false);
    if(error)setNotice(error.message);
    await loadData();
  }
  async function saveRecipe(e:FormEvent){
    e.preventDefault();if(!api||!household||!user||!recipeName.trim())return;
    setBusy(true);setNotice('');
    const values={name:recipeName.trim(),ingredients:recipeIngredients.trim(),instructions:recipeInstructions.trim(),favorite:recipeFavorite};
    const {error}=editingRecipe
      ? await api.from('hd_recipes').update(values).eq('id',editingRecipe.id).eq('household_id',household.id)
      : await api.from('hd_recipes').insert({...values,household_id:household.id,created_by:user.id});
    setBusy(false);if(error){setNotice(error.message);return;}
    closeModal();await loadData();
  }
  async function toggleFavorite(recipe:Recipe){
    if(!api||!household)return;setBusy(true);
    const {error}=await api.from('hd_recipes').update({favorite:!recipe.favorite}).eq('id',recipe.id).eq('household_id',household.id);
    setBusy(false);if(error)setNotice(error.message);await loadData();
  }
  async function removeRecipe(recipe:Recipe){
    if(!api||!household||!window.confirm(`Slette ${recipe.name} fra middagsbiblioteket?`))return;
    setBusy(true);const {error}=await api.from('hd_recipes').delete().eq('id',recipe.id).eq('household_id',household.id);
    setBusy(false);if(error)setNotice(error.message);await loadData();
  }
  async function saveRoutine(e:FormEvent){
    e.preventDefault();if(!api||!user||!household||!routineTitle.trim()||!routineStart)return;
    setBusy(true);setNotice('');
    const values={title:routineTitle.trim(),start_on:routineStart,interval_weeks:routineInterval};
    const {error}=editingRoutine
      ? await api.from('hd_routines').update(values).eq('id',editingRoutine.id)
      : await api.from('hd_routines').insert({...values,owner_id:user.id,
          household_id:routineVisibility==='shared'?household.id:null,visibility:routineVisibility});
    setBusy(false);if(error){setNotice(error.message);return;}
    closeModal();await loadData();
  }
  async function toggleRoutine(routine:Routine, occurrenceDate:string){
    if(!api||!user)return;
    setBusy(true);setNotice('');
    const completed=routineCompletions.find(c=>c.routine_id===routine.id&&c.occurrence_date===occurrenceDate);
    const {error}=completed
      ? await api.from('hd_routine_completions').delete().eq('id',completed.id)
      : await api.from('hd_routine_completions').insert({routine_id:routine.id,occurrence_date:occurrenceDate,completed_by:user.id});
    setBusy(false);if(error)setNotice(error.message);await loadData();
  }
  async function removeRoutine(routine:Routine){
    if(!api||!window.confirm(`Slette den faste oppgaven «${routine.title}» og fullføringshistorikken?`))return;
    setBusy(true);const {error}=await api.from('hd_routines').delete().eq('id',routine.id);
    setBusy(false);if(error)setNotice(error.message);await loadData();
  }
  const matchingGrocery=(name:string,unit:string,scope:Visibility)=>groceries.find(item=>!item.checked&&item.visibility===scope&&item.unit===unit&&normalizedGroceryName(item.name)===normalizedGroceryName(name));
  async function addGroceryRows(rows:GroceryDraft[],scope:Visibility){
    if(!api||!household||busy)return false;
    setBusy(true);setNotice('');setShoppingSuccess('');
    try {
      const items=rows.filter(row=>row.selected).map(row=>({name:row.name.trim(),quantity:Number(row.quantity.replace(',','.')),unit:row.unit,merge_id:row.merge?matchingGrocery(row.name,row.unit,scope)?.id:null}));
      const {error}=await api.rpc('hd_add_shopping',{p_household:household.id,p_visibility:scope,p_items:items});
      if(error){setNotice(error.message);return false;}
      await loadData();
      setShoppingSuccess(`${items.length===1?'Varen er':`${items.length} varer er`} lagt til i ${scope==='shared'?'felleslisten':'din liste'}.`);
      return true;
    } catch {setNotice('Kunne ikke lagre. Sjekk forbindelsen og oppdater listen før du prøver igjen.');return false;}
    finally {setBusy(false);}
  }
  async function saveGrocery(e:FormEvent){
    e.preventDefault();if(!groceryName.trim()||busy)return;
    const row={name:groceryName.trim(),quantity:groceryQuantity,unit:groceryUnit,selected:true,merge:true};
    if(matchingGrocery(row.name,row.unit,shoppingVisibility)){
      setIngredientTitle('Varen finnes allerede');setIngredientScope(shoppingVisibility);setIngredientRows([row]);setNotice('');setModal('ingredients');return;
    }
    if(await addGroceryRows([row],shoppingVisibility)){setGroceryName('');setGroceryQuantity('1');setGroceryUnit('stk');}
  }
  function openGroceryEditor(item:Grocery){
    setEditingGrocery(item);setEditGroceryName(item.name);setEditGroceryQuantity(String(item.quantity));setEditGroceryUnit(item.unit);setNotice('');setModal('grocery');
  }
  async function saveGroceryEdit(e:FormEvent){
    e.preventDefault();if(!api||!editingGrocery||busy)return;
    setBusy(true);setNotice('');
    try {
      const {error}=await api.from('hd_shopping_items').update({name:editGroceryName.trim(),quantity:Number(editGroceryQuantity.replace(',','.')),unit:editGroceryUnit}).eq('id',editingGrocery.id).select('id').single();
      if(error){setNotice('Kunne ikke lagre varen. Den kan ha blitt slettet. '+error.message);return;}
      closeModal();await loadData();setShoppingSuccess('Varen er oppdatert.');
    } catch {setNotice('Kunne ikke lagre. Sjekk forbindelsen og prøv igjen.');}
    finally {setBusy(false);}
  }
  function openIngredientPicker(recipe:Recipe){
    const rows=parseIngredients(recipe.ingredients);
    if(!rows.length){setNotice('Legg til ingredienser i oppskriften først, én per linje.');return;}
    if(rows.length>100){setNotice('Oppskriften har for mange linjer. Bruk maksimalt 100 ingredienser.');return;}
    setIngredientRows(rows.map(row=>({...row,quantity:String(row.quantity),selected:true,merge:true})));
    setIngredientTitle(recipe.name);setIngredientScope('shared');setNotice('');setModal('ingredients');
  }
  async function saveIngredients(e:FormEvent){
    e.preventDefault();
    if(await addGroceryRows(ingredientRows,ingredientScope)){
      closeModal();setShoppingVisibility(ingredientScope);setGroceryName('');setGroceryQuantity('1');setGroceryUnit('stk');setPage('shopping');
    }
  }
  function updateIngredient(index:number,patch:Partial<GroceryDraft>){setIngredientRows(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row));}
  async function toggleTask(task:Task){
    if(!api||busy)return;
    setBusy(true);setNotice('');
    // A database trigger stamps auth.uid() and server time on completion.
    const {error}=await api.from('hd_tasks').update({completed:!task.completed}).eq('id',task.id);
    if(error)setNotice(error.message);
    await loadData();setBusy(false);
  }
  async function toggleGrocery(item:Grocery){
    if(!api||busy)return;
    setBusy(true);setNotice('');
    const {error}=await api.from('hd_shopping_items').update({checked:!item.checked}).eq('id',item.id);
    if(error)setNotice(error.message);
    await loadData();setBusy(false);
  }
  async function clearBoughtGroceries(){
    if(!api||!household||busy)return;
    if(!window.confirm('Slette alle kjøpte varer fra '+(shoppingVisibility==='shared'?'felleslisten':'din private liste')+'? Dette kan ikke angres.'))return;
    setBusy(true);setNotice('');
    const {error}=await api.from('hd_shopping_items').delete().eq('household_id',household.id).eq('visibility',shoppingVisibility).eq('checked',true);
    if(error)setNotice(error.message);
    await loadData();setBusy(false);
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
  const visibleOpenTasks=openTasks.filter(item=>taskFilter==='all'||item.visibility===taskFilter)
    .sort((a,b)=>(a.due_on||'9999-12-31').localeCompare(b.due_on||'9999-12-31'));
  const visibleDoneTasks=tasks.filter(item=>item.completed&&(taskFilter==='all'||item.visibility===taskFilter));
  const recentCompleted=[
    ...tasks.filter(item=>item.completed).map(item=>({id:`task-${item.id}`,title:item.title,visibility:item.visibility,completedBy:item.completed_by,when:item.completed_at||item.created_at,kind:'task'})),
    ...routineCompletions.flatMap(item=>{
      const routine=routines.find(r=>r.id===item.routine_id);
      return routine?[{id:`routine-${item.id}`,title:routine.title,visibility:routine.visibility,completedBy:item.completed_by,when:item.created_at,kind:'routine'}]:[];
    }),
  ].sort((a,b)=>new Date(b.when).getTime()-new Date(a.when).getTime()).slice(0,4);
  const visibleEvents=events.filter(item=>eventFilter==='all'||item.visibility===eventFilter);
  const calendarDays=monthGrid(calendarMonth);
  const selectedCalendarEvents=visibleEvents.filter(ev=>localISODate(new Date(ev.starts_at))===selectedCalendarDay);
  const calendarTitle=new Date(`${calendarMonth}-01T12:00:00`).toLocaleDateString(locale,{month:'long',year:'numeric'});
  const selectedDayTitle=new Date(`${selectedCalendarDay}T12:00:00`).toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long'});
  const selectedGroceries=groceries.filter(item=>item.visibility===shoppingVisibility);
  const unchecked=selectedGroceries.filter(item=>!item.checked);
  const boughtGroceries=selectedGroceries.filter(item=>item.checked).sort((a,b)=>(b.checked_at||'').localeCompare(a.checked_at||''));
  const today=todayStr();
  const previewWeek=weekDates(overviewWeek);
  const overviewRoutines=routineOccurrences(routines,overviewWeek);
  const currentRoutines=routineOccurrences(routines,mondayOfWeek(new Date()));
  const humanToday=new Date().toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long'});
  const displayedWeek=weekDates(mealWeek);
  const routineCompletion=(id:string,date:string)=>routineCompletions.find(c=>c.routine_id===id&&c.occurrence_date===date);
  const routineDone=(id:string,date:string)=>Boolean(routineCompletion(id,date));
  const memberName=(id:string|null|undefined)=>{
    if(!id)return 'ukjent';
    const profile=memberProfiles.find(p=>p.user_id===id);
    if(profile?.display_name)return profile.display_name;
    if(id===user?.id)return String(user?.user_metadata?.display_name||user?.user_metadata?.full_name||'deg').trim();
    return 'den andre';
  };
  const fullfilledBy=(id:string|null|undefined,when:string|null|undefined)=>{
    if(!id)return 'Fullført før historikk ble aktivert';
    const whenLabel=when?` · ${new Date(when).toLocaleDateString(locale,{day:'numeric',month:'short'})}`:'';
    return `Fullført av ${memberName(id)}${whenLabel}`;
  };
  const filteredRoutines=currentRoutines.filter(r=>taskFilter==='all'||r.visibility===taskFilter);
  const todayItems=[
    ...openTasks.filter(task=>task.due_on&&task.due_on<=today).sort((a,b)=>a.due_on!.localeCompare(b.due_on!)).map(task=>({key:`task-${task.id}`,title:task.title,visibility:task.visibility,overdue:task.due_on!<today,kind:'Oppgave',complete:()=>{void toggleTask(task);}})),
    ...currentRoutines.filter(r=>r.occurrence_date===today&&!routineDone(r.id,today)).map(r=>({key:`routine-${r.id}`,title:r.title,visibility:r.visibility,overdue:false,kind:'Fast oppgave',complete:()=>{void toggleRoutine(r,today);}})),
  ];
  const shownRecipes=recipes.filter(r=>recipeFilter==='all'||r.favorite);
  const currentMonday=mondayOfWeek(new Date());
  const todayMeal=meals.find(meal=>meal.meal_date===today);
  const plannedThisWeek=displayedWeek.filter(date=>meals.some(meal=>meal.meal_date===date)).length;
  const displayName=((user?.user_metadata?.display_name as string|undefined)||user?.email?.split('@')[0]||'dere').trim().split(' ')[0];
  const greeting=new Date().getHours()<11?'God morgen':new Date().getHours()<17?'God ettermiddag':'God kveld';
  const shoppingTabs=<div className="setup-tabs" role="group" aria-label="Velg handleliste">{(['shared','private'] as const).map(scope=><button key={scope} type="button" className={shoppingVisibility===scope?'active':''} aria-pressed={shoppingVisibility===scope} onClick={()=>{setShoppingVisibility(scope);setGroceryName('');setGroceryQuantity('1');setGroceryUnit('stk');setShoppingSuccess('');}}>{scope==='shared'?'Felles liste':'Min liste'} <span className="round-count">{groceries.filter(item=>item.visibility===scope&&!item.checked).length}</span></button>)}</div>;
  const nav:[Page,string,string][]=[['home','I dag','home'],['tasks','Oppgaver','tasks'],['shopping','Handle','shopping'],['calendar','Kalender','calendar'],['meals','Matplan','meals']];

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

  return <div className="shell"><div className="desktop-side"><div className="sidebar-brand"><div className="brand-icon small"><Icon name="heart" size={23}/></div><strong>hverdags<span>.</span></strong></div><div className="side-label">VÅRT LILLE HJEM</div><div className="side-home"><Icon name="home" size={18}/><span>{household.name}</span></div><nav className="side-nav">{nav.map(([id,text,icon])=><button key={id} type="button" aria-current={page===id?'page':undefined} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon name={icon}/>{text}</button>)}</nav><div className="sidebar-bottom"><button onClick={()=>{void api.auth.signOut();}}><Icon name="logout" size={18}/> Logg ut</button></div></div>
    <div className="main-area"><header className="topbar"><div className="mobile-brand"><div className="brand-icon mini"><Icon name="heart" size={18}/></div><span>hverdags<b>.</b></span></div><span className="topbar-house"><Icon name="home" size={15}/>{household.name}</span><div className="topbar-actions"><button className="icon-btn" title="Oppdater" aria-label="Oppdater innhold" onClick={()=>{void loadData();}}><Icon name="refresh" size={19}/></button><button className="avatar" title="Vis invitasjon" aria-label="Vis invitasjonskode og konto" onClick={()=>setShowCode(true)}>{displayName.slice(0,1).toUpperCase()}</button></div></header>
    <main className="content">
      {notice&&<div className="notice in-app" role="alert"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Lukk melding"><Icon name="close" size={15}/></button></div>}
      {page==='home'&&<div className="calm-home">
        <section className="today-header" aria-labelledby="today-heading">
          <div><div className="eyebrow">{household.name}</div><h1 id="today-heading">{greeting}, {displayName}</h1><p>{humanToday.charAt(0).toUpperCase()+humanToday.slice(1)}</p></div>
        </section>
        <div className="today-feature-grid">
          <section className="today-meal-card" aria-labelledby="today-meal-title">
            <div className="feature-top"><span className="eyebrow">MIDDAG I DAG</span><span className="feature-date">{niceDate(today)}</span></div>
            <div className="feature-body"><span className="feature-illustration" aria-hidden="true"><Icon name="meals" size={28}/></span><div><h2 id="today-meal-title">{todayMeal?(todayMeal.status==='eaten'?(todayMeal.actual_meal||todayMeal.meal_name):todayMeal.meal_name):'Hva skal vi spise?'}</h2><p>{todayMeal?(todayMeal.status==='eaten'?'Registrert som spist':todayMeal.notes||'Planlagt middag'):'Ingen middag planlagt ennå.'}</p></div></div>
            <div className="feature-actions">
              <button type="button" className="feature-primary" onClick={()=>openMealEditor(today,todayMeal)}><Icon name={todayMeal?'edit':'plus'} size={16}/>{todayMeal?'Endre middag':'Planlegg middag'}</button>
              {todayMeal?.status==='planned'&&<button type="button" disabled={busy} className="feature-secondary" onClick={()=>{void toggleMeal(todayMeal);}}><Icon name="check" size={16}/> Spist</button>}
              {todayMeal?.status==='eaten'&&<button type="button" className="feature-secondary" onClick={()=>{setMealWeek(currentMonday);setPage('meals');}}>Se historikk <Icon name="chevron" size={16}/></button>}
            </div>
          </section>
          <section className="next-up-card" aria-labelledby="next-up-title">
            <div className="panel-head"><div><div className="eyebrow">KALENDER</div><h2 id="next-up-title">Neste avtale</h2></div><button type="button" className="small-link" onClick={()=>setPage('calendar')}>Se alle <Icon name="chevron" size={16}/></button></div>
            {nextEvents.length>0?<div className="next-events">{nextEvents.slice(0,1).map(ev=><div className="event-row" key={ev.id}><div className="event-date"><strong>{new Date(ev.starts_at).toLocaleDateString(locale,{day:'numeric'})}</strong><span>{new Date(ev.starts_at).toLocaleDateString(locale,{month:'short'})}</span></div><div className="item-text"><strong>{ev.title}</strong><div className="item-meta"><span>{niceEventDate(ev.starts_at)}</span><SmallBadge type={ev.visibility}/></div></div></div>)}</div>:<div className="compact-empty"><Icon name="calendar" size={20}/><p>Ingen kommende avtaler.</p><button type="button" onClick={()=>openEventEditor()}>Legg til avtale <Icon name="chevron" size={15}/></button></div>}
          </section>
        </div>
        <section className="panel today-focus" aria-labelledby="home-tasks-title">
          <div className="panel-head"><div><h2 id="home-tasks-title">Å gjøre i dag{todayItems.length>0&&<span className="round-count">{todayItems.length}</span>}</h2><p className="helper">Dagens oppgaver og det som gjenstår fra før.</p></div><button className="small-link" type="button" onClick={()=>setPage('tasks')}>Alle oppgaver <Icon name="chevron" size={16}/></button></div>
          {todayItems.slice(0,3).map(item=><div className="task-row" key={item.key}><button className="check-circle" type="button" onClick={item.complete} disabled={busy} aria-label={`Fullfør ${item.title}`}><Icon name="check" size={14}/></button><div className="item-text"><strong>{item.title}</strong><div className="item-meta"><SmallBadge type={item.visibility}/>{item.overdue?<span className="overdue">Forfalt</span>:item.kind==='Fast oppgave'&&<span>Fast oppgave</span>}</div></div></div>)}
          {!todayItems.length&&<div className="compact-empty"><Icon name="check" size={20}/><p>Ingen oppgaver med frist i dag. Litt mer rom i dagen.</p></div>}
          <div className="today-task-footer"><button type="button" className="small-link" onClick={()=>openTaskEditor()}><Icon name="plus" size={16}/> Ny oppgave</button>{todayItems.length>3&&<button type="button" className="small-link" onClick={()=>setPage('tasks')}>Se {todayItems.length-3} til <Icon name="chevron" size={16}/></button>}</div>
        </section>
        <div className="home-shopping-shortcuts" role="group" aria-label="Handlelister">
          {(['shared','private'] as const).map(scope=><button type="button" key={scope} onClick={()=>{setShoppingVisibility(scope);setGroceryName('');setGroceryQuantity('1');setGroceryUnit('stk');setShoppingSuccess('');setPage('shopping');}}><Icon name={scope==='shared'?'shopping':'lock'} size={20}/><span><strong>{scope==='shared'?'Felles handleliste':'Min handleliste'}</strong><small>{groceries.filter(item=>item.visibility===scope&&!item.checked).length} varer å handle</small></span><Icon name="chevron" size={18}/></button>)}
        </div>
        <details className="home-disclosure"><summary>Uken vår <span>Se middager, avtaler og oppgaver</span></summary>
        <section className="panel weekly-overview" aria-labelledby="home-week-title">
          <div className="panel-head week-overview-head"><div><div className="eyebrow">ALT PÅ ETT STED</div><h2 id="home-week-title">Uken vår</h2><p className="weekly-subtitle">Middag, avtaler og det som skal gjøres · {niceDate(previewWeek[0])} – {niceDate(previewWeek[6])}</p></div>
            <div className="week-controls"><button type="button" className="icon-btn" aria-label="Forrige uke" onClick={()=>{setOverviewWeek(shiftISODate(overviewWeek,-7));setExpandedWeekDay(null);}}><Icon name="left"/></button><button type="button" className="today-btn" disabled={overviewWeek===currentMonday} onClick={()=>{setOverviewWeek(currentMonday);setExpandedWeekDay(null);}}>Denne uken</button><button type="button" className="icon-btn" aria-label="Neste uke" onClick={()=>{setOverviewWeek(shiftISODate(overviewWeek,7));setExpandedWeekDay(null);}}><Icon name="chevron"/></button></div></div>
          <div className="weekly-agenda" aria-label="Ukeoversikt, sveip vannrett på mobil">{previewWeek.map(day=>{
            const meal=meals.find(item=>item.meal_date===day);
            const dayEvents=events.filter(item=>new Date(item.starts_at).toLocaleDateString('sv-SE')===day);
            const dayTasks=tasks.filter(item=>!item.completed&&item.due_on===day);
            const dayRoutines=overviewRoutines.filter(item=>item.occurrence_date===day);
            const firstEvent=dayEvents[0];
            const firstTask=firstEvent?undefined:dayTasks[0];
            const firstRoutine=firstEvent||firstTask?undefined:dayRoutines[0];
            const extraCount=dayEvents.length+dayTasks.length+dayRoutines.length-(firstEvent||firstTask||firstRoutine?1:0);
            const dateObj=new Date(day+'T12:00:00');
            return <div className={`weekly-day ${day===today?'is-today':''}`} key={day}>
              <div className="weekly-day-label"><strong>{dateObj.toLocaleDateString(locale,{weekday:'short'})}</strong><span>{dateObj.toLocaleDateString(locale,{day:'numeric',month:'short'})}</span>{day===today&&<span className="weekly-today-tag">I dag</span>}</div>
              <div className="weekly-day-content">
                <button type="button" className="weekly-meal" aria-label={`${day}: ${meal?.meal_name||'Planlegg middag'}`} onClick={()=>openMealEditor(day,meal)}><Icon name="meals" size={16}/><span>{meal?.status==='eaten'?(meal.actual_meal||meal.meal_name):meal?.meal_name||'Planlegg middag'}</span>{meal?.status==='eaten'&&<Icon name="check" size={14}/>}</button>
                {firstEvent&&<div className="weekly-detail" title={firstEvent.title}><Icon name="calendar" size={15}/><span>{new Date(firstEvent.starts_at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})} · {firstEvent.title}</span>{firstEvent.visibility==='private'&&<Icon name="lock" size={13}/>}</div>}
                {firstTask&&<div className="weekly-detail" title={firstTask.title}><Icon name="tasks" size={15}/><span>{firstTask.title}</span>{firstTask.visibility==='private'&&<Icon name="lock" size={13}/>}</div>}
                {firstRoutine&&<button type="button" className={`weekly-detail weekly-routine ${routineDone(firstRoutine.id,day)?'is-done':''}`} onClick={()=>{void toggleRoutine(firstRoutine,day);}} disabled={busy}><Icon name={routineDone(firstRoutine.id,day)?'check':'repeat'} size={15}/><span>{firstRoutine.title}</span></button>}
                {extraCount>0&&<button type="button" className="weekly-more" aria-expanded={expandedWeekDay===day} aria-controls="week-day-expanded" onClick={()=>setExpandedWeekDay(current=>current===day?null:day)}>{expandedWeekDay===day?'Skjul detaljer':`+ ${extraCount} flere`} <Icon name="chevron" size={14}/></button>}
              </div>
            </div>;
          })}</div>
          {expandedWeekDay&&previewWeek.includes(expandedWeekDay)&&(()=>{
            const day=expandedWeekDay;
            const dayEvents=events.filter(item=>new Date(item.starts_at).toLocaleDateString('sv-SE')===day);
            const dayTasks=tasks.filter(item=>!item.completed&&item.due_on===day);
            const dayRoutines=overviewRoutines.filter(item=>item.occurrence_date===day);
            const dayLabel=new Date(day+'T12:00:00').toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long'});
            return <div className="weekly-expanded" id="week-day-expanded" role="region" aria-label={`Detaljer for ${dayLabel}`}>
              <div className="weekly-expanded-head"><h3>{dayLabel}</h3><div className="weekly-expanded-actions"><button type="button" className="weekly-expanded-add" onClick={()=>openEventEditor(undefined,day)}><Icon name="plus" size={15}/> Avtale</button><button type="button" className="weekly-expanded-close" onClick={()=>setExpandedWeekDay(null)} aria-label="Lukk dagsdetaljer"><Icon name="close" size={17}/></button></div></div>
              <div className="weekly-expanded-list">
                {dayEvents.map(event=><div className="weekly-detail" key={event.id}><Icon name="calendar" size={16}/><span>{new Date(event.starts_at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})} · {event.title}</span>{event.visibility==='private'&&<Icon name="lock" size={13}/>}</div>)}
                {dayTasks.map(task=><div className="weekly-detail" key={task.id}><Icon name="tasks" size={16}/><span>{task.title}</span>{task.visibility==='private'&&<Icon name="lock" size={13}/>}</div>)}
                {dayRoutines.map(routine=><button type="button" key={routine.id} className={`weekly-detail weekly-routine ${routineDone(routine.id,day)?'is-done':''}`} onClick={()=>{void toggleRoutine(routine,day);}} disabled={busy}><Icon name={routineDone(routine.id,day)?'check':'repeat'} size={16}/><span>{routine.title}{routineCompletion(routine.id,day)&&<span className="weekly-completed-by"> · {memberName(routineCompletion(routine.id,day)?.completed_by)}</span>}</span>{routine.visibility==='private'&&<Icon name="lock" size={13}/>}</button>)}
              </div>
            </div>;
          })()}
          <p className="meal-hint">Middagene kan endres direkte fra ukeoversikten. Trykk «+ flere» for å se alt som skjer en dag. <span className="weekly-mobile-hint">Sveip sideveis for å se hele uken.</span></p>
        </section>
        </details>
        <details className="home-disclosure"><summary>Fullført nylig <span>Se hva dere har fått gjort</span></summary>
        <section className="panel home-completed" aria-labelledby="recent-completed-title">
          <div className="panel-head"><div><div className="eyebrow">TING DERE HAR FÅTT GJORT</div><h2 id="recent-completed-title">Fullført nylig</h2></div><button type="button" className="small-link" onClick={()=>{setTaskFilter('all');setPage('tasks');}}>Alle oppgaver <Icon name="chevron" size={16}/></button></div>
          {recentCompleted.length ? <div className="home-completed-list">{recentCompleted.map(item=><div className="home-completed-row" key={item.id}>
            <span className="completed-mark"><Icon name="check" size={16}/></span>
            <div className="item-text"><strong>{item.title}</strong><div className="item-meta"><span className="completion-info">{fullfilledBy(item.completedBy,item.when)}</span><SmallBadge type={item.visibility}/>{item.kind==='routine'&&<span>Fast oppgave</span>}</div></div>
          </div>)}</div>:<div className="compact-empty"><Icon name="check" size={20}/><p>Ingen fullførte oppgaver ennå. De dukker opp her når dere krysser av.</p></div>}
        </section>
        </details>
      </div>}
      {page==='tasks'&&<><section className="section-header"><div><div className="eyebrow">SMÅ STEG, STOR FORSKJELL</div><h1>Oppgaver</h1><p>Hold oversikt over det du gjør alene, og det dere gjør sammen.</p></div><button className="primary" onClick={()=>openTaskEditor()}><Icon name="plus" size={18}/> Ny oppgave</button></section>
        <section className="panel list-panel"><div className="panel-head"><h2>Å gjøre <span className="round-count">{visibleOpenTasks.length}</span></h2></div><div className="filters" aria-label="Filtrer oppgaver">{(['all','shared','private'] as const).map(f=><button key={f} className={taskFilter===f?'active':''} onClick={()=>setTaskFilter(f)}>{f==='all'?'Alle':f==='shared'?'Felles':'Private'}</button>)}</div>{visibleOpenTasks.map(task=><div key={task.id} className="task-row"><button className="check-circle" onClick={()=>{void toggleTask(task);}} disabled={busy} aria-label={`Fullfør ${task.title}`}><Icon name="check" size={14}/></button><div className="item-text"><strong>{task.title}</strong><div className="item-meta"><SmallBadge type={task.visibility}/>{task.due_on&&<span>Frist {niceDate(task.due_on)}</span>}</div></div><button className="edit-button" onClick={()=>openTaskEditor(task)} aria-label={`Rediger ${task.title}`}><Icon name="edit" size={17}/></button><button className="remove" onClick={()=>{void remove('hd_tasks',task.id);}} aria-label={`Slett ${task.title}`}><Icon name="trash" size={17}/></button></div>)}{!visibleOpenTasks.length&&<Empty title="Alt er gjort" detail="Legg til en oppgave når det dukker opp noe."/>}</section>
        {!!visibleDoneTasks.length&&<section className="panel list-panel done-panel"><h2>Fullført</h2>{visibleDoneTasks.map(task=><div key={task.id} className="task-row"><button className="check-circle checked" onClick={()=>{void toggleTask(task);}} disabled={busy} aria-label={`Gjenåpne ${task.title}`}><Icon name="check" size={14}/></button><div className="item-text"><strong>{task.title}</strong><div className="item-meta"><span className="completion-info"><Icon name="users" size={13}/>{fullfilledBy(task.completed_by,task.completed_at)}</span></div></div><button className="edit-button" onClick={()=>openTaskEditor(task)} aria-label={`Rediger ${task.title}`}><Icon name="edit" size={17}/></button><button className="remove" onClick={()=>{void remove('hd_tasks',task.id);}} aria-label={`Slett ${task.title}`}><Icon name="trash" size={17}/></button></div>)}</section>}
        <section className="panel routine-section" aria-labelledby="routines-title">
          <div className="panel-head"><div><div className="eyebrow">HUSARBEID SOM GJENTAR SEG</div><h2 id="routines-title">Faste oppgaver <span className="round-count">{filteredRoutines.length}</span></h2><p className="weekly-subtitle">Denne uken · Marker som gjort, så dukker oppgaven opp igjen neste gang.</p></div><button type="button" className="secondary-action" onClick={()=>openRoutineEditor()}><Icon name="plus" size={17}/> Fast oppgave</button></div>
          {filteredRoutines.map(routine=><div className="task-row" key={routine.id}>
            <button type="button" disabled={busy} className={`check-circle ${routineDone(routine.id,routine.occurrence_date)?'checked':''}`} onClick={()=>{void toggleRoutine(routine,routine.occurrence_date);}} aria-label={`${routineDone(routine.id,routine.occurrence_date)?'Angre':'Fullfør'} ${routine.title}`}><Icon name="check" size={14}/></button>
            <div className="item-text"><strong className={routineDone(routine.id,routine.occurrence_date)?'muted-strike':''}>{routine.title}</strong><div className="item-meta"><SmallBadge type={routine.visibility}/><span>{niceDate(routine.occurrence_date)} · {routine.interval_weeks===1?'Hver uke':'Annenhver uke'}</span>{routineCompletion(routine.id,routine.occurrence_date)&&<span className="completion-info"><Icon name="users" size={13}/>{fullfilledBy(routineCompletion(routine.id,routine.occurrence_date)?.completed_by,routineCompletion(routine.id,routine.occurrence_date)?.created_at)}</span>}</div></div>
            <button className="edit-button" type="button" aria-label={`Rediger ${routine.title}`} onClick={()=>openRoutineEditor(routine)}><Icon name="edit" size={17}/></button>
            <button className="remove" type="button" aria-label={`Slett ${routine.title}`} onClick={()=>{void removeRoutine(routine);}}><Icon name="trash" size={17}/></button>
          </div>)}
          {!filteredRoutines.length&&<div className="compact-empty"><Icon name="repeat" size={21}/><p>Ingen faste oppgaver denne uken.</p><button type="button" onClick={()=>openRoutineEditor()}>Lag en fast oppgave <Icon name="chevron" size={15}/></button></div>}
          {routines.filter(r=>!currentRoutines.some(c=>c.id===r.id)&&(taskFilter==='all'||r.visibility===taskFilter)).length>0&&<details className="future-routines"><summary>Andre faste oppgaver ({routines.filter(r=>!currentRoutines.some(c=>c.id===r.id)&&(taskFilter==='all'||r.visibility===taskFilter)).length})</summary>
            {routines.filter(r=>!currentRoutines.some(c=>c.id===r.id)&&(taskFilter==='all'||r.visibility===taskFilter)).map(r=><div key={r.id} className="task-row"><Icon name="repeat" size={17}/><div className="item-text"><strong>{r.title}</strong><div className="item-meta"><SmallBadge type={r.visibility}/><span>{r.interval_weeks===1?'Hver uke':'Annenhver uke'} · Starter {niceDate(r.start_on)}</span></div></div><button type="button" className="edit-button" aria-label={`Rediger ${r.title}`} onClick={()=>openRoutineEditor(r)}><Icon name="edit" size={17}/></button><button type="button" className="remove" aria-label={`Slett ${r.title}`} onClick={()=>{void removeRoutine(r);}}><Icon name="trash" size={17}/></button></div>)}</details>}
        </section>
      </>}
      {page==='shopping'&&<><section className="section-header"><div><div className="eyebrow">STORT OG SMÅTT</div><h1>Handlelister</h1><p>En felles liste for dere begge, og en egen liste bare for deg.</p></div></section><section className="panel list-panel"><div className="panel-head"><h2>{shoppingVisibility==='shared'?'Felles liste':'Min liste'} <span className="round-count">{unchecked.length}</span></h2><SmallBadge type={shoppingVisibility}/></div>{shoppingTabs}<p className="helper">{shoppingVisibility==='shared'?'Begge kan legge til, krysse av og slette varer her.':'Bare du kan se og endre varene på denne listen.'}</p><form onSubmit={saveGrocery} className="shopping-form"><input aria-label="Ny vare på valgt handleliste" value={groceryName} onChange={e=>setGroceryName(e.target.value)} maxLength={100} placeholder="F.eks. melk, brød eller kaffe" required/><div className="grocery-amount"><label>Mengde<input aria-label="Mengde" type="number" inputMode="decimal" min="0.001" max="99999" step="any" value={groceryQuantity} onChange={e=>setGroceryQuantity(e.target.value)} required/></label><label>Enhet<select value={groceryUnit} onChange={e=>setGroceryUnit(e.target.value)}>{groceryUnits.map(unit=><option key={unit}>{unit}</option>)}</select></label></div><button className="primary" disabled={busy} aria-label="Legg til vare"><Icon name="plus"/></button></form>
        {shoppingSuccess&&<p className="shopping-success" role="status">{shoppingSuccess}</p>}
        {unchecked.map(item=><div key={item.id} className="task-row"><button type="button" className="check-circle" disabled={busy} onClick={()=>{void toggleGrocery(item);}} aria-label={`Marker kjøpt ${item.name}`}><Icon name="check" size={14}/></button><button type="button" className="item-text grocery-edit" onClick={()=>openGroceryEditor(item)} disabled={busy} aria-label={`Rediger ${item.name}`}><strong>{item.name}</strong><span>{Number(item.quantity).toLocaleString(locale)} {item.unit}</span><Icon name="edit" size={14}/></button><button className="remove" disabled={busy} onClick={()=>{void remove('hd_shopping_items',item.id);}} aria-label={`Slett ${item.name}`}><Icon name="trash" size={17}/></button></div>)}
        {!unchecked.length&&<Empty title="Ingenting igjen å handle" detail="Legg til en vare over, eller flytt en vare tilbake fra Kjøpt."/>}
        {boughtGroceries.length>0&&<details className="bought-groceries" open><summary>Kjøpt <span className="round-count">{boughtGroceries.length}</span></summary><p className="helper">Kjøpte varer ryddes automatisk bort etter 24 timer når listen oppdateres. Trykk på krysset for å legge en vare tilbake.</p>
          {boughtGroceries.map(item=><div key={item.id} className="task-row dimmed"><button type="button" className="check-circle checked" disabled={busy} onClick={()=>{void toggleGrocery(item);}} aria-label={`Legg ${item.name} tilbake på handlelisten`}><Icon name="check" size={14}/></button><button type="button" className="item-text grocery-edit" onClick={()=>openGroceryEditor(item)} disabled={busy} aria-label={`Rediger ${item.name}`}><strong>{item.name}</strong><span>{Number(item.quantity).toLocaleString(locale)} {item.unit}</span><Icon name="edit" size={14}/></button></div>)}
          <button type="button" className="panel-add" disabled={busy} onClick={()=>{void clearBoughtGroceries();}}><Icon name="trash" size={16}/> Tøm kjøpte varer</button>
        </details>}
        </section></>}
      {page==='calendar'&&<>
        <section className="section-header"><div><div className="eyebrow">ALLE DAGENE DERES</div><h1>Kalender</h1><p>En enkel månedsoversikt for private og felles avtaler.</p></div><button type="button" className="primary" onClick={()=>openEventEditor(undefined,selectedCalendarDay)}><Icon name="plus" size={18}/> Ny avtale</button></section>
        <section className="panel calendar-panel" aria-labelledby="month-title">
          <div className="calendar-toolbar">
            <div><div className="eyebrow">MÅNEDSOVERSIKT</div><h2 id="month-title" className="calendar-month-title">{calendarTitle}</h2></div>
            <div className="month-controls"><button type="button" className="icon-btn month-nav" onClick={()=>setCalendarMonth(v=>shiftMonth(v,-1))} aria-label="Forrige måned"><Icon name="left"/></button><button type="button" className="today-btn" onClick={()=>{setCalendarMonth(today.slice(0,7));setSelectedCalendarDay(today);}}>I dag</button><button type="button" className="icon-btn month-nav" onClick={()=>setCalendarMonth(v=>shiftMonth(v,1))} aria-label="Neste måned"><Icon name="chevron"/></button></div>
          </div>
          <div className="filters" aria-label="Vis avtaler">{(['all','shared','private'] as const).map(f=><button type="button" key={f} className={eventFilter===f?'active':''} aria-pressed={eventFilter===f} onClick={()=>setEventFilter(f)}>{f==='all'?'Alle':f==='shared'?'Felles':'Private'}</button>)}</div>
          <div className="month-calendar" role="region" tabIndex={0} aria-label={`Kalender for ${calendarTitle}`}>
            <div className="month-weekdays">{['Man','Tir','Ons','Tor','Fre','Lør','Søn'].map(day=><div key={day}>{day}</div>)}</div>
            <div className="month-grid">{calendarDays.map(day=>{
              const dayEvents=visibleEvents.filter(ev=>localISODate(new Date(ev.starts_at))===day);
              const isCurrentMonth=day.slice(0,7)===calendarMonth;
              return <div className={`month-cell ${!isCurrentMonth?'outside-month':''} ${day===today?'month-today':''} ${day===selectedCalendarDay?'month-selected':''}`} key={day}>
                <button type="button" className="month-day-button" aria-label={`${new Date(`${day}T12:00:00`).toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long'})}, ${dayEvents.length} avtaler`} aria-pressed={day===selectedCalendarDay} onClick={()=>{setSelectedCalendarDay(day);if(!isCurrentMonth)setCalendarMonth(day.slice(0,7));}}><span className="month-day-number">{Number(day.slice(-2))}</span></button>
                <div className="month-day-events">{dayEvents.map(ev=><button type="button" className={`month-event-chip ${ev.visibility}`} key={ev.id} onClick={()=>openEventEditor(ev)} aria-label={`Rediger ${ev.title}, ${niceEventDate(ev.starts_at)}, ${ev.visibility==='private'?'privat':'felles'}`}><time dateTime={ev.starts_at}>{new Date(ev.starts_at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</time><span>{ev.title}</span></button>)}</div>
                <button type="button" className="month-day-add" aria-label={`Legg til avtale ${niceDate(day)}`} title="Ny avtale" onClick={()=>{setSelectedCalendarDay(day);setCalendarMonth(day.slice(0,7));openEventEditor(undefined,day);}}><Icon name="plus" size={15}/></button>
              </div>;
            })}</div>
          </div>
          <p className="calendar-scroll-hint">Sveip sidelengs for å se hele uken.</p>
          <div className="calendar-key"><span><i className="calendar-key-dot shared"/> Felles</span><span><i className="calendar-key-dot private"/> Privat</span><span>Trykk på en avtale for å redigere den.</span></div>
        </section>
        <section className="panel calendar-day-panel" aria-labelledby="selected-day-title">
          <div className="panel-head"><div><div className="eyebrow">VALGT DATO</div><h2 id="selected-day-title">{selectedDayTitle}</h2></div><button type="button" className="secondary-action" onClick={()=>openEventEditor(undefined,selectedCalendarDay)}><Icon name="plus" size={16}/> Legg til avtale</button></div>
          {selectedCalendarEvents.map(ev=><div key={ev.id} className="event-row"><div className="event-date"><strong>{new Date(ev.starts_at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</strong></div><div className="item-text"><strong>{ev.title}</strong><div className="item-meta"><SmallBadge type={ev.visibility}/></div></div><button type="button" className="edit-button" onClick={()=>openEventEditor(ev)} aria-label={`Rediger ${ev.title}`}><Icon name="edit" size={17}/></button><button type="button" className="remove" onClick={()=>{void remove('hd_events',ev.id);}} aria-label={`Slett ${ev.title}`}><Icon name="trash" size={17}/></button></div>)}
          {!selectedCalendarEvents.length&&<div className="compact-empty"><Icon name="calendar" size={21}/><p>Ingen avtaler denne dagen.</p><button type="button" onClick={()=>openEventEditor(undefined,selectedCalendarDay)}>Legg til en avtale <Icon name="chevron" size={15}/></button></div>}
        </section>
      </>}
      {page==='meals'&&<>
        <section className="section-header"><div><div className="eyebrow">VÅRE MIDDAGER</div><h1>Matkalender</h1><p>Planlegg middagene sammen, og husk hva dere faktisk spiste.</p></div><button className="primary" onClick={()=>openMealEditor(todayStr(),meals.find(m=>m.meal_date===todayStr()))}><Icon name="plus" size={18}/> Middag</button></section>
        <section className="panel meal-section">
          <div className="meal-week-head"><div><div className="eyebrow">UKEPLAN</div><h2>{niceDate(displayedWeek[0])} – {niceDate(displayedWeek[6])}</h2><p>{plannedThisWeek} av 7 dager planlagt · {meals.filter(m=>displayedWeek.includes(m.meal_date)&&m.status==='eaten').length} spist</p></div>
            <div className="week-controls"><button type="button" className="icon-btn" aria-label="Forrige uke" onClick={()=>setMealWeek(shiftISODate(mealWeek,-7))}><Icon name="left"/></button><button type="button" className="today-btn" disabled={mealWeek===currentMonday} onClick={()=>setMealWeek(currentMonday)}>Denne uken</button><button type="button" className="icon-btn" aria-label="Neste uke" onClick={()=>setMealWeek(shiftISODate(mealWeek,7))}><Icon name="chevron"/></button></div>
          </div>
          <div className="meal-week-grid">{displayedWeek.map(date=>{
            const meal=meals.find(m=>m.meal_date===date);
            const isToday=date===today;
            const dateObj=new Date(date+'T12:00:00');
            return <article key={date} className={`meal-day ${isToday?'is-today':''} ${meal?.status==='eaten'?'is-eaten':''}`}>
              <header className="meal-day-head"><div><span>{dateObj.toLocaleDateString(locale,{weekday:'long'})}</span><strong>{dateObj.toLocaleDateString(locale,{day:'numeric',month:'short'})}</strong></div>{isToday&&<span className="today-pill">I dag</span>}</header>
              {meal?<>
                <div className="meal-main"><span className={`meal-status ${meal.status}`}>{meal.status==='eaten'?'✓ Spist':'Planlagt'}</span><strong>{meal.status==='eaten'?(meal.actual_meal||meal.meal_name):meal.meal_name}</strong>{meal.status==='eaten'&&meal.actual_meal&&meal.actual_meal!==meal.meal_name&&<p>Planlagt: {meal.meal_name}</p>}{meal.notes&&<p>{meal.notes}</p>}</div>
                <div className="meal-actions"><button type="button" disabled={busy} className="meal-action-done" onClick={()=>{void toggleMeal(meal);}}>{meal.status==='eaten'?'Angre spist':'Marker spist'}</button><button type="button" aria-label={`Rediger ${meal.meal_name}`} className="meal-action-icon" onClick={()=>openMealEditor(date,meal)}><Icon name="edit" size={18}/></button><button type="button" aria-label={`Slett ${meal.meal_name}`} className="meal-action-icon" onClick={()=>{void removeMeal(meal);}}><Icon name="trash" size={18}/></button></div>
              </>:<button className="meal-add-day" type="button" onClick={()=>openMealEditor(date)}><Icon name="plus" size={18}/><span>Planlegg middag</span></button>}
            </article>;
          })}</div>
          <p className="meal-hint">Bla bakover for å se hva dere spiste tidligere uker. Begge kan endre planen.</p>
        </section>
        <section className="panel recipe-section" aria-labelledby="recipes-title">
          <div className="panel-head"><div><div className="eyebrow">LAGRE FAVORITTENE DERES</div><h2 id="recipes-title">Middagsbibliotek <span className="round-count">{recipes.length}</span></h2><p className="weekly-subtitle">Oppskrifter og ingredienser dere vil bruke igjen.</p></div><button type="button" className="secondary-action" onClick={()=>openRecipeEditor()}><Icon name="plus" size={17}/> Ny oppskrift</button></div>
          <div className="filters" aria-label="Vis oppskrifter"><button type="button" className={recipeFilter==='all'?'active':''} onClick={()=>setRecipeFilter('all')}>Alle</button><button type="button" className={recipeFilter==='favorites'?'active':''} onClick={()=>setRecipeFilter('favorites')}>Favoritter</button></div>
          <div className="recipe-grid">{shownRecipes.map(recipe=><article key={recipe.id} className="recipe-card"><div className="recipe-top"><div><h3>{recipe.name}</h3><span className="eyebrow">FELLES OPPSKRIFT</span></div><button type="button" className={`recipe-favorite ${recipe.favorite?'is-favorite':''}`} disabled={busy} onClick={()=>{void toggleFavorite(recipe);}} aria-label={`${recipe.favorite?'Fjern':'Legg til'} favoritt: ${recipe.name}`} aria-pressed={recipe.favorite}><Icon name="star" size={21}/></button></div>
            {(recipe.ingredients||recipe.instructions)&&<details className="recipe-details"><summary>Se oppskrift</summary>{recipe.ingredients&&<div><strong>Ingredienser</strong><p>{recipe.ingredients}</p></div>}{recipe.instructions&&<div><strong>Fremgangsmåte</strong><p>{recipe.instructions}</p></div>}</details>}
            <button type="button" className="recipe-shopping" disabled={!recipe.ingredients.trim()||busy} onClick={()=>openIngredientPicker(recipe)}><Icon name="shopping" size={18}/> Til handlelisten</button>
            <div className="recipe-actions"><button type="button" className="recipe-plan" onClick={()=>{const date=displayedWeek.find(d=>!meals.some(m=>m.meal_date===d))||today;openMealEditor(date,meals.find(m=>m.meal_date===date));setMealName(recipe.name);setSelectedRecipeId(recipe.id);}}><Icon name="calendar" size={16}/> Planlegg</button><button type="button" className="recipe-icon" onClick={()=>openRecipeEditor(recipe)} aria-label={`Rediger ${recipe.name}`}><Icon name="edit" size={18}/></button><button type="button" className="recipe-icon" onClick={()=>{void removeRecipe(recipe);}} aria-label={`Slett ${recipe.name}`}><Icon name="trash" size={18}/></button></div>
          </article>)}</div>
          {!shownRecipes.length&&<Empty title={recipeFilter==='favorites'?'Ingen favoritter ennå':'Middagsbiblioteket er tomt'} detail="Lagre en middag dere liker, så finner dere den igjen neste uke."/>}
        </section>
      </>}
      <footer className="page-footer"><Icon name="heart" size={14}/> Litt mindre stress, litt mer oss.</footer>
    </main></div>
    <nav className="bottom-nav" aria-label="Hovedmeny">{nav.map(([id,label,icon])=><button key={id} type="button" aria-current={page===id?'page':undefined} className={page===id?'selected':''} onClick={()=>setPage(id)}><Icon name={icon} size={21}/><span>{label}</span></button>)}</nav>
    {modal==='grocery'&&<Modal title="Rediger vare" onClose={()=>{if(!busy)closeModal();}}><form onSubmit={saveGroceryEdit} className="dialog-form"><label>Varenavn<input autoFocus value={editGroceryName} onChange={e=>setEditGroceryName(e.target.value)} maxLength={100} required/></label><div className="grocery-amount"><label>Mengde<input type="number" inputMode="decimal" min="0.001" max="99999" step="any" value={editGroceryQuantity} onChange={e=>setEditGroceryQuantity(e.target.value)} required/></label><label>Enhet<select value={editGroceryUnit} onChange={e=>setEditGroceryUnit(e.target.value)}>{groceryUnits.map(unit=><option key={unit}>{unit}</option>)}</select></label></div>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy}>{busy?'Lagrer …':'Lagre endringer'}</button></form></Modal>}
    {modal==='ingredients'&&<Modal title={ingredientTitle} onClose={()=>{if(!busy)closeModal();}}><form onSubmit={saveIngredients} className="dialog-form"><p className="helper">Velg det dere trenger, og kontroller mengdene. Varene legges i {ingredientScope==='shared'?'felleslisten':'din private liste'}.</p><div className="ingredient-picker">{ingredientRows.map((row,index)=>{
      const match=matchingGrocery(row.name,row.unit,ingredientScope);
      return <fieldset className="ingredient-row" key={index} disabled={busy}><legend className="sr-only">Ingrediens {index+1}</legend><label className="ingredient-select"><input type="checkbox" checked={row.selected} onChange={e=>updateIngredient(index,{selected:e.target.checked})}/> Ta med</label><label>Vare<input value={row.name} onChange={e=>updateIngredient(index,{name:e.target.value})} maxLength={100} required={row.selected} disabled={!row.selected}/></label><div className="grocery-amount"><label>Mengde<input type="number" inputMode="decimal" min="0.001" max="99999" step="any" value={row.quantity} onChange={e=>updateIngredient(index,{quantity:e.target.value})} required={row.selected} disabled={!row.selected}/></label><label>Enhet<select value={row.unit} onChange={e=>updateIngredient(index,{unit:e.target.value})} disabled={!row.selected}>{groceryUnits.map(unit=><option key={unit}>{unit}</option>)}</select></label></div>{match&&<label>På listen: {Number(match.quantity).toLocaleString(locale)} {match.unit}<select value={row.merge?'merge':'new'} onChange={e=>updateIngredient(index,{merge:e.target.value==='merge'})} disabled={!row.selected}><option value="merge">Øk mengden på eksisterende vare</option><option value="new">Legg til som egen vare</option></select></label>}</fieldset>;
    })}</div>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy||!ingredientRows.some(row=>row.selected)}>{busy?'Lagrer …':`Legg til ${ingredientRows.filter(row=>row.selected).length} ${ingredientRows.filter(row=>row.selected).length===1?'vare':'varer'}`}</button></form></Modal>}
    {modal==='meal'&&<Modal title={editingMeal?'Rediger middag':'Planlegg middag'} onClose={closeModal}><form onSubmit={saveMeal} className="dialog-form"><label>Dato<input type="date" value={mealDate} onChange={e=>setMealDate(e.target.value)} required/></label><label>Velg fra middagsbiblioteket (valgfritt)<select value={selectedRecipeId} onChange={e=>{const r=recipes.find(item=>item.id===e.target.value);setSelectedRecipeId(e.target.value);if(r)setMealName(r.name);}}><option value="">Skriv en egen middag</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.favorite?"★ ":""}{r.name}</option>)}</select></label><label>Hva skal dere spise?<input autoFocus value={mealName} onChange={e=>setMealName(e.target.value)} placeholder="F.eks. kyllingwok" maxLength={100} required/></label>{editingMeal?.status==='eaten'&&<label>Det dere faktisk spiste<input value={mealActual} onChange={e=>setMealActual(e.target.value)} maxLength={100} placeholder={mealName||'Hva spiste dere?'}/></label>}<label>Notat (valgfritt)<textarea value={mealNotes} onChange={e=>setMealNotes(e.target.value)} maxLength={500} rows={3} placeholder="F.eks. oppskrift, tilbehør eller restemat"/></label><p className="helper">Middagsplanen er felles for begge. Etter maten kan dere trykke «Marker spist».</p>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy}>{busy?'Lagrer …':'Lagre middag'}<Icon name="arrow" size={18}/></button></form></Modal>}
    {modal==='recipe'&&<Modal title={editingRecipe?'Rediger oppskrift':'Ny oppskrift'} onClose={closeModal}><form onSubmit={saveRecipe} className="dialog-form"><label>Navn på middag<input value={recipeName} onChange={e=>setRecipeName(e.target.value)} maxLength={100} placeholder="F.eks. pasta med pesto" autoFocus required/></label><label>Ingredienser (valgfritt)<textarea rows={5} maxLength={4000} value={recipeIngredients} onChange={e=>setRecipeIngredients(e.target.value)} placeholder="Skriv én ingrediens per linje"/></label><label>Fremgangsmåte (valgfritt)<textarea rows={4} maxLength={4000} value={recipeInstructions} onChange={e=>setRecipeInstructions(e.target.value)} placeholder="Hvordan lager dere retten?"/></label><label className="checkbox-label"><input type="checkbox" checked={recipeFavorite} onChange={e=>setRecipeFavorite(e.target.checked)}/> Legg til som favoritt</label>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy}>{busy?'Lagrer …':'Lagre oppskrift'}<Icon name="arrow" size={18}/></button></form></Modal>}
    {modal==='routine'&&<Modal title={editingRoutine?'Rediger fast oppgave':'Ny fast oppgave'} onClose={closeModal}><form onSubmit={saveRoutine} className="dialog-form"><label>Hva skal gjøres?<input autoFocus value={routineTitle} onChange={e=>setRoutineTitle(e.target.value)} maxLength={100} required placeholder="F.eks. vaske bad"/></label><label>Første gang<input type="date" value={routineStart} onChange={e=>setRoutineStart(e.target.value)} required/></label><label>Gjentas<select value={routineInterval} onChange={e=>setRoutineInterval(Number(e.target.value) as 1|2)}><option value={1}>Hver uke</option><option value={2}>Annenhver uke</option></select></label><div className="form-label">Hvem kan se oppgaven?</div><div className="visibility-grid"><button type="button" disabled={!!editingRoutine} className={routineVisibility==='private'?'chosen':''} onClick={()=>setRoutineVisibility('private')}><Icon name="lock" size={18}/><strong>Kun meg</strong><small>Privat</small></button><button type="button" disabled={!!editingRoutine} className={routineVisibility==='shared'?'chosen':''} onClick={()=>setRoutineVisibility('shared')}><Icon name="users" size={18}/><strong>Felles</strong><small>Begge kan krysse av</small></button></div><p className="helper">En fast oppgave dukker automatisk opp på samme ukedag. Når den er utført, kommer den tilbake neste uke eller annenhver uke.</p>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy}>{busy?'Lagrer …':'Lagre fast oppgave'}<Icon name="arrow" size={18}/></button></form></Modal>}
    {modal==='task'&&<Modal title={editingTask?'Rediger oppgave':'Ny oppgave'} onClose={closeModal}>
      <form onSubmit={saveTask} className="dialog-form task-editor">
        <p className="task-editor-lead">{editingTask?'Oppdater beskrivelsen eller fristen.':'Få det ut av hodet og inn i oversikten deres.'}</p>
        <section className="task-editor-section">
          <span className="task-editor-step"><span>1</span> Hva skal gjøres?</span>
          <label htmlFor="task-editor-title" className="task-editor-label">Oppgave
            <input id="task-editor-title" autoFocus value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} maxLength={100} placeholder="F.eks. vaske badet" required/>
          </label>
          {!editingTask&&<div className="task-suggestions" aria-label="Forslag til oppgaver">
            {['Vaske badet','Ta ut søppelet','Støvsuge'].map(label=><button key={label} type="button" onClick={()=>setTaskTitle(label)}>{label}</button>)}
          </div>}
        </section>
        <section className="task-editor-section">
          <span className="task-editor-step"><span>2</span> Når passer det?</span>
          <div className="task-date-options" role="group" aria-label="Velg frist">
            {[{label:'Ingen frist',value:''},{label:'I dag',value:todayStr()},{label:'I morgen',value:shiftISODate(todayStr(),1)}].map(option=><button key={option.label} type="button" className={taskDue===option.value?'active':''} aria-pressed={taskDue===option.value} onClick={()=>setTaskDue(option.value)}>{option.label}</button>)}
          </div>
          <label htmlFor="task-editor-date" className="task-editor-label">Eller velg en dato
            <input id="task-editor-date" type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)}/>
          </label>
        </section>
        <section className="task-editor-section">
          <span className="task-editor-step"><span>3</span> Hvem skal se den?</span>
          <div className="task-visibility-options" role="group" aria-label="Hvem skal se oppgaven?">
            <button type="button" disabled={!!editingTask} aria-pressed={taskVisibility==='shared'} className={taskVisibility==='shared'?'selected':''} onClick={()=>setTaskVisibility('shared')}>
              <span className="visibility-symbol"><Icon name="users" size={19}/></span><span><strong>Felles oppgave</strong><small>Synlig for dere begge</small></span><span className="selection-dot" aria-hidden="true"/>
            </button>
            <button type="button" disabled={!!editingTask} aria-pressed={taskVisibility==='private'} className={taskVisibility==='private'?'selected':''} onClick={()=>setTaskVisibility('private')}>
              <span className="visibility-symbol"><Icon name="lock" size={19}/></span><span><strong>Bare for meg</strong><small>Kun synlig på din konto</small></span><span className="selection-dot" aria-hidden="true"/>
            </button>
          </div>
          {editingTask&&<p className="task-editor-note">Synlighet kan ikke endres på en eksisterende oppgave. Lag en ny for å endre den.</p>}
        </section>
        {notice&&<div className="notice" role="alert">{notice}</div>}
        <button className="primary full task-submit" disabled={busy||!taskTitle.trim()}>{busy?'Lagrer …':editingTask?'Lagre endringer':'Legg til oppgave'}<Icon name="check" size={19}/></button>
        {!editingTask&&<button className="task-repeat-link" type="button" onClick={()=>{closeModal();openRoutineEditor();}}><Icon name="repeat" size={17}/> Skal den gjentas? Lag en fast oppgave <Icon name="chevron" size={15}/></button>}
      </form>
    </Modal>}
    {modal==='event'&&<Modal title={editingEvent?"Rediger avtale":"Ny avtale"} onClose={closeModal}><form onSubmit={saveEvent} className="dialog-form"><label>Hva skal skje?<input autoFocus value={eventTitle} onChange={e=>setEventTitle(e.target.value)} maxLength={100} placeholder="F.eks. middag sammen" required/></label><label>Når?<input type="datetime-local" value={eventDate} onChange={e=>setEventDate(e.target.value)} required/></label><div className="form-label">Hvem kan se den?</div><div className="visibility-grid"><button type="button" disabled={!!editingEvent} className={eventVisibility==='private'?'chosen':''} onClick={()=>setEventVisibility('private')}><Icon name="lock" size={18}/><strong>Kun meg</strong><small>Privat</small></button><button type="button" disabled={!!editingEvent} className={eventVisibility==='shared'?'chosen':''} onClick={()=>setEventVisibility('shared')}><Icon name="users" size={18}/><strong>Felles</strong><small>Synlig for begge</small></button></div>{notice&&<div className="notice" role="alert">{notice}</div>}<button className="primary full" disabled={busy}>{busy?'Lagrer …':editingEvent?'Lagre endringer':'Legg til avtale'}<Icon name="arrow" size={18}/></button></form></Modal>}
    {showCode&&<Modal title="Inviter kjæresten din" onClose={()=>setShowCode(false)}><div className="invite-content"><div className="invite-graphic"><Icon name="heart" size={32}/></div><p>Be kjæresten din lage en konto i Hverdags og velge <b>«Bli med»</b>. Del denne koden privat:</p><div className="invite-code">{household.invite_code}</div><button className="primary full" onClick={()=>{if(navigator.clipboard)void navigator.clipboard.writeText(household.invite_code).then(()=>setNotice('Invitasjonskoden er kopiert')).catch(()=>setNotice('Marker og kopier koden manuelt'));else setNotice('Marker og kopier koden manuelt');setShowCode(false);}}><Icon name="copy" size={18}/> Kopier invitasjonskode</button><p className="helper">Hvert hjem har plass til to personer. Koden gir tilgang til felles innhold, så del den kun med kjæresten din.</p><button className="text-button" onClick={()=>{setShowCode(false);void api.auth.signOut();}}>Logg ut</button></div></Modal>}
  </div>;
}

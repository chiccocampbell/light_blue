import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Toaster, toast } from "sonner";
import { Calendar, Download, Gift, Plus, PiggyBank, Trophy, Wallet, TrendingDown, Settings, Trash2, Bell, Coins, ArrowRightLeft, Share2, Smartphone, Home, List, PlusCircle, X, Filter } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar, Legend, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

/**
 * TwoNest Budget — Couples Expense, Budgeting, Gamified 💚 (light-blue theme)
 * - Bill-splitting + settlements (count in monthly spending, but excluded from per-category totals)
 * - Smart budget alerts
 * - Savings goals with animations
 * - LocalStorage persistence
 * - Mobile bottom nav + quick filters + Share-to-phone link (QR/Web Share) with import
 */

const DEFAULT_CATEGORIES = [
  "Groceries","Dining Out","Rent / Mortgage","Utilities","Transport","Entertainment","Travel","Health","Gifts","Other",
];
const DEFAULT_USERS = ["You","Partner"];
const COLOR_POOL = ["#60a5fa","#22c55e","#a78bfa","#f59e0b","#ef4444","#14b8a6","#6366f1","#84cc16","#06b6d4","#fb7185"];

const uid = () => Math.random().toString(36).slice(2,10);
const monthKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const formatCurrency = (n:number,c="EUR") => { try { return new Intl.NumberFormat(undefined,{style:"currency",currency:c}).format(n);} catch{ return `${c} ${Number(n||0).toFixed(2)}`; } };
const sum = (a:number[])=>a.reduce((x,y)=>x+y,0);
const groupBy = <T,>(arr:T[], keyFn:(it:T)=>string)=>arr.reduce((acc:any,it:T)=>{const k=keyFn(it); (acc[k] ||= []).push(it); return acc;},{} as Record<string,T[]>);

const demoSeed = () => {
  const today = new Date();
  const transactions = [
    { id: uid(), date: today.toISOString().slice(0,10), user: "You", type: "income", category: "Salary", amount: 2500, notes: "Payday" },
    { id: uid(), date: today.toISOString().slice(0,10), user: "You", type: "expense", category: "Groceries", amount: 62.5, notes: "Weekly shop", split: "even", shares: { You: 31.25, Partner: 31.25 } },
    { id: uid(), date: today.toISOString().slice(0,10), user: "Partner", type: "expense", category: "Transport", amount: 18.9, notes: "Bus card", split: "none" },
  ];
  const budgets = { overall: 1600, perCategory: Object.fromEntries(DEFAULT_CATEGORIES.map(c=>[c, c==="Rent / Mortgage"? 900:150])), currency: "EUR", alertThreshold: 0.8 };
  const settings = { users: DEFAULT_USERS, categories: DEFAULT_CATEGORIES, currency: "EUR", appName: "TwoNest Budget" };
  const goals = [{ id: uid(), name: "Weekend getaway", target: 300, saved: 50, due: null }];
  return { transactions, budgets, settings, goals, meta:{created:new Date().toISOString()}, gamification: defaultGamificationState() };
};

function defaultGamificationState(){ return { xp:0, level:1, noSpendStreak:0, underBudgetStreak:0, badges:[], lastActivityDate:null, weeklyChallenge:null } }
function calcLevel(xp:number){ let lvl=1, thr=0, step=100; while(xp>=thr+step){ thr+=step; step+=50; lvl++; } return lvl; }
function useLocalState<T>(key:string, initial:()=>T){ const [s, setS]=useState<T>(()=>{ const r=typeof window!=='undefined'? localStorage.getItem(key): null as any; return r? JSON.parse(r): initial()}); useEffect(()=>{ if(typeof window!=='undefined'){ localStorage.setItem(key, JSON.stringify(s));}},[key,s]); return [s,setS] as const }
function toCSV(rows:any[]){ if(!rows.length) return ""; const keys=Object.keys(rows[0]); const header=keys.join(","); const body=rows.map(r=>keys.map(k=>JSON.stringify(r[k]??"" )).join(",")).join("\n"); return `${header}\n${body}`; }

// Share helpers (encode current state into URL hash)
function encodeShare(obj:any){ try{ const json=JSON.stringify(obj); return btoa(unescape(encodeURIComponent(json))); }catch(e){ console.warn('encodeShare failed',e); return ''; } }
function decodeShare(s:string){ try{ const json=decodeURIComponent(escape(atob(s))); return JSON.parse(json); }catch(e){ console.warn('decodeShare failed',e); return null; } }

export default function App(){
  const [data, setData] = useLocalState("twonest-budget-app", demoSeed);
  const { transactions, budgets, settings, goals }: any = data;

  const [dateFilter, setDateFilter] = useState(()=>monthKey(new Date()));
  const [typeFilter, setTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [search, setSearch] = useState("");

  // PWA install helper (UI only; real SW registration happens in src/main.tsx)
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [showPwa, setShowPwa] = useState(false);
  useEffect(()=>{
    const handler = (e:any)=>{ e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return ()=>window.removeEventListener('beforeinstallprompt', handler);
  },[]);
  const canInstall = !!installEvt;
  const doInstall = async ()=>{ if(!installEvt){ setShowPwa(true); return; } installEvt.prompt(); try{ await installEvt.userChoice; }catch{} finally{ setInstallEvt(null); } };

  // Share / Import
  const [showShare, setShowShare] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const shareUrl = useMemo(()=>{
    if (typeof window==='undefined') return '';
    const payload = { transactions, budgets, settings, goals };
    const encoded = encodeShare(payload);
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#twonest=${encodeURIComponent(encoded)}`;
  },[transactions, budgets, settings, goals]);

  useEffect(()=>{
    if (typeof window==='undefined') return;
    const h = window.location.hash || '';
    if (h.startsWith('#twonest=')){
      const encoded = decodeURIComponent(h.slice('#twonest='.length));
      const parsed = decodeShare(encoded);
      if (parsed){ setImportData(parsed); setShowShare(true); }
    }
  },[]);

  const monthTx = useMemo(()=> transactions.filter((t:any)=> t.date.startsWith(dateFilter)), [transactions, dateFilter]);
  const visibleTx = useMemo(()=> {
    const s = search.trim().toLowerCase();
    const out = monthTx.filter((t:any)=>
      (typeFilter==='all'||t.type===typeFilter) &&
      (userFilter==='all'||t.user===userFilter) &&
      (s==='' || `${t.category} ${t.notes||''} ${t.user}`.toLowerCase().includes(s))
    );
    return out.slice().sort((a:any,b:any)=> b.date.localeCompare(a.date));
  }, [monthTx, typeFilter, userFilter, search]);

  // Include settlement in overall monthly spending; exclude from per-category totals
  const monthlyTotals = useMemo(()=>({
    expense: sum(monthTx.filter((t:any)=> (t.type==='expense' || t.type==='settlement')).map((t:any)=>t.amount)),
    income: sum(monthTx.filter((t:any)=> t.type==='income').map((t:any)=>t.amount)),
  }),[monthTx]);

  const categoryTotals = useMemo(()=>{
    const byCat = groupBy(monthTx.filter((t:any)=> t.type==='expense'), (t:any)=>t.category);
    return Object.entries(byCat).map(([cat,items]: any)=>({ name:cat, value: sum(items.map((i:any)=>i.amount))})).sort((a:any,b:any)=>b.value-a.value);
  },[monthTx]);

  const currency = budgets.currency || settings.currency || "EUR";

  // Gamification (minimal XP rules)
  const [game, setGame] = useLocalState('twonest-gamification', ()=> ({ xp:0, level:1, noSpendStreak:0, underBudgetStreak:0, badges:[], lastActivityDate:null }));
  useEffect(()=>{ setGame((g:any)=>({ ...{ xp:0, level:1, noSpendStreak:0, underBudgetStreak:0, badges:[], lastActivityDate:null }, ...g })); },[]);
  useEffect(()=>{
    const today = new Date().toISOString().slice(0,10);
    const hadAnyToday = transactions.some((t:any)=>t.date===today);
    const hadExpenseToday = transactions.some((t:any)=>t.date===today && t.type==='expense');
    setGame((g:any)=>{ let u={...g}; if(g.lastActivityDate!==today && hadAnyToday) u.lastActivityDate=today; if(!hadExpenseToday && u.lastActivityDate===today){ u.noSpendStreak=(u.noSpendStreak||0)+1; u.xp+=10; } u.level=calcLevel(u.xp); return u;});
  },[transactions]);
  const underBudget = useMemo(()=> (budgets.overall||0)>0 ? monthlyTotals.expense <= budgets.overall : false, [budgets.overall, monthlyTotals.expense]);
  useEffect(()=>{ if(underBudget){ setGame((g:any)=>{ const u={...g, underBudgetStreak:(g.underBudgetStreak||0)+1, xp:g.xp+20}; u.level=calcLevel(u.xp); return u;});}},[underBudget]);

  // Alerts
  const [alerted, setAlerted] = useLocalState<any>("twonest-alerted", ()=>({}));
  useEffect(()=>{
    const key=(k:string)=>`${dateFilter}:${k}`;
    const overallPct = budgets.overall ? monthlyTotals.expense/(budgets.overall||1) : 0;
    if(budgets.overall && overallPct>=(budgets.alertThreshold||0.8) && !alerted[key('overall80')]){ toast.message('Overall budget nearing limit',{ description: `${Math.round(overallPct*100)}% used`}); setAlerted((a:any)=>({...a,[key('overall80')]:true})); }
    if(budgets.overall && overallPct>=1 && !alerted[key('overall100')]){ toast.error('Budget exceeded',{ description: `You've passed ${formatCurrency(budgets.overall,currency)}`}); setAlerted((a:any)=>({...a,[key('overall100')]:true})); }
  },[monthlyTotals.expense, budgets.overall, budgets.alertThreshold, dateFilter]);
  useEffect(()=>{
    const key=(k:string)=>`${dateFilter}:${k}`;
    const spendByCat: Record<string, number> = {}; for(const t of monthTx as any){ if(t.type==='expense') spendByCat[t.category]=(spendByCat[t.category]||0)+t.amount; }
    for(const [cat,limit] of Object.entries(budgets.perCategory||{})){
      if(!limit) continue; const pct=(spendByCat[cat]||0)/Number(limit);
      if(pct>=(budgets.alertThreshold||0.8) && !alerted[key(`cat80:${cat}`)]){ toast('Heads-up',{ description: `${cat} at ${Math.round(pct*100)}% of budget`}); setAlerted((a:any)=>({...a,[key(`cat80:${cat}`)]:true})); }
      if(pct>=1 && !alerted[key(`cat100:${cat}`)]){ toast.error(`${cat} over budget`); setAlerted((a:any)=>({...a,[key(`cat100:${cat}`)]:true})); }
    }
  },[monthTx, budgets.perCategory, budgets.alertThreshold, dateFilter]);

  // Split & Settle ledger (settlement moves balance toward zero)
  const balances = useMemo(()=>{
    const users=settings.users; const you=users[0], partner=users[1]; let bal=0;
    for(const t of monthTx as any){
      if(t.type!=='expense' && t.type!=='settlement') continue;
      if(t.type==='expense'){
        const payer=t.user; const total=t.amount; let shares=t.shares;
        if(t.split==='even' && users.length===2){ const each=total/2; shares={ [you]:each, [partner]:each }; }
        if(t.split!=='none' && shares){ const yourShare=shares[you]||0, partnerShare=shares[partner]||0; if(payer===you) bal+=partnerShare; else if(payer===partner) bal-=yourShare; }
      } else if(t.type==='settlement'){
        if(t.user===you) bal+=t.amount; else if(t.user===partner) bal-=t.amount;
      }
    }
    return { amount: bal, creditor: bal>0 ? you : (bal<0 ? partner : null) };
  },[monthTx, settings.users]);

  function addTransaction(tx:any){ setData((d:any)=>({...d, transactions:[...d.transactions, { id:uid(), ...tx }]})); setGame((g:any)=>{ const add= tx.type==='expense'?1:5; const xp=g.xp+add; return { ...g, xp, level: calcLevel(xp) }; }); toast.success(`${tx.type==='expense'? 'Expense' : tx.type==='income'? 'Income':'Settlement'} added`); }
  function deleteTransaction(id:string){ setData((d:any)=>({...d, transactions: d.transactions.filter((t:any)=>t.id!==id)})); }
  function exportCSV(){ const csv=toCSV(transactions); const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`twonest-${dateFilter}.csv`; a.click(); URL.revokeObjectURL(url); }
  function settleUp(){ const amt=Math.abs(balances.amount); if(amt<=0){ toast('Nothing to settle 🎉'); return; } const from=balances.amount>0? settings.users[1]:settings.users[0]; const to=balances.amount>0? settings.users[0]:settings.users[1]; addTransaction({ date:new Date().toISOString().slice(0,10), user:from, type:'settlement', category:'Settle Up', amount:amt, notes:`Transfer to ${to}` }); toast.success('Settlement recorded.'); }

  // History series (6 months) — ignore settlements in trend
  const historySeries = useMemo(()=>{
    const map=new Map<string, any>(); const now=new Date();
    for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1); const key=monthKey(d); map.set(key, { month:d.toLocaleString(undefined,{month:'short'}), key, expense:0, income:0 }); }
    for(const t of transactions as any){ const mk=(t.date||'').slice(0,7); if(!map.has(mk)) continue; const e=map.get(mk); if(t.type==='income') e.income+=t.amount; else if(t.type==='expense') e.expense+=t.amount; }
    return Array.from(map.values());
  },[transactions]);

  const budgetProgress = useMemo(()=>{ const used=monthlyTotals.expense; const total=budgets.overall||0; const pct= total? Math.min(100, Math.round((used/total)*100)):0; return { used,total,pct }; },[monthlyTotals.expense, budgets.overall]);
  const categoryBudgetProgress = useMemo(()=>{ const spend: Record<string, number> = {}; for(const t of monthTx as any){ if(t.type==='expense') spend[t.category]=(spend[t.category]||0)+t.amount; } return Object.entries(budgets.perCategory||{}).map(([cat,limit],idx)=>({ cat, used:spend[cat]||0, limit:Number(limit), pct: Number(limit)? Math.min(100, Math.round(((spend[cat]||0)/Number(limit))*100)):0, color: COLOR_POOL[idx%COLOR_POOL.length] })); },[monthTx, budgets.perCategory]);

  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGoal, setShowGoal] = useState(false);

  // Refs for scrolling from mobile nav
  const topRef = useRef<HTMLDivElement|null>(null);
  const txRef = useRef<HTMLDivElement|null>(null);
  const goalsRef = useRef<HTMLDivElement|null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <Toaster richColors />
      {/* Sticky mobile bottom nav */}
      <nav className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur shadow-lg rounded-full px-2 py-2 border">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={()=>topRef.current?.scrollIntoView({behavior:'smooth'})} aria-label="Home"><Home className="w-5 h-5"/></Button>
          <Button variant="ghost" size="icon" onClick={()=>txRef.current?.scrollIntoView({behavior:'smooth'})} aria-label="Transactions"><List className="w-5 h-5"/></Button>
          <Button className="rounded-full" onClick={()=>setShowAdd(true)} aria-label="Add"><PlusCircle className="w-5 h-5 mr-1"/>Add</Button>
          <Button variant="ghost" size="icon" onClick={()=>goalsRef.current?.scrollIntoView({behavior:'smooth'})} aria-label="Goals"><PiggyBank className="w-5 h-5"/></Button>
          <Button variant="ghost" size="icon" onClick={()=>setShowSettings(true)} aria-label="Settings"><Settings className="w-5 h-5"/></Button>
        </div>
      </nav>

      <div ref={topRef} className="mx-auto max-w-7xl p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{settings.appName}</h1>
            <p className="text-slate-600">A cozy home for your shared money habits 🌱</p>
          </div>
          <div className="flex gap-2">
            {/* Install PWA */}
            <Button variant={canInstall? "default":"outline"} onClick={doInstall}><Smartphone className="w-4 h-4 mr-2"/>Install app</Button>
            <Button variant="secondary" onClick={exportCSV}><Download className="w-4 h-4 mr-2"/>Export CSV</Button>

            {/* Share dialog */}
            <Dialog open={showShare} onOpenChange={(v:boolean)=>{ setShowShare(v); if(!v && typeof window!=='undefined' && window.location.hash.startsWith('#twonest=')) window.history.replaceState(null,'',window.location.pathname+window.location.search); }}>
              <DialogTrigger asChild><Button variant="outline"><Share2 className="w-4 h-4 mr-2"/>Share to phones</Button></DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>Share & Import</DialogTitle></DialogHeader>
                {importData ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Import data found in the link. Merge with your current data or replace it?</p>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={()=>{ setData(()=>({ ...importData })); setImportData(null); toast.success('Replaced with shared data'); }}>Replace</Button>
                      <Button onClick={()=>{ setData((d:any)=>({
                        ...d,
                        transactions: [...d.transactions, ...(importData.transactions||[])],
                        goals: [...d.goals, ...(importData.goals||[])],
                        budgets: importData.budgets || d.budgets,
                        settings: importData.settings || d.settings,
                      })); setImportData(null); toast.success('Merged shared data'); }}>Merge</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border p-3">
                      <div className="flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4"/><span className="font-medium">Open this on your phone</span></div>
                      <div className="flex items-center gap-4">
                        <QRCodeSVG value={shareUrl} size={128} />
                        <div className="text-xs text-slate-600 break-all max-w-[16rem]">{shareUrl}</div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button onClick={()=>{ navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); }}>Copy link</Button>
                        <Button variant="outline" onClick={()=>{ const ns=(navigator as any).share; if(ns){ ns({ title: 'TwoNest Budget', url: shareUrl }); } else { toast('Share not supported'); }}}>System share</Button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Privacy: data is encoded in the link itself; no server involved. Only share with someone you trust.</p>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Settings */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild><Button variant="outline"><Settings className="w-4 h-4 mr-2"/>Settings</Button></DialogTrigger>
              <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader><SettingsPanel data={data} setData={setData} /></DialogContent>
            </Dialog>

            {/* Add Tx */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2"/>Add</Button></DialogTrigger>
              <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader><AddForm settings={settings} currency={currency} onAdd={(tx:any)=>{ addTransaction(tx); setShowAdd(false); }} /></DialogContent>
            </Dialog>

            {/* Goal */}
            <Dialog open={showGoal} onOpenChange={setShowGoal}>
              <DialogTrigger asChild><Button variant="ghost"><Coins className="w-4 h-4 mr-2"/>Add Goal</Button></DialogTrigger>
              <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>New Savings Goal</DialogTitle></DialogHeader><GoalForm onSave={(g:any)=>{ setData((d:any)=>({...d, goals:[...d.goals, { id:uid(), ...g }]})); setShowGoal(false); toast.success('Goal added'); }} currency={currency} /></DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Filters */}
        <Card className="mt-6">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="flex flex-col md:col-span-2">
                <Label className="mb-1">Month</Label>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500"/><Input type="month" value={dateFilter} onChange={(e)=>setDateFilter((e.target as HTMLInputElement).value)} /></div>
              </div>
              <div className="flex flex-col">
                <Label className="mb-1">Type</Label>
                <Select value={typeFilter} onValueChange={(v:any)=>setTypeFilter(v)}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="settlement">Settlement</SelectItem></SelectContent></Select>
              </div>
              <div className="flex flex-col">
                <Label className="mb-1">Who</Label>
                <Select value={userFilter} onValueChange={(v:any)=>setUserFilter(v)}><SelectTrigger><SelectValue placeholder="Both" /></SelectTrigger><SelectContent><SelectItem value="all">Both</SelectItem>{settings.users.map((u:string)=>(<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select>
              </div>
              <div className="flex flex-col md:col-span-2">
                <Label className="mb-1">Search</Label>
                <div className="flex gap-2"><Input placeholder="category, note, or name" value={search} onChange={(e)=>setSearch((e.target as HTMLInputElement).value)} /><Button variant="outline" size="icon" aria-label="Clear search" onClick={()=>setSearch("")}><X className="w-4 h-4"/></Button></div>
              </div>
            </div>

            {/* Quick filter pills (mobile-friendly) */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1"><Filter className="w-3 h-3"/>Quick filters:</span>
              {['all','expense','income','settlement'].map(t=> (
                <Button key={t} size="sm" variant={typeFilter===t? 'default':'outline'} onClick={()=>setTypeFilter(t)} className="rounded-full capitalize">{t}</Button>
              ))}
              <div className="mx-2 h-4 w-px bg-slate-200"/>
              {['all', ...(settings.users||[])].map(u=> (
                <Button key={u} size="sm" variant={userFilter===u? 'default':'outline'} onClick={()=>setUserFilter(u)} className="rounded-full">{u==='all'? 'Both' : u}</Button>
              ))}
              <div className="ml-auto text-xs text-slate-500">{visibleTx.length} result{visibleTx.length!==1?'s':''}</div>
              <Button size="sm" variant="ghost" onClick={()=>{ setTypeFilter('all'); setUserFilter('all'); setSearch(''); }}>Reset</Button>
            </div>
          </CardContent>
        </Card>

        {/* Overview & Gamification & Split */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4"/>This Month</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-slate-500">Spending</p>
                  <p className="text-2xl font-semibold">{formatCurrency(monthlyTotals.expense, currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Income</p>
                  <p className="text-2xl font-semibold">{formatCurrency(monthlyTotals.income, currency)}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1"><span>Budget Progress</span><span>{budgetProgress.pct}%</span></div>
                <Progress value={budgetProgress.pct} />
                <p className={`text-sm mt-2 ${budgetProgress.used <= (budgets.overall||0) ? 'text-sky-600' : 'text-rose-600'}`}>{formatCurrency(budgetProgress.used, currency)} / {formatCurrency(budgets.overall||0, currency)}</p>
                <div className="flex items-center gap-2 mt-3 text-sm text-slate-600"><Bell className="w-4 h-4"/> Alerts at {Math.round((budgets.alertThreshold||0.8)*100)}%</div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4"/>Level & Streaks</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="rounded-2xl border p-4 text-center w-28">
                  <div className="text-xs text-slate-500">Level</div>
                  <div className="text-3xl font-bold">{game.level}</div>
                  <div className="text-xs text-slate-500 mt-1">{game.xp} XP</div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500 flex items-center gap-1"><TrendingDown className="w-3 h-3"/>No-spend streak</div><div className="text-xl font-semibold">{game.noSpendStreak} days</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500 flex items-center gap-1"><PiggyBank className="w-3 h-3"/>Under-budget streak</div><div className="text-xl font-semibold">{game.underBudgetStreak} months</div></div>
                  <div className="rounded-xl bg-slate-50 p-3 col-span-2">
                    <div className="text-xs text-slate-500 flex items-center gap-1"><Gift className="w-3 h-3"/>Badges</div>
                    <div className="flex flex-wrap gap-2 mt-1">{game.badges.length===0 && <Badge variant="secondary">Start earning! ✨</Badge>}{game.badges.map((b:any)=>(<Badge key={b.id} className="rounded-full">{b.name}</Badge>))}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="w-4 h-4"/>Split & Settle</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Balance this month</p>
                  <p className={`text-2xl font-semibold ${balances.amount>0? 'text-sky-600' : balances.amount<0 ? 'text-rose-600':'text-slate-800'}`}>{balances.amount===0? 'All square 🎉' : `${settings.users[1]} owes ${settings.users[0]} ${formatCurrency(Math.abs(balances.amount), currency)}`}</p>
                </div>
                <Button size="sm" variant="outline" onClick={settleUp} disabled={Math.abs(balances.amount)<=0}>Settle Up</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals */}
        <Card ref={goalsRef} className="mt-6">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PiggyBank className="w-4 h-4"/>Savings Goals</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.length===0 && <div className="text-sm text-slate-500">No goals yet. Add one!</div>}
            {goals.map((g:any)=>{ const pct=g.target? Math.min(100, Math.round((g.saved/g.target)*100)):0; return (
              <div key={g.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between mb-1"><span className="font-medium">{g.name}</span><Badge variant="secondary">{pct}%</Badge></div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{type:'spring',stiffness:120,damping:20}} className="h-2 bg-sky-500" /></div>
                <div className="text-sm text-slate-600 mt-2">{formatCurrency(g.saved, currency)} / {formatCurrency(g.target||0, currency)}</div>
                <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" onClick={()=>{ const add=25; setData((d:any)=>({...d, goals:d.goals.map((x:any)=>x.id===g.id? {...x, saved:(x.saved||0)+add }:x)})); toast.success(`Added ${formatCurrency(25, currency)} to ${g.name}`); }}>+ {formatCurrency(25, currency)}</Button><Button size="sm" variant="outline" onClick={()=>setData((d:any)=>({...d, goals:d.goals.filter((x:any)=>x.id!==g.id)}))}>Delete</Button></div>
              </div> );})}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-base">6-Month Trend</CardTitle></CardHeader><CardContent className="h-64">{historySeries.length===0? (<div className="text-sm text-slate-500">No data yet.</div>) : (<ResponsiveContainer width="100%" height="100%"><BarChart data={historySeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="income" name="Income" fill="#22c55e" /><Bar dataKey="expense" name="Expense" fill="#60a5fa" /></BarChart></ResponsiveContainer>)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">By Category</CardTitle></CardHeader><CardContent className="h-64">{categoryTotals.length===0? (<div className="text-sm text-slate-500">No expenses yet this month.</div>) : (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryTotals} dataKey="value" nameKey="name" outerRadius={90}>{categoryTotals.map((_,i)=>(<Cell key={i} fill={COLOR_POOL[i%COLOR_POOL.length]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer>)}</CardContent></Card>
        </div>

        {/* Category budgets */}
        <Card className="mt-6">
          <CardHeader className="pb-2"><CardTitle className="text-base">Category Budgets</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBudgetProgress.map(r=> (
              <div key={r.cat} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between mb-2"><span className="font-medium">{r.cat}</span><Badge variant={r.used<=r.limit?"secondary":"destructive"}>{r.pct}%</Badge></div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-2" style={{ width: `${r.pct}%`, backgroundColor: r.color }} /></div>
                <div className="text-sm text-slate-600 mt-2">{formatCurrency(r.used, currency)} / {formatCurrency(r.limit||0, currency)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card ref={txRef} className="mt-6">
          <CardHeader className="pb-2"><CardTitle className="text-base">Transactions</CardTitle></CardHeader>
          <CardContent>
            {visibleTx.length===0 && (
              <div className="flex items-center justify-between rounded-2xl border p-3 mb-3 bg-slate-50">
                <div className="text-sm text-slate-600">No matches. Try adjusting filters.</div>
                <Button size="sm" variant="ghost" onClick={()=>{ setTypeFilter('all'); setUserFilter('all'); setSearch(''); }}>Clear filters</Button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500"><tr><th className="py-2">Date</th><th>Who</th><th>Type</th><th>Category</th><th className="text-right">Amount</th><th>Split</th><th>Notes</th><th></th></tr></thead>
                <tbody>
                  {visibleTx.map((t:any)=> (
                    <tr key={t.id} className="border-t">
                      <td className="py-2">{t.date}</td>
                      <td>{t.user}</td>
                      <td><Badge variant={t.type==='expense'? 'destructive' : (t.type==='income'? 'secondary' : 'outline')} className="capitalize">{t.type}</Badge></td>
                      <td>{t.category}</td>
                      <td className="text-right font-medium">{formatCurrency(t.amount, currency)}</td>
                      <td className="text-slate-600">{t.split? t.split : '-'}</td>
                      <td className="text-slate-600">{t.notes}</td>
                      <td className="text-right"><Button size="icon" variant="ghost" onClick={()=>deleteTransaction(t.id)}><Trash2 className="w-4 h-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-sky-50 border-sky-100"><CardContent className="p-4"><div className="text-sky-800 text-sm">Tip: keep shared expenses marked as "even" so the ledger stays accurate. Use Settle Up monthly.</div></CardContent></Card>
          <Card className="bg-indigo-50 border-indigo-100"><CardContent className="p-4"><div className="text-indigo-800 text-sm">Challenge: one no-spend day per week. Streaks = extra XP.</div></CardContent></Card>
          <Card className="bg-amber-50 border-amber-100"><CardContent className="p-4"><div className="text-amber-900 text-sm">Celebrate finishing under budget with a small shared reward 🍦</div></CardContent></Card>
        </div>

        <footer className="text-center text-xs text-slate-500 mt-8 pb-16 md:pb-8">Built with ❤️ TwoNest Budget • Data lives in your browser only</footer>
      </div>
    </div>
  );
}

function AddForm({ settings, currency, onAdd }:{ settings:any, currency:string, onAdd:(tx:any)=>void }){
  const [type, setType] = useState("expense");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [user, setUser] = useState(settings.users[0]);
  const [category, setCategory] = useState(settings.categories[0] || "Other");
  const [amount, setAmount] = useState<any>(0);
  const [notes, setNotes] = useState("");
  const [split, setSplit] = useState("none");
  const [shareYou, setShareYou] = useState<any>(0);
  const [sharePartner, setSharePartner] = useState<any>(0);

  useEffect(()=>{ if(split==='even'){ const each=Number(amount||0)/2; setShareYou(each); setSharePartner(each); }},[split,amount]);

  function submit(e:React.FormEvent){ e.preventDefault(); if(!amount || Number(amount)<=0) return toast.error('Enter a positive amount'); const payload:any={ date, user, type, category, amount:Number(amount), notes }; if(type==='expense' && split!=='none') payload.split=split; if(type==='expense' && split!=='none') payload.shares = { [settings.users[0]]: Number(shareYou||0), [settings.users[1]]: Number(sharePartner||0) }; onAdd(payload); }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label>Type</Label><Select value={type} onValueChange={setType as any}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="settlement">Settlement</SelectItem></SelectContent></Select></div>
        <div><Label>Date</Label><Input className="mt-1" type="date" value={date} onChange={(e)=>setDate((e.target as HTMLInputElement).value)} /></div>
        <div><Label>Who paid</Label><Select value={user} onValueChange={setUser as any}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{settings.users.map((u:string)=>(<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select></div>
        <div><Label>Category</Label><Select value={category} onValueChange={setCategory as any}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{settings.categories.map((c:string)=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select></div>
        <div><Label>Amount ({currency})</Label><Input className="mt-1" type="number" step="0.01" value={amount} onChange={(e)=>setAmount((e.target as HTMLInputElement).value)} /></div>
        <div><Label>Notes</Label><Input className="mt-1" value={notes} onChange={(e)=>setNotes((e.target as HTMLInputElement).value)} placeholder="optional" /></div>
        {type==='expense' && (
          <div className="md:col-span-2 rounded-2xl border p-3">
            <div className="flex items-center justify-between"><Label>Split</Label><div className="flex gap-2 items-center"><Badge variant="outline">Bill splitting</Badge></div></div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={split} onValueChange={setSplit as any}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent><SelectItem value="none">No split</SelectItem><SelectItem value="even">Split 50/50</SelectItem><SelectItem value="custom">Custom shares</SelectItem></SelectContent></Select>
              <div className="flex items-center gap-2"><Label className="w-20">{settings.users[0]}</Label><Input type="number" step="0.01" value={shareYou} onChange={(e)=>setShareYou((e.target as HTMLInputElement).value)} disabled={split==='none'||split==='even'} /></div>
              <div className="flex items-center gap-2"><Label className="w-20">{settings.users[1]}</Label><Input type="number" step="0.01" value={sharePartner} onChange={(e)=>setSharePartner((e.target as HTMLInputElement).value)} disabled={split==='none'||split==='even'} /></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2"><Button type="submit"><Plus className="w-4 h-4 mr-2"/>Add</Button></div>
    </form>
  );
}

function GoalForm({ onSave, currency }:{ onSave:(g:any)=>void, currency:string }){
  const [name, setName] = useState("");
  const [target, setTarget] = useState<any>(0);
  const [saved, setSaved] = useState<any>(0);
  function submit(e:React.FormEvent){ e.preventDefault(); if(!name) return toast.error('Name your goal'); onSave({ name, target:Number(target), saved:Number(saved), due:null }); }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label>Goal name</Label><Input className="mt-1" value={name} onChange={(e)=>setName((e.target as HTMLInputElement).value)} placeholder="e.g. New sofa" /></div>
        <div><Label>Target ({currency})</Label><Input className="mt-1" type="number" step="0.01" value={target} onChange={(e)=>setTarget((e.target as HTMLInputElement).value)} /></div>
        <div className="md:col-span-2"><Label>Initial saved ({currency})</Label><Input className="mt-1" type="number" step="0.01" value={saved} onChange={(e)=>setSaved((e.target as HTMLInputElement).value)} /></div>
      </div>
      <div className="flex justify-end"><Button type="submit">Save Goal</Button></div>
    </form>
  );
}

function SettingsPanel({ data, setData }:{ data:any, setData:Function }){
  const { settings, budgets } = data;
  const [u1, setU1] = useState(settings.users[0] || "You");
  const [u2, setU2] = useState(settings.users[1] || "Partner");
  const [currency, setCurrency] = useState(settings.currency || "EUR");
  const [cats, setCats] = useState(settings.categories.join(", "));
  const [overall, setOverall] = useState<any>(budgets.overall || 0);
  const [appName, setAppName] = useState(settings.appName || "TwoNest Budget");
  const [threshold, setThreshold] = useState<any>(budgets.alertThreshold || 0.8);

  function saveBasics(e:React.FormEvent){ e.preventDefault(); const categories=cats.split(",").map(s=>s.trim()).filter(Boolean); const users=[u1,u2].filter(Boolean); setData((d:any)=>({ ...d, settings:{ ...d.settings, users, categories, currency, appName } })); setData((d:any)=>({ ...d, budgets:{ ...d.budgets, currency } })); toast.success('Settings saved'); }
  function saveBudget(e:React.FormEvent){ e.preventDefault(); setData((d:any)=>({ ...d, budgets:{ ...d.budgets, overall:Number(overall), alertThreshold:Number(threshold) } })); toast.success('Budget saved'); }

  return (
    <div className="space-y-6">
      <form onSubmit={saveBasics} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Your name</Label><Input className="mt-1" value={u1} onChange={(e)=>setU1((e.target as HTMLInputElement).value)} /></div>
          <div><Label>Partner name</Label><Input className="mt-1" value={u2} onChange={(e)=>setU2((e.target as HTMLInputElement).value)} /></div>
          <div><Label>App name</Label><Input className="mt-1" value={appName} onChange={(e)=>setAppName((e.target as HTMLInputElement).value)} /></div>
          <div><Label>Currency (ISO)</Label><Input className="mt-1" value={currency} onChange={(e)=>setCurrency((e.target as HTMLInputElement).value.toUpperCase().slice(0,3))} /></div>
          <div className="md:col-span-2"><Label>Categories (comma-separated)</Label><Input className="mt-1" value={cats} onChange={(e)=>setCats((e.target as HTMLInputElement).value)} /></div>
        </div>
        <div className="flex justify-end"><Button type="submit">Save Basics</Button></div>
      </form>

      <form onSubmit={saveBudget} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Overall Monthly Budget</Label><Input className="mt-1" type="number" step="0.01" value={overall} onChange={(e)=>setOverall((e.target as HTMLInputElement).value)} /></div>
          <div><Label>Alert Threshold (0.5–1.0)</Label><Input className="mt-1" type="number" step="0.05" min="0.5" max="1" value={threshold} onChange={(e)=>setThreshold((e.target as HTMLInputElement).value)} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {settings.categories.map((c:string)=>(
            <div key={c} className="rounded-2xl border p-3">
              <div className="flex items-center justify-between"><span>{c}</span><span className="text-xs text-slate-500">Monthly limit</span></div>
              <Input className="mt-2" type="number" step="0.01" value={(budgets.perCategory?.[c] ?? 0)} onChange={(e)=>setData((d:any)=>({ ...d, budgets:{ ...d.budgets, perCategory:{ ...d.budgets.perCategory, [c]: Number((e.target as HTMLInputElement).value) }}}))} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Switch id="rollover" disabled /><Label htmlFor="rollover" className="text-slate-500">Rollover unused budget (coming soon)</Label></div>
          <Button type="submit">Save Budgets</Button></div>
      </form>
    </div>
  );
}

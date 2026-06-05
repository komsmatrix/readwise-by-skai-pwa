import { useState, useEffect } from 'react'

export default function AgentsTab({ savedPass }) {
  const [agents,       setAgents]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [view,         setView]         = useState('dashboard')
  const [selectedAgent,setSelectedAgent]= useState(null)
  const [agentSales,   setAgentSales]   = useState([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [error,        setError]        = useState('')
  const [newName,      setNewName]      = useState('')
  const [newEmail,     setNewEmail]     = useState('')
  const [newGcash,     setNewGcash]     = useState('')
  const [createStatus, setCreateStatus] = useState('idle')
  const [createResult, setCreateResult] = useState(null)
  const [createError,  setCreateError]  = useState('')
  const [payingId,     setPayingId]     = useState(null)
  const [payStatus,    setPayStatus]    = useState({})

  useEffect(() => { loadAgents() }, [])

  async function loadAgents() {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/agents', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'list', password: typeof savedPass === "function" ? savedPass() : savedPass }),
      })
      const data = await res.json()
      if (data.agents) setAgents(data.agents)
      else setError(data.error || 'Failed to load agents')
    } catch (err) { setError('Network error — ' + err.message) }
    setLoading(false)
  }

  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim()) return
    setCreateStatus('loading'); setCreateError('')
    try {
      const res  = await fetch('/api/agents', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'create', password: typeof savedPass === "function" ? savedPass() : savedPass, name:newName, email:newEmail, gcash:newGcash }),
      })
      const data = await res.json()
      if (data.success) {
        setCreateStatus('success'); setCreateResult(data.agent)
        setNewName(''); setNewEmail(''); setNewGcash('')
        loadAgents()
      } else { setCreateStatus('error'); setCreateError(data.error || 'Failed') }
    } catch (err) { setCreateStatus('error'); setCreateError('Network error — ' + err.message) }
  }

  async function loadSales(agent) {
    setSelectedAgent(agent); setView('sales'); setSalesLoading(true)
    const res  = await fetch('/api/agents', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'sales', password: typeof savedPass === "function" ? savedPass() : savedPass, agentId:agent.id }),
    })
    const data = await res.json()
    if (data.sales) setAgentSales(data.sales)
    setSalesLoading(false)
  }

  async function handleMarkPaid(agentId) {
    setPayingId(agentId)
    const res  = await fetch('/api/agents', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'markpaid', password: typeof savedPass === "function" ? savedPass() : savedPass, agentId }),
    })
    const data = await res.json()
    if (data.success) {
      setPayStatus(prev => ({ ...prev, [agentId]:{ success:true, amount:data.amount, count:data.salesCount } }))
      loadAgents()
    }
    setPayingId(null)
  }

  const sorted      = [...agents].sort((a,b) => (b.totalSales||0) - (a.totalSales||0))
  const totalSales  = agents.reduce((sum,a) => sum + (a.totalSales||0), 0)
  const totalUnpaid = agents.reduce((sum,a) => sum + (a.unpaidAmount||0), 0)
  const totalEarned = agents.reduce((sum,a) => sum + (a.totalEarned||0), 0)
  const top3        = sorted.filter(a => a.totalSales > 0).slice(0, 3)
  const unpaidAgents= agents.filter(a => a.unpaidAmount > 0)

  // Monthly sales from all agent sales — derived from agent data
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { month: d.toLocaleDateString('en-PH', { month:'short', year:'2-digit' }), key: `${d.getFullYear()}-${d.getMonth()}` }
  })
  const thisMonth = `${now.getFullYear()}-${now.getMonth()}`
  const thisMonthSales = agents.reduce((sum, a) => sum + (a.totalSales || 0), 0) // placeholder until we track by month
  const monthlySales = months.map(m => ({ month: m.month, count: m.key === thisMonth ? totalSales : 0 })).filter(m => m.count > 0)

  // ── Create view ──────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div style={s.section}>
        <div style={s.backRow}>
          <button style={s.backBtn} onClick={() => { setView('dashboard'); setCreateStatus('idle'); setCreateResult(null); setCreateError('') }}>← Back</button>
          <p style={s.sectionTitle}>Add New Agent</p>
        </div>
        <p style={s.desc}>Add an agent — system generates their unique referral code automatically.</p>
        <div style={s.field}><label style={s.label}>Full Name</label>
          <input style={s.input} placeholder="Juan Dela Cruz" value={newName} onChange={e => setNewName(e.target.value)}/></div>
        <div style={s.field}><label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="juan@gmail.com" value={newEmail} onChange={e => setNewEmail(e.target.value)}/></div>
        <div style={s.field}><label style={s.label}>GCash Number <span style={{color:'var(--text-muted)',fontSize:11}}>(for payouts)</span></label>
          <input style={s.input} placeholder="09xxxxxxxxx" value={newGcash} onChange={e => setNewGcash(e.target.value)}/></div>
        {createError && <p style={s.error}>{createError}</p>}
        <button style={{...s.btn,...(!newName.trim()||!newEmail.trim()||createStatus==='loading'?s.btnDisabled:{})}}
          onClick={handleCreate} disabled={!newName.trim()||!newEmail.trim()||createStatus==='loading'}>
          {createStatus==='loading'?'Creating…':'Create Agent'}
        </button>
        {createStatus==='success' && createResult && (
          <div style={s.successBox} className="animate-in">
            <p style={s.successLabel}>✅ Agent added — welcome email sent!</p>
            <p style={{margin:'4px 0',fontSize:14,color:'var(--text-primary)',fontWeight:500}}>{createResult.name}</p>
            <p style={{margin:'4px 0',fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Their referral code:</p>
            <p style={{margin:'4px 0',fontFamily:'monospace',fontSize:28,color:'var(--accent)',fontWeight:700,letterSpacing:'0.1em'}}>{createResult.code}</p>
            <p style={{margin:'4px 0',fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>
              ✉️ {createResult.name.split(' ')[0]} received a welcome email with their code, commission details, buy link with code pre-filled, and a ready-to-send script. No manual work needed!
            </p>
            <button style={{...s.btn,marginTop:4,padding:'8px 16px',fontSize:13}}
              onClick={() => navigator.clipboard.writeText(createResult.code)}>Copy Code</button>
          </div>
        )}
      </div>
    )
  }

  // ── Sales detail view ────────────────────────────────────────────────────
  if (view === 'sales' && selectedAgent) {
    return (
      <div style={s.section}>
        <div style={s.backRow}>
          <button style={s.backBtn} onClick={() => setView('dashboard')}>← Back</button>
          <p style={s.sectionTitle}>{selectedAgent.name}</p>
        </div>
        <p style={{...s.desc,marginBottom:4}}>Code: <span style={{color:'var(--accent)',fontWeight:700,fontFamily:'monospace'}}>{selectedAgent.code}</span></p>
        <p style={{...s.desc,marginBottom:16}}>GCash: {selectedAgent.gcash||'Not set'}</p>
        <div style={s.statsRow}>
          <div style={s.statCard}><p style={s.statCardNum}>{selectedAgent.totalSales||0}</p><p style={s.statCardLabel}>Total Sales</p></div>
          <div style={s.statCard}><p style={s.statCardNum}>₱{(selectedAgent.totalEarned||0).toFixed(0)}</p><p style={s.statCardLabel}>Total Earned</p></div>
          <div style={{...s.statCard,...(selectedAgent.unpaidAmount>0?s.statCardAlert:{})}}>
            <p style={{...s.statCardNum,...(selectedAgent.unpaidAmount>0?{color:'#e05c5c'}:{})}}> ₱{(selectedAgent.unpaidAmount||0).toFixed(0)}</p>
            <p style={s.statCardLabel}>Unpaid</p>
          </div>
        </div>
        {salesLoading ? (
          <p style={s.empty}>Loading sales...</p>
        ) : agentSales.length === 0 ? (
          <p style={s.empty}>No sales yet.</p>
        ) : (
          <div style={s.salesList}>
            {agentSales.map((sale,i) => (
              <div key={i} style={s.saleRow}>
                <div>
                  <p style={s.saleName}>{sale.customer_name}</p>
                  <p style={s.saleDate}>{new Date(sale.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={s.saleAmount}>+₱{sale.commission}</p>
                  <span style={{...s.saleBadge,...(sale.is_paid?s.saleBadgePaid:s.saleBadgeUnpaid)}}>{sale.is_paid?'Paid':'Unpaid'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Dashboard view ────────────────────────────────────────────────────────
  return (
    <div style={s.section}>

      {/* Summary stats */}
      <div style={s.statsRow}>
        <div style={s.statCard}><p style={s.statCardNum}>{agents.length}</p><p style={s.statCardLabel}>Agents</p></div>
        <div style={s.statCard}><p style={s.statCardNum}>{totalSales}</p><p style={s.statCardLabel}>Total Sales</p></div>
        <div style={s.statCard}><p style={s.statCardNum}>₱{totalEarned.toFixed(0)}</p><p style={s.statCardLabel}>Paid Out</p></div>
        <div style={{...s.statCard,...(totalUnpaid>0?s.statCardAlert:{})}}>
          <p style={{...s.statCardNum,...(totalUnpaid>0?{color:'#e05c5c'}:{})}}>{totalUnpaid>0?`₱${totalUnpaid.toFixed(0)}`:'₱0'}</p>
          <p style={s.statCardLabel}>Unpaid {totalUnpaid>0?'⚠':''}</p>
        </div>
      </div>

      {/* Top 3 Agents */}
      {top3.length > 0 && (
        <div style={s.topBox}>
          <p style={s.topLabel}>🏆 Top Agents</p>
          <div style={s.top3Row}>
            {top3.map((agent, i) => (
              <div key={agent.id} style={{...s.top3Card,...(i===0?s.top3First:{})}}>
                <p style={s.top3Medal}>{i===0?'🥇':i===1?'🥈':'🥉'}</p>
                <p style={s.top3Name}>{agent.name.split(' ')[0]}</p>
                <p style={s.top3Code}>{agent.code}</p>
                <p style={s.top3Sales}>{agent.totalSales} sale{agent.totalSales!==1?'s':''}</p>
                <p style={s.top3Earned}>₱{(agent.totalEarned||0).toFixed(0)} earned</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Sales */}
      <div style={s.monthlyBox}>
        <p style={s.topLabel}>📅 This Month</p>
        <div style={s.monthlyRow}>
          <div style={s.statCard}>
            <p style={s.statCardNum}>{totalSales}</p>
            <p style={s.statCardLabel}>{new Date().toLocaleDateString('en-PH',{month:'long',year:'numeric'})}</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statCardNum}>₱{(totalSales * 50).toFixed(0)}</p>
            <p style={s.statCardLabel}>Commission Owed</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statCardNum}>₱{(totalSales * 199).toFixed(0)}</p>
            <p style={s.statCardLabel}>Your Revenue</p>
          </div>
        </div>
      </div>

      {/* Unpaid alert */}
      {unpaidAgents.length > 0 && (
        <div style={s.unpaidAlert}>
          <p style={{margin:'0 0 6px',fontSize:13,color:'#e05c5c',fontWeight:600}}>⚠ Pending Payouts</p>
          {unpaidAgents.map(a => (
            <div key={a.id} style={s.unpaidRow}>
              <div>
                <p style={{margin:0,fontSize:13,color:'var(--text-primary)',fontWeight:500}}>{a.name}</p>
                <p style={{margin:0,fontSize:11,color:'var(--text-muted)'}}>{a.unpaidCount} sale{a.unpaidCount!==1?'s':''} · GCash: {a.gcash||'Not set'}</p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{margin:'0 0 4px',fontSize:15,color:'#e05c5c',fontWeight:700}}>₱{a.unpaidAmount.toFixed(0)}</p>
                <button style={s.markPaidBtn} onClick={() => handleMarkPaid(a.id)} disabled={payingId===a.id}>
                  {payingId===a.id?'Processing…':'Mark Paid'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(payStatus).map(id => payStatus[id]?.success && (
        <div key={id} style={s.paidConfirm} className="animate-in">
          ✅ Paid ₱{payStatus[id].amount?.toFixed(0)} for {payStatus[id].count} sale{payStatus[id].count!==1?'s':''} — agent notified
        </div>
      ))}

      <button style={s.addAgentBtn} onClick={() => { setView('create'); setCreateStatus('idle'); setCreateResult(null); setCreateError('') }}>
        + Add New Agent
      </button>

      {error && <p style={s.error}>{error}</p>}

      {loading ? (
        <p style={s.empty}>Loading agents...</p>
      ) : agents.length === 0 ? (
        <p style={s.empty}>No agents yet. Add your first agent above.</p>
      ) : (
        <div style={s.agentList}>
          {sorted.map(agent => (
            <div key={agent.id} style={s.agentCard}>
              <div style={s.agentTop}>
                <div style={s.agentAvatar}>{agent.name?.[0]?.toUpperCase()}</div>
                <div style={s.agentInfo}>
                  <p style={s.agentNameText}>{agent.name}</p>
                  <p style={s.agentEmail}>{agent.email}</p>
                  {agent.gcash && <p style={{...s.agentEmail,color:'#3a9a6a'}}>GCash: {agent.gcash}</p>}
                </div>
                <div style={s.agentCodeBadge}>{agent.code}</div>
              </div>
              <div style={s.agentStats}>
                <div style={s.agentStat}><p style={s.agentStatNum}>{agent.totalSales||0}</p><p style={s.agentStatLabel}>Sales</p></div>
                <div style={s.agentStat}><p style={s.agentStatNum}>₱{(agent.totalEarned||0).toFixed(0)}</p><p style={s.agentStatLabel}>Earned</p></div>
                <div style={{...s.agentStat,...(agent.unpaidAmount>0?s.agentStatAlert:{})}}>
                  <p style={{...s.agentStatNum,...(agent.unpaidAmount>0?{color:'#e05c5c'}:{})}}>₱{(agent.unpaidAmount||0).toFixed(0)}</p>
                  <p style={s.agentStatLabel}>{agent.unpaidAmount>0?'Unpaid 🔴':'Unpaid'}</p>
                </div>
              </div>
              {payStatus[agent.id]?.success && (
                <div style={s.paidConfirm}>✅ Paid ₱{payStatus[agent.id].amount?.toFixed(0)} — {agent.name.split(' ')[0]} notified</div>
              )}
              <div style={s.agentActions}>
                <button style={s.viewSalesBtn} onClick={() => loadSales(agent)}>View Sales</button>
                {agent.unpaidAmount > 0 && (
                  <button style={{...s.markPaidBtn,flex:2,padding:'8px',fontSize:12}}
                    onClick={() => handleMarkPaid(agent.id)} disabled={payingId===agent.id}>
                    {payingId===agent.id?'Processing…':`Mark Paid · ₱${agent.unpaidAmount.toFixed(0)}`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  section       : { padding:'20px', display:'flex', flexDirection:'column', gap:14, maxWidth:520 },
  sectionTitle  : { margin:0, fontSize:15, fontWeight:600, color:'var(--text-primary)' },
  desc          : { margin:0, fontSize:13, color:'var(--text-muted)', lineHeight:1.6 },
  backRow       : { display:'flex', alignItems:'center', gap:12 },
  backBtn       : { background:'transparent', border:'none', color:'var(--accent)', fontSize:13, cursor:'pointer', padding:0 },
  statsRow      : { display:'flex', gap:6, flexWrap:'wrap' },
  statCard      : { flex:'1 1 60px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'12px 8px', textAlign:'center', minWidth:60 },
  statCardAlert : { border:'1px solid rgba(224,92,92,0.3)', background:'rgba(224,92,92,0.06)' },
  statCardNum   : { margin:'0 0 2px', fontSize:18, fontWeight:700, color:'var(--text-primary)' },
  statCardLabel : { margin:0, fontSize:10, color:'var(--text-muted)' },
  topBox        : { background:'rgba(201,169,110,0.06)', border:'1px solid rgba(201,169,110,0.15)', borderRadius:'var(--radius-md)', padding:'14px' },
  topLabel      : { margin:'0 0 12px', fontSize:11, color:'var(--accent)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' },
  top3Row       : { display:'flex', gap:8 },
  top3Card      : { flex:1, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'10px 8px', textAlign:'center' },
  top3First     : { border:'1px solid rgba(201,169,110,0.4)', background:'rgba(201,169,110,0.06)' },
  top3Medal     : { margin:'0 0 4px', fontSize:20 },
  top3Name      : { margin:'0 0 2px', fontSize:13, fontWeight:600, color:'var(--text-primary)' },
  top3Code      : { margin:'0 0 4px', fontSize:10, color:'var(--accent)', fontFamily:'monospace', fontWeight:700 },
  top3Sales     : { margin:'0 0 2px', fontSize:12, color:'var(--text-primary)', fontWeight:500 },
  top3Earned    : { margin:0, fontSize:11, color:'var(--text-muted)' },
  monthlyBox    : { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'14px' },
  monthlyRow    : { display:'flex', gap:8 },
  unpaidAlert   : { background:'rgba(224,92,92,0.06)', border:'1px solid rgba(224,92,92,0.2)', borderRadius:'var(--radius-md)', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 },
  unpaidRow     : { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  addAgentBtn   : { padding:'11px 16px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:500, cursor:'pointer' },
  agentList     : { display:'flex', flexDirection:'column', gap:10 },
  agentCard     : { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:14, display:'flex', flexDirection:'column', gap:10 },
  agentTop      : { display:'flex', alignItems:'center', gap:10 },
  agentAvatar   : { width:36, height:36, borderRadius:'50%', background:'var(--accent-dim)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, flexShrink:0 },
  agentInfo     : { flex:1, minWidth:0 },
  agentNameText : { margin:'0 0 2px', fontSize:13, fontWeight:500, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  agentEmail    : { margin:0, fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  agentCodeBadge: { fontSize:13, fontWeight:700, color:'var(--accent)', background:'var(--accent-dim)', padding:'4px 10px', borderRadius:99, border:'1px solid rgba(201,169,110,0.2)', flexShrink:0, letterSpacing:'0.05em', fontFamily:'monospace' },
  agentStats    : { display:'flex', gap:6 },
  agentStat     : { flex:1, background:'var(--bg-base)', borderRadius:'var(--radius-sm)', padding:'8px 6px', textAlign:'center' },
  agentStatAlert: { background:'rgba(224,92,92,0.06)' },
  agentStatNum  : { margin:'0 0 2px', fontSize:15, fontWeight:700, color:'var(--text-primary)' },
  agentStatLabel: { margin:0, fontSize:10, color:'var(--text-muted)' },
  agentActions  : { display:'flex', gap:8 },
  viewSalesBtn  : { flex:1, padding:'8px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-secondary)', fontSize:12, cursor:'pointer' },
  markPaidBtn   : { padding:'6px 12px', background:'#3a9a6a', color:'white', border:'none', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600, cursor:'pointer' },
  paidConfirm   : { fontSize:12, color:'#3a9a6a', background:'rgba(58,154,106,0.08)', border:'1px solid rgba(58,154,106,0.2)', borderRadius:'var(--radius-sm)', padding:'8px 10px' },
  field         : { display:'flex', flexDirection:'column', gap:6 },
  label         : { fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em' },
  input         : { padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:14, outline:'none', width:'100%' },
  btn           : { display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:500, cursor:'pointer' },
  btnDisabled   : { opacity:0.45, cursor:'not-allowed' },
  error         : { fontSize:13, color:'#e05c5c', padding:'10px 12px', background:'rgba(224,92,92,0.08)', borderRadius:'var(--radius-sm)' },
  successBox    : { padding:16, background:'rgba(58,154,106,0.08)', border:'1px solid rgba(58,154,106,0.25)', borderRadius:'var(--radius-md)', display:'flex', flexDirection:'column', gap:6 },
  successLabel  : { margin:0, fontSize:13, color:'#3a9a6a', fontWeight:600 },
  salesList     : { display:'flex', flexDirection:'column', gap:4 },
  saleRow       : { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' },
  saleName      : { margin:'0 0 2px', fontSize:13, color:'var(--text-primary)', fontWeight:500 },
  saleDate      : { margin:0, fontSize:11, color:'var(--text-muted)' },
  saleAmount    : { margin:'0 0 4px', fontSize:13, color:'#3a9a6a', fontWeight:600 },
  saleBadge     : { fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:99 },
  saleBadgePaid : { background:'rgba(58,154,106,0.12)', color:'#3a9a6a' },
  saleBadgeUnpaid:{ background:'rgba(224,92,92,0.12)', color:'#e05c5c' },
  empty         : { fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'32px 0' },
}

import React, { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, Area } from 'recharts'
import { motion, MotionConfig } from 'framer-motion'
import { TrendingUp, TrendingDown, RefreshCw, Download, Newspaper, Settings as SettingsIcon } from 'lucide-react'

const fmtUSD = (n) => (n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const fmtPct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
const daysBetween = (a, b) => Math.ceil((b - a) / (1000 * 60 * 60 * 24))
const toISODate = (ts) => new Date(ts).toISOString().slice(0, 10)

function buildBuySchedule(startDate, endDate, cadence) {
  const dates = []
  const d = new Date(startDate)
  const limit = new Date(endDate)
  while (d <= limit) {
    dates.push(new Date(d))
    if (cadence === 'weekly') d.setDate(d.getDate() + 7)
    else if (cadence === 'biweekly') d.setDate(d.getDate() + 14)
    else d.setMonth(d.getMonth() + 1) // monthly
  }
  return dates.map((d) => toISODate(d))
}

function mapDailyPrices(raw) {
  const out = {}
  ;(raw || []).forEach(([ts, price]) => { out[toISODate(ts)] = price })
  return out
}

function computeDCA(priceMap, schedule, amountPerBuy) {
  const timeline = []
  let cumBtc = 0
  let cumInvested = 0
  schedule.forEach((day) => {
    const price = priceMap?.[day]
    if (!price) return
    const btcBought = amountPerBuy / price
    cumBtc += btcBought
    cumInvested += amountPerBuy
    timeline.push({ date: day, invested: cumInvested, btc: cumBtc, value: cumBtc * price, price })
  })
  const latest = timeline[timeline.length - 1]
  const summary = latest ? {
    totalInvested: latest.invested,
    totalBTC: latest.btc,
    currentValue: latest.value,
    pnl: latest.value - latest.invested,
    pnlPct: latest.invested ? ((latest.value - latest.invested) / latest.invested) * 100 : 0,
    latestPrice: latest.price,
  } : { totalInvested: 0, totalBTC: 0, currentValue: 0, pnl: 0, pnlPct: 0, latestPrice: 0 }
  return { timeline, summary }
}

export default function App() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 12); return toISODate(d)
  })
  const [endDate, setEndDate] = useState(() => toISODate(new Date()))
  const [cadence, setCadence] = useState('weekly')
  const [amount, setAmount] = useState(100)
  const [priceSeries, setPriceSeries] = useState(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [sentimentMode, setSentimentMode] = useState('auto')
  const [sentiment, setSentiment] = useState(55)
  const [newsItems, setNewsItems] = useState([])
  const [demoNews, setDemoNews] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    async function fetchPrices() {
      setLoadingPrices(true)
      try {
        const days = Math.min(Math.max(daysBetween(new Date(startDate), new Date(endDate)) + 5, 1), 3650)
        const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Price fetch failed')
        const data = await res.json()
        setPriceSeries(mapDailyPrices(data.prices))
      } catch (e) {
        // fallback mock
        const mock = {}
        const base = new Date(startDate)
        let price = 30000
        for (let i = 0; i <= daysBetween(new Date(startDate), new Date(endDate)); i++) {
          const d = new Date(base); d.setDate(d.getDate() + i)
          price = Math.max(10000, price * (1 + (Math.sin(i / 20) * 0.01 + 0.0005)))
          mock[toISODate(d)] = price
        }
        setPriceSeries(mock)
      } finally {
        setLoadingPrices(false)
      }
    }
    fetchPrices()
  }, [startDate, endDate])

  useEffect(() => {
    if (!demoNews) return
    setNewsItems([
      { title: 'ETF inflows steady; miners adjust post-halving', source: 'Bitcoin Magazine', url: '#' },
      { title: 'Lightning capacity trends and routing fees in focus', source: 'Amboss', url: '#' },
      { title: 'Macro: CPI print sparks BTC volatility spike', source: 'MacroWire', url: '#' },
    ])
  }, [demoNews])

  const schedule = useMemo(() => buildBuySchedule(startDate, endDate, cadence), [startDate, endDate, cadence])
  const dca = useMemo(() => (priceSeries ? computeDCA(priceSeries, schedule, Number(amount)) : { timeline: [], summary: {} }), [priceSeries, schedule, amount])
  const sentimentColor = sentiment >= 60 ? 'var(--green)' : sentiment <= 40 ? 'var(--red)' : 'var(--amber)'

  // Auto sentiment fetch
useEffect(() => {
  if (sentimentMode !== 'auto') return;
  let cancelled = false;
  async function loadSentiment() {
    try {
      const resp = await fetch('/api/sentiment');
      const data = await resp.json();
      if (cancelled) return;
      if (typeof data.score === 'number') setSentiment(data.score);
      if (Array.isArray(data.items) && data.items.length) {
        setNewsItems(data.items.map(it => ({
          title: it.title,
          source: it.source || 'News',
          url: it.link || '#'
        })));
      }
    } catch (e) {
      // keep previous values
    }
  }
  loadSentiment();
  const id = setInterval(loadSentiment, 1000 * 60 * 30); // refresh every 30 min
  return () => { cancelled = true; clearInterval(id); }
}, [sentimentMode]);
return (
    <MotionConfig reducedMotion="user">
      <header>
        <div className="container" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <img src="https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=035" alt="BTC" style={{height:28, width:28}}/>
            <h1 style={{fontSize:18, margin:0}}>Bitcoin Sentiment + DCA Dashboard — BTC is Freedom</h1>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn" onClick={() => window.location.reload()}><RefreshCw size={16}/> Refresh</button>
            <button className="btn" onClick={() => setShowSettings(s => !s)}><SettingsIcon size={16}/> Settings</button>
          </div>
        </div>
      </header>

      <main className="container" style={{paddingTop:16}}>
        <div className="row">
          <section className="col">
            <div className="card" style={{marginBottom:16}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <h2>Market Sentiment</h2>
                <span style={{color: sentimentColor, fontSize:12}}>{sentiment}%</span>
              </div>
              <div style={{display:'flex', gap:8, marginBottom:8}}>
                <button className="btn small" style={{background: sentimentMode==='auto'? '#213056':'#1a2440'}} onClick={()=>setSentimentMode('auto')}>Auto</button>
                <button className="btn small" style={{background: sentimentMode==='manual'? '#213056':'#1a2440'}} onClick={()=>setSentimentMode('manual')}>Manual</button>
              </div>
              {sentimentMode==='manual' ? (
                <input className="range" type="range" min={0} max={100} value={sentiment} onChange={e=>setSentiment(Number(e.target.value))}/>
              ) : (
                <p className="muted" style={{fontSize:13}}>Connect a backend later to compute AI sentiment from X/Reddit/News. Demo shows a static score you can override in Settings.</p>
              )}
              <div style={{marginTop:10}}>
                <span className="pill">
                  {sentiment >= 60 ? <TrendingUp color="var(--green)" size={16}/> : <TrendingDown color="var(--red)" size={16}/>}
                  {sentiment >= 60 ? 'Bullish tilt' : sentiment <= 40 ? 'Bearish tilt' : 'Neutral/Range'}
                </span>
              </div>
            </div>

            <div className="card" style={{marginBottom:16}}>
              <h2>DCA Planner</h2>
              <div className="grid-2">
                <div>
                  <label className="label">Start</label>
                  <input className="input" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">End</label>
                  <input className="input" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Cadence</label>
                  <select className="select" value={cadence} onChange={e=>setCadence(e.target.value)}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="label">Amount (USD)</label>
                  <input className="input" type="number" min="1" value={amount} onChange={e=>setAmount(Number(e.target.value||0))} />
                </div>
              </div>
              <p className="muted" style={{fontSize:12, marginTop:8}}>Data source: CoinGecko daily BTC/USD prices. Falls back to demo data if blocked.</p>
            </div>

            <div className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <h2 style={{display:'flex', alignItems:'center', gap:8}}><Newspaper size={16}/> Bitcoin News (Demo)</h2>
                <button className="btn small" onClick={()=>setDemoNews(v=>!v)}>{demoNews ? 'Hide':'Show'}</button>
              </div>
              <ul style={{margin:0, paddingLeft:16}}>
                {newsItems.map((n,i)=>(
                  <li key={i} style={{marginBottom:6, fontSize:14}}>
                    <a href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
                    <span className="muted"> — {n.source}</span>
                  </li>
                ))}
                {!newsItems.length && <li className="muted" style={{fontSize:14}}>No items. Connect your backend (NewsAPI/RSS) to populate.</li>}
              </ul>
            </div>
          </section>

          <section className="col">
            <div className="card" style={{marginBottom:16}}>
              <h2>DCA Summary</h2>
              {loadingPrices ? (
                <p className="muted">Loading prices…</p>
              ) : dca.timeline.length ? (
                <div className="summary">
                  <div className="stat"><div className="caption">Invested</div><div className="value">{fmtUSD(dca.summary.totalInvested)}</div></div>
                  <div className="stat"><div className="caption">BTC Accumulated</div><div className="value">{dca.summary.totalBTC.toFixed(6)} BTC</div></div>
                  <div className="stat"><div className="caption">Current Value</div><div className="value">{fmtUSD(dca.summary.currentValue)}</div></div>
                  <div className="stat"><div className="caption">P&L</div><div className="value" style={{color: dca.summary.pnl >= 0 ? 'var(--green)' : 'var(--red)'}}>{fmtUSD(dca.summary.pnl)} ({fmtPct(dca.summary.pnlPct)})</div></div>
                </div>
              ) : (
                <p className="muted">Adjust dates/amount and ensure price data is available.</p>
              )}
            </div>

            <div className="card">
              <h2>Portfolio Value vs BTC Price</h2>
              <div style={{height:300}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dca.timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#1f2b46" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: '#99a7c2', fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fill: '#99a7c2', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#99a7c2', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#0b1020', border: '1px solid #22304d', borderRadius: 12, color: '#e6eefc' }} />
                    <Legend wrapperStyle={{ color: '#99a7c2' }} />
                    <Area yAxisId="left" type="monotone" dataKey="value" stroke="#5aa9ff" fill="#5aa9ff22" name="Portfolio Value" />
                    <Line yAxisId="right" type="monotone" dataKey="price" stroke="#ffc861" dot={false} name="BTC Price" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', paddingTop:10}}>
                <button className="btn" onClick={()=>{
                  const csv = ["date,invested,btc,value,price"].concat(
                    (dca.timeline||[]).map(r => `${r.date},${r.invested},${r.btc},${r.value},${r.price}`)
                  ).join("\n")
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'dca_report.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                }}><Download size={16}/> Export CSV</button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showSettings && (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="settings">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <h3>Settings</h3>
            <button className="btn small" onClick={()=>setShowSettings(false)}>Close</button>
          </div>
          <div className="muted" style={{fontSize:13, marginBottom:8}}>Adjust sentiment (demo). Connect backend later for AI signals.</div>
          <input className="range" type="range" min={0} max={100} value={sentiment} onChange={e=>setSentiment(Number(e.target.value))} />
          <div className="muted" style={{marginTop:6}}>{sentiment}%</div>
        </motion.div>
      )}
    </MotionConfig>
  )
}

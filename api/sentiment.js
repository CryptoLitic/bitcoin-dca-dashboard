import Parser from 'rss-parser';

const FEEDS = [
  'https://bitcoinmagazine.com/.rss/full/',
  'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', // WSJ Markets (macro context)
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://news.bitcoin.com/feed/',
  'https://cryptonews.com/news/feed'
];

const POS = [
  'surge','soar','bull','bullish','rally','record','all-time high','ath','inflow','adopt','adoption','approve','approval','sec ok',
  'growth','gain','gains','climb','spike','breakout','positive','beat','beats','increase','expansion','pump','accumulate','hodl'
];
const NEG = [
  'drop','dump','bear','bearish','selloff','sell-off','down','plunge','crash','fear','ban','banned','restrict','lawsuit','sue','sues',
  'hack','hacked','exploit','outflow','liquidation','liquidations','recession','decline','decrease','negative','miss','misses'
];

function scoreText(t) {
  if (!t) return 0;
  const s = t.toLowerCase();
  let score = 0;
  POS.forEach(w => { if (s.includes(w)) score += 2; });
  NEG.forEach(w => { if (s.includes(w)) score -= 2; });
  // Clamp between -20 and +20, map to 0..100
  if (score > 20) score = 20;
  if (score < -20) score = -20;
  const mapped = Math.round(((score + 20) / 40) * 100);
  return mapped;
}

function aggregate(scores) {
  if (!scores.length) return 50;
  const avg = scores.reduce((a,b)=>a+b,0) / scores.length;
  return Math.round(avg);
}

export default async function handler(req, res) {
  try {
    const parser = new Parser({ timeout: 10000 });
    const items = [];
    for (const url of FEEDS) {
      try {
        const feed = await parser.parseURL(url);
        (feed.items || []).slice(0, 10).forEach(it => {
          items.push({
            title: it.title || '',
            link: it.link || it.guid || '#',
            source: (feed.title || '').replace(/\s+RSS.*$/i, ''),
            pubDate: it.pubDate || it.isoDate || null,
            score: scoreText((it.title || '') + ' ' + (it.contentSnippet || it.content || ''))
          });
        });
      } catch (e) {
        // Ignore individual feed errors to keep endpoint robust
      }
    }
    // Keep most recent ~20 and compute score
    items.sort((a,b) => {
      const da = a.pubDate ? Date.parse(a.pubDate) : 0;
      const db = b.pubDate ? Date.parse(b.pubDate) : 0;
      return db - da;
    });
    const trimmed = items.slice(0, 20);
    const overall = aggregate(trimmed.map(i => i.score));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600');
    res.status(200).json({ score: overall, items: trimmed });
  } catch (err) {
    res.status(200).json({ score: 50, items: [] });
  }
}

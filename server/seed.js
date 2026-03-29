import argon2 from 'argon2';
import { prisma } from './prisma.js';

function articleRows() {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      title: 'Crude Oil Surges 50% as Strait of Hormuz Tensions Rewrite Risk Premium',
      excerpt:
        'Oil markets have surged over the past month, driven by geopolitical risk centered on the Strait of Hormuz. WTI near $95, Brent above $102.',
      body: '<p>Oil markets have surged over the past month, driven by escalating geopolitical risk centered on the Strait of Hormuz. WTI crude is trading near $95 per barrel, while Brent has pushed above $102 - levels not seen since 2023.</p><h2>What\'s Driving the Surge</h2><p>The primary catalyst has been a series of military confrontations near the strait, which handles roughly 20% of global oil transit. Iranian naval exercises and U.S. carrier group deployments have created a standoff that markets are pricing as a sustained risk premium rather than a temporary spike.</p><p>Prediction markets on Kalshi and Polymarket have reflected this shift. Contracts asking "Will WTI exceed $100 by Q2?" traded at 62 cents as of this week, up from 18 cents a month ago.</p><blockquote>The risk premium in oil is no longer about supply disruption - it\'s about the credibility of deterrence. - Energy analyst, Goldman Sachs</blockquote><h2>What Happens Next</h2><p>Delphi\'s composite index tracking geopolitical risk in energy markets has reached its highest reading since the 2022 Russia-Ukraine escalation. If tensions de-escalate, we could see a rapid $15–20 pullback. But the base case, according to prediction market consensus, is that elevated prices persist through at least mid-year.</p>',
      category: 'world',
      author: 'Sahana Lydia',
      cardVariant: 'hero',
      sortOrder: 0,
      publishedAt: now,
    },
    {
      title:
        'CNN says there\'s "No End in Sight" but markets show it couldn\'t be further from the truth.',
      excerpt:
        'CNN\'s "no end in sight" segment has acted as a deliberate narrative. However, prediction markets disagree. Loudly.',
      body: '<p>CNN\'s latest coverage painted a picture of indefinite conflict with "no end in sight." But prediction markets tell a dramatically different story.</p><h2>The Narrative vs. The Data</h2><p>On Polymarket, resolution contracts for the current geopolitical standoff have been trending steadily upward, with a 68% probability of resolution by September. Kalshi\'s similar contracts echo this sentiment.</p><p>This disconnect between media narratives and market-implied probabilities isn\'t new, but the magnitude of the gap is notable. When media sentiment and prediction market pricing diverge this sharply, history suggests the markets tend to be closer to reality.</p><h2>Why Markets Get It Right</h2><p>Unlike editorial boards, prediction markets aggregate the views of participants who have real money at stake. This creates a powerful incentive to cut through noise and assess actual probabilities rather than craft compelling narratives.</p>',
      category: 'economy',
      author: 'Sahana Lydia',
      cardVariant: 'tall',
      sortOrder: 1,
      publishedAt: now,
    },
    {
      title: 'Will GOOGL close above $250 by end of March?',
      excerpt: 'Bullish predictions from analysts, bearish prediction from traders.',
      body: '<p>Alphabet\'s stock has been on a tear in 2026, but the question on every trader\'s mind is whether GOOGL can sustain its momentum above the $250 mark through month-end.</p><h2>Bull Case</h2><p>Analysts at major banks point to Google\'s AI infrastructure investments bearing fruit, with Cloud revenue growing 35% year-over-year. The Gemini ecosystem has gained significant enterprise traction.</p><h2>Bear Case</h2><p>Prediction market traders on Kalshi are more skeptical. Contracts for "GOOGL above $250 at March close" are trading at just 41 cents, implying that most traders with skin in the game see a pullback as more likely than continuation.</p>',
      category: 'tech',
      author: 'Viviana Chen',
      cardVariant: 'default',
      sortOrder: 2,
      publishedAt: now,
    },
    {
      title: 'Recession Fears Recede as Yield Curve Normalizes',
      excerpt:
        'Recession risks have subsided in recent months, as key economic indicators point to a slowdown rather than an immediate downturn.',
      body: '<p>After nearly two years of inversion, the U.S. Treasury yield curve has finally normalized. The 10-year minus 2-year spread turned positive in early March, and prediction markets have responded accordingly.</p><h2>Market Implications</h2><p>Recession probability contracts on Kalshi have fallen from their peak of 45% last summer to just 22% today. The labor market remains resilient, consumer spending has moderated but not collapsed, and corporate earnings continue to beat lowered expectations.</p><p>However, this doesn\'t mean the economy is out of the woods. Leading indicators still suggest a period of below-trend growth, and commercial real estate remains a significant risk factor.</p>',
      category: 'economy',
      author: 'Sahana Lydia',
      cardVariant: 'default',
      sortOrder: 3,
      publishedAt: now,
    },
    {
      title: 'AI Driven Equities Significantly Outperformed Broad Markets Over the Past 12 Months',
      excerpt: 'AMD, Google, Palantir, and Nvidia led gains while broad indices and sectors lagged.',
      body: '<p>The AI trade continues to dominate equity markets. Over the trailing 12 months, a basket of AI-focused stocks has outperformed the S&P 500 by more than 40 percentage points.</p><h2>Winners and Losers</h2><p>Nvidia remains the undisputed leader with a 95% gain, followed by Palantir (+82%), AMD (+54%), and Alphabet (+47%). Meanwhile, the broader S&P 500 returned just 12% over the same period.</p><h2>What Prediction Markets Say</h2><p>Interestingly, prediction market contracts suggest this outperformance may be peaking. Contracts for "AI stocks outperform S&P by 20%+ in next 6 months" have declined from 71 cents to 38 cents, signaling that traders expect the gap to narrow.</p>',
      category: 'tech',
      author: 'Sahana Lydia',
      cardVariant: 'wide',
      sortOrder: 4,
      publishedAt: now,
    },
    {
      title: 'Iran Intelligence Dispute Puts Tulsi Gabbard Under Pressure',
      excerpt:
        'Difference in intelligence? No, difference in between views of national intelligence.',
      body: '<p>A growing dispute over intelligence assessments related to Iran has put Director of National Intelligence Tulsi Gabbard in an increasingly difficult position, with competing factions within the intelligence community offering divergent analyses.</p><h2>The Core Dispute</h2><p>At the heart of the controversy is a fundamental disagreement about Iran\'s nuclear timeline. The CIA\'s assessment differs markedly from the DIA\'s, and the DNI\'s office has been caught in the middle.</p><p>Prediction markets have been tracking the political fallout. On Polymarket, contracts for "Gabbard still serving as DNI by July" have dropped to 54 cents from 82 cents a month ago.</p>',
      category: 'world',
      author: 'Viviana Chen',
      cardVariant: 'default',
      sortOrder: 5,
      publishedAt: now,
    },
    {
      title: 'Trump Pushes for Fed Rate Cuts. Markets Bet It Won\'t.',
      excerpt:
        'President Trump called for a special Fed meeting to cut rates. Prediction markets assign near certainty the Fed will hold steady.',
      body: '<p>President Trump has renewed his calls for the Federal Reserve to cut interest rates, even suggesting a special emergency meeting. But prediction markets are overwhelmingly skeptical.</p><h2>The Political Pressure</h2><p>In a series of social media posts, the President argued that rates are "too high" and that the Fed is "holding back the economy." He called Fed Chair Powell "too slow" and suggested that emergency rate action was warranted.</p><h2>What Markets Say</h2><p>Despite the political noise, prediction market contracts on Kalshi show a 94% probability that the Fed holds rates steady at its next scheduled meeting. Even looking out to June, the probability of a cut is just 35%.</p><p>The Fed\'s independence from political pressure remains one of its most important institutional features, and prediction markets are reflecting confidence that this independence will hold.</p>',
      category: 'research',
      author: 'Sahana Lydia',
      cardVariant: 'default',
      sortOrder: 6,
      publishedAt: now,
    },
  ];
}

export async function ensureAdminUser(email, password) {
  const count = await prisma.user.count();
  if (count > 0) return;

  if (!email || !password) {
    console.warn(
      '[cms] No staff users. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (min 12 chars).'
    );
    return;
  }

  if (password.length < 12) {
    console.warn('[cms] INITIAL_ADMIN_PASSWORD must be at least 12 characters.');
    return;
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      role: 'admin',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`[cms] Created admin user: ${email}`);
}

export async function seedNewsIfEmpty() {
  const n = await prisma.newsArticle.count();
  if (n > 0) return;

  await prisma.newsArticle.createMany({ data: articleRows() });
  console.log('[cms] Seeded 7 news articles.');
}

export async function purgeExpiredRefreshTokens() {
  const now = Math.floor(Date.now() / 1000);
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });
}

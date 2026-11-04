// Gera dist/stats.svg (card animado) só com a API do GitHub e sem serviços de terceiros.
import { mkdirSync, writeFileSync } from 'node:fs';

const login = process.env.GH_LOGIN;
const headers = { Authorization: `Bearer ${process.env.GH_TOKEN}`, 'User-Agent': 'profile-stats' };

const gql = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    query: `query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{totalContributions}}}}`,
    variables: { l: login },
  }),
}).then((r) => r.json());
const cal = gql.data.user.contributionsCollection.contributionCalendar;

const repos = await fetch(`https://api.github.com/users/${login}/repos?per_page=100&type=owner`, { headers }).then((r) => r.json());
const own = repos.filter((r) => !r.fork);
const bytes = {};
for (const r of own) {
  const langs = await fetch(r.languages_url, { headers }).then((x) => x.json());
  for (const [k, v] of Object.entries(langs)) bytes[k] = (bytes[k] || 0) + v;
}
const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
const top = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 5);
const colors = { TypeScript: '#3178c6', JavaScript: '#f7df1e', CSS: '#9d7bff', HTML: '#e34f26', PHP: '#777bb4', Java: '#ed8b00', Python: '#ffd343', PowerShell: '#38e8ff', Shell: '#b4ff39' };
const palette = ['#ff4d8d', '#38e8ff', '#b4ff39', '#9d7bff', '#ff9d5c'];
const color = (k, i) => colors[k] || palette[i % palette.length];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const W = 1200;
const H = 300;
const tiles = [
  [cal.totalContributions.toLocaleString('pt-BR'), 'contribuições em 12 meses', '#ff4d8d'],
  [top[0]?.[0] ?? '-', 'linguagem mais usada', '#38e8ff'],
  [own.length, 'repositórios públicos', '#b4ff39'],
];
const tileSvg = tiles.map(([v, l, c], i) => {
  const x = 30 + i * 386;
  return `<g class="in" style="animation-delay:${i * 0.15}s"><rect x="${x}" y="30" width="368" height="118" rx="14" fill="#121826" stroke="#262f40"/>
  <text class="v" x="${x + 24}" y="88" style="fill:${c}">${esc(v)}</text><text class="l" x="${x + 24}" y="124">${esc(l)}</text></g>`;
}).join('');

let bx = 30;
const fullW = W - 60;
const bar = top.map(([k, v], i) => {
  const bw = (v / total) * fullW;
  const s = `<rect x="${bx.toFixed(1)}" y="176" width="${bw.toFixed(1)}" height="16" fill="${color(k, i)}"/>`;
  bx += bw;
  return s;
}).join('');
let lx = 30;
const legend = top.map(([k, v], i) => {
  const label = `${k} ${((v / total) * 100).toFixed(1).replace('.', ',')}%`;
  const s = `<circle cx="${lx + 8}" cy="228" r="8" fill="${color(k, i)}"/><text class="lg" x="${lx + 24}" y="235">${esc(label)}</text>`;
  lx += 24 + label.length * 11.5 + 26;
  return s;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Estatísticas do GitHub de ${esc(login)}">
<defs><style>
.v{font:800 42px 'Inter','Segoe UI',-apple-system,Roboto,Helvetica,Arial,sans-serif}
.l,.lg{font:500 19px 'JetBrains Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace;fill:#b6c0d2}
.n{font:500 15px 'JetBrains Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace;fill:#8a95a8}
.in{animation:in .8s cubic-bezier(.2,.9,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(14px)}}
.grow{animation:gr 1.6s cubic-bezier(.2,.8,.2,1) both}
@keyframes gr{from{width:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<clipPath id="b"><rect class="grow" x="30" y="176" width="${fullW}" height="16" rx="8"/></clipPath>
<linearGradient id="fr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d8d"/><stop offset=".5" stop-color="#9d7bff"/><stop offset="1" stop-color="#38e8ff"/></linearGradient></defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="#0a0d14" stroke="url(#fr)" stroke-width="2"/>
${tileSvg}<g clip-path="url(#b)">${bar}</g>${legend}
<text class="n" x="30" y="274">Linguagens dos repositórios públicos. Atualizado em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</text>
</svg>`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/stats.svg', svg);
console.log(`stats ok: ${cal.totalContributions} contribuições, ${own.length} repositórios`);

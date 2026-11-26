/* GET /classics/search?q=palladio rotonda
   Classic architecture for the ARQASSIST cream panel, searched live on Wikimedia Commons:
   · plates (plans, sections, elevations) from historical treatises and old engravings;
   · photographs of the works.
   Only allow-listed historical architects (their designs are in the public domain). Only files
   whose Commons licence is public domain, CC0, CC BY or CC BY-SA; the credit travels with
   every item. Responses are cached at the edge for a day (Pages Functions free tier). */
const UA = 'BlacklineCAD/1.0 (https://blackline-cad.org; classic plans gallery)';
const API = 'https://commons.wikimedia.org/w/api.php';
const DRAW = '(plan OR pianta OR planta OR plano OR Grundriss OR section OR sezione OR elevation OR alzato OR prospetto OR engraving OR incisione)';
const A = (key, re, label, name, plates) => ({ key, re, label, name, plates });
const AUTHORS = [
  A('palladio', /\bpalladio\b/, 'Andrea Palladio (1508–1580)', 'Palladio', 'Palladio "quattro libri"'),
  A('vitruvio', /\bvitruvi(?:o|us|ius)\b/, 'Vitruvio (s. I a. C.)', 'Vitruvius', 'Vitruvius "De architectura"'),
  A('serlio', /\bserlio\b/, 'Sebastiano Serlio (1475–1554)', 'Serlio', 'Serlio architettura'),
  A('vignola', /\bvignola\b/, 'Vignola (1507–1573)', 'Vignola', 'Vignola "cinque ordini"'),
  A('brunelleschi', /\bbrunelleschi\b/, 'Filippo Brunelleschi (1377–1446)', 'Brunelleschi'),
  A('alberti', /\balberti\b/, 'Leon Battista Alberti (1404–1472)', '"Leon Battista Alberti"'),
  A('bramante', /\bbramante\b/, 'Donato Bramante (1444–1514)', 'Bramante'),
  A('miguelangel', /\b(?:miguel angel|michelangelo|buonarroti)\b/, 'Miguel Ángel (1475–1564)', 'Michelangelo architecture'),
  A('borromini', /\bborromini\b/, 'Francesco Borromini (1599–1667)', 'Borromini'),
  A('bernini', /\bbernini\b/, 'Gian Lorenzo Bernini (1598–1680)', 'Bernini architecture'),
  A('wren', /\bwren\b/, 'Christopher Wren (1632–1723)', '"Christopher Wren"'),
  A('soane', /\bsoane\b/, 'John Soane (1753–1837)', '"John Soane"'),
  A('letarouilly', /\bletarouilly\b/, 'Paul Letarouilly · Édifices de Rome moderne', 'Letarouilly', 'Letarouilly "Rome moderne"'),
  A('durand', /\bdurand\b/, 'J.-N.-L. Durand (1760–1834)', '"Jean-Nicolas-Louis Durand"', 'Durand "Précis des leçons"'),
  A('schinkel', /\bschinkel\b/, 'Karl Friedrich Schinkel (1781–1841)', 'Schinkel', 'Schinkel "architektonischer Entwürfe"'),
  A('gaudi', /\bgaudi\b/, 'Antoni Gaudí (1852–1926)', 'Gaudí'),
  A('sullivan', /\bsullivan\b/, 'Louis Sullivan (1856–1924)', '"Louis Sullivan"'),
  A('wagner', /\b(?:otto )?wagner\b/, 'Otto Wagner (1841–1918)', '"Otto Wagner"'),
  A('mackintosh', /\bmackintosh\b/, 'Charles Rennie Mackintosh (1868–1928)', '"Charles Rennie Mackintosh"'),
  A('loos', /\bloos\b/, 'Adolf Loos (1870–1933)', '"Adolf Loos"'),
  A('behrens', /\bbehrens\b/, 'Peter Behrens (1868–1940)', '"Peter Behrens"'),
];
const DROP = /\b(?:plantas?|planos?|clasic[oa]s?|classic(?:al|s)?|plans?|fotos?|photos?|laminas?|de|del|la|el|los|las|en|y|of|the|and|ver|mostrar|quiero|arquitectura|arquitectos?|obras?|historic[oa]s?|antiguas?)\b/g;
const FREE = /public\s*domain|^pd\b|^pd-|cc0|dominio p[uú]blico|^cc[ -]by(?:[ -]sa)?(?:[ -]\d(?:\.\d)?)?\b/i;
const NC = /\bnc\b|\bnd\b|non.?commercial|no.?deriv/i;

function json(body, status = 200, maxAge = 86400) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? `public, max-age=${maxAge}` : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
const strip = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

async function commons(search, limit) {
  const u = new URL(API);
  const p = {
    action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrnamespace: '6',
    gsrlimit: String(limit), gsrsearch: search + ' filetype:bitmap', prop: 'imageinfo',
    iiprop: 'url|size|extmetadata', iiurlwidth: '360',
    iiextmetadatafilter: 'LicenseShortName|ImageDescription|ObjectName|Artist|DateTimeOriginal',
  };
  for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' }, cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!res.ok) throw Error('Commons HTTP ' + res.status);
  const data = await res.json();
  return (data?.query?.pages || []).sort((a, b) => (a.index || 0) - (b.index || 0));
}

function toItem(page, author, kind) {
  const info = page.imageinfo?.[0], m = info?.extmetadata || {};
  const lic = strip(m.LicenseShortName?.value);
  if (!info?.thumburl || !info?.url || !FREE.test(lic) || NC.test(lic)) return null;
  // Drawings must be public domain; photographs may be CC BY / CC BY-SA with credit.
  const pd = /public\s*domain|^pd|cc0|dominio/i.test(lic);
  if (kind === 'plate' && !pd) return null;
  const desc = strip(m.ImageDescription?.value || m.ObjectName?.value).slice(0, 200);
  const big = info.width > 2000 && /\/360px-/.test(info.thumburl) ? info.thumburl.replace('/360px-', '/2000px-') : info.url;
  return {
    kind,
    title: (desc || page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')).slice(0, 140),
    author: author.label,
    credit: pd ? '' : strip(m.Artist?.value).slice(0, 80),
    date: strip(m.DateTimeOriginal?.value).slice(0, 40),
    license: lic,
    thumb: info.thumburl,
    image: big,
    size: [info.width || 0, info.height || 0],
    page: info.descriptionurl || 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(page.title),
  };
}

export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url);
  const raw = String(url.searchParams.get('q') || '').slice(0, 120).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cache = caches.default, key = new Request(url.toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  const chosen = AUTHORS.filter((a) => a.re.test(raw));
  const list = chosen.length ? chosen.slice(0, 3) : AUTHORS.filter((a) => a.plates).slice(0, 4);
  const onlyPhotos = /\bfotos?\b|\bphotos?\b/.test(raw);
  const onlyPlates = !onlyPhotos && /\b(?:planta|plano|plan|corte|seccion|section|fachada|alzado|lamina)s?\b/.test(raw);
  const rest = raw.replace(/[^a-z0-9 ]+/g, ' ').replace(DROP, ' ');
  const words = AUTHORS.reduce((s, a) => s.replace(a.re, ' '), rest).replace(/\s+/g, ' ').trim();
  const w = words ? words + ' ' : '';
  const per = chosen.length === 1 ? 30 : 10;
  const noDraw = ' -plan -pianta -planta -Grundriss -section -sezione -elevation -engraving';
  const jobs = [];
  for (const a of list) {
    if (!onlyPhotos) jobs.push(commons(w + (a.plates || a.name + ' ' + DRAW), per).then((p) => p.map((x) => toItem(x, a, 'plate'))));
    if (!onlyPlates) jobs.push(commons(w + a.name + noDraw, per).then((p) => p.map((x) => toItem(x, a, 'photo'))));
  }
  try {
    const groups = await Promise.all(jobs.map((j) => j.catch(() => [])));
    const seen = new Set(), items = [];
    for (const g of groups) for (const it of g) if (it && !seen.has(it.page)) { seen.add(it.page); items.push(it); }
    items.sort((p, q) => (p.kind === q.kind ? 0 : p.kind === 'plate' ? -1 : 1));
    const res = json({ query: raw, authors: list.map((a) => a.label), items: items.slice(0, 60) });
    waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ error: 'Biblioteca clásica no disponible / Classic library unavailable' }, 502);
  }
}

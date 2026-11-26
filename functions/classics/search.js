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
const A = (key, re, label, name, plates, opt = {}) => ({ key, re, label, name, plates, ...opt });
const VDL = ['Vitruvius Digital Library', 'https://vitruvius-digital-library.org/'];
const M = (key, re, label, name, links) => A(key, re, label, name, undefined, { modern: true, links });
const AUTHORS = [
  A('palladio', /\bpalladio\b/, 'Andrea Palladio (1508–1580)', 'Palladio', 'Palladio "quattro libri"', { book: 'Palladio "quattro libri"', links: [VDL] }),
  A('vitruvio', /\bvitruvi(?:o|us|ius)\b/, 'Vitruvio (s. I a. C.)', 'Vitruvius', 'Vitruvius "De architectura"', { book: 'Vitruvius architectura', links: [VDL, ['Vitruvia', 'https://vitruvius-digital-library.org/vitruvia']] }),
  A('serlio', /\bserlio\b/, 'Sebastiano Serlio (1475–1554)', 'Serlio', 'Serlio architettura', { book: 'Serlio libro architettura' }),
  A('vignola', /\bvignola\b/, 'Vignola (1507–1573)', 'Vignola', 'Vignola "cinque ordini"', { book: 'Vignola regola' }),
  A('alberti', /\balberti\b/, 'Leon Battista Alberti (1404–1472)', '"Leon Battista Alberti"', undefined, { book: 'Alberti "re aedificatoria"', links: [VDL] }),
  A('filarete', /\bfilarete\b/, 'Filarete (c. 1400–1469)', 'Filarete', 'Filarete trattato', { book: 'Filarete trattato' }),
  A('martini', /\b(?:francesco di giorgio|di giorgio martini)\b/, 'Francesco di Giorgio Martini (1439–1501)', '"Francesco di Giorgio"', '"Francesco di Giorgio" trattato'),
  A('scamozzi', /\bscamozzi\b/, 'Vincenzo Scamozzi (1548–1616)', 'Scamozzi', 'Scamozzi "idea della architettura"', { book: 'Scamozzi "idea della architettura"' }),
  A('delorme', /\b(?:de l ?orme|delorme)\b/, 'Philibert Delorme (1514–1570)', '"Philibert de l\'Orme"', '"Philibert de l\'Orme" architecture', { book: '"Philibert de l\'Orme" architecture' }),
  A('brunelleschi', /\bbrunelleschi\b/, 'Filippo Brunelleschi (1377–1446)', 'Brunelleschi'),
  A('bramante', /\bbramante\b/, 'Donato Bramante (1444–1514)', 'Bramante'),
  A('miguelangel', /\b(?:miguel angel|michelangelo|buonarroti)\b/, 'Miguel Ángel (1475–1564)', 'Michelangelo architecture'),
  A('borromini', /\bborromini\b/, 'Francesco Borromini (1599–1667)', 'Borromini'),
  A('bernini', /\bbernini\b/, 'Gian Lorenzo Bernini (1598–1680)', 'Bernini architecture'),
  A('fischer', /\bfischer von erlach\b/, 'J. B. Fischer von Erlach (1656–1723)', '"Fischer von Erlach"', '"Fischer von Erlach" Entwurff', { book: '"Fischer von Erlach" Entwurff' }),
  A('wren', /\bwren\b/, 'Christopher Wren (1632–1723)', '"Christopher Wren"'),
  A('piranesi', /\bpiranesi\b/, 'Giovanni Battista Piranesi (1720–1778)', 'Piranesi', 'Piranesi pianta', { book: 'Piranesi frontispiece' }),
  A('laugier', /\blaugier\b/, 'Marc-Antoine Laugier (1713–1769)', 'Laugier', undefined, { book: 'Laugier "essai sur l\'architecture"' }),
  A('boullee', /\bboullee\b/, 'Étienne-Louis Boullée (1728–1799)', 'Boullée', 'Boullée projet'),
  A('ledoux', /\bledoux\b/, 'Claude-Nicolas Ledoux (1736–1806)', 'Ledoux', 'Ledoux "architecture considérée"', { book: 'Ledoux "architecture considérée"' }),
  A('soane', /\bsoane\b/, 'John Soane (1753–1837)', '"John Soane"'),
  A('letarouilly', /\bletarouilly\b/, 'Paul Letarouilly · Édifices de Rome moderne', 'Letarouilly', 'Letarouilly "Rome moderne"', { book: 'Letarouilly "Rome moderne"' }),
  A('durand', /\bdurand\b/, 'J.-N.-L. Durand (1760–1834)', '"Jean-Nicolas-Louis Durand"', 'Durand "Précis des leçons"', { book: 'Durand "Précis des leçons"' }),
  A('schinkel', /\bschinkel\b/, 'Karl Friedrich Schinkel (1781–1841)', 'Schinkel', 'Schinkel "architektonischer Entwürfe"', { book: 'Schinkel "architektonischer Entwürfe"' }),
  A('semper', /\bsemper\b/, 'Gottfried Semper (1803–1879)', '"Gottfried Semper"', undefined, { book: 'Semper "Der Stil"' }),
  A('labrouste', /\blabrouste\b/, 'Henri Labrouste (1801–1875)', 'Labrouste'),
  A('violletleduc', /\bviollet.?le.?duc\b/, 'Eugène Viollet-le-Duc (1814–1879)', 'Viollet-le-Duc', '"Viollet-le-Duc" dictionnaire', { book: '"Viollet-le-Duc" dictionnaire' }),
  A('garnier', /\bcharles garnier\b|\bopera garnier\b/, 'Charles Garnier (1825–1898)', '"Charles Garnier" opéra'),
  A('choisy', /\bchoisy\b/, 'Auguste Choisy (1841–1909)', '"Auguste Choisy"', 'Choisy "histoire de l\'architecture"', { book: 'Choisy "histoire de l\'architecture"' }),
  A('guadet', /\bguadet\b/, 'Julien Guadet (1834–1908)', 'Guadet', 'Guadet "éléments et théorie"'),
  A('gaudi', /\bgaudi\b/, 'Antoni Gaudí (1852–1926)', 'Gaudí'),
  A('sullivan', /\bsullivan\b/, 'Louis Sullivan (1856–1924)', '"Louis Sullivan"'),
  A('wagner', /\b(?:otto )?wagner\b/, 'Otto Wagner (1841–1918)', '"Otto Wagner"'),
  A('horta', /\bhorta\b/, 'Victor Horta (1861–1947)', '"Victor Horta"'),
  A('berlage', /\bberlage\b/, 'H. P. Berlage (1856–1934)', 'Berlage'),
  A('mackintosh', /\bmackintosh\b/, 'Charles Rennie Mackintosh (1868–1928)', '"Charles Rennie Mackintosh"'),
  A('loos', /\bloos\b/, 'Adolf Loos (1870–1933)', '"Adolf Loos"'),
  A('behrens', /\bbehrens\b/, 'Peter Behrens (1868–1940)', '"Peter Behrens"'),
  A('santelia', /\bsant ?elia\b/, 'Antonio Sant\'Elia (1888–1916)', '"Sant\'Elia" città nuova'),
  A('tonygarnier', /\btony garnier\b|\bcite industrielle\b/, 'Tony Garnier (1869–1948)', '"Tony Garnier"', '"Une cité industrielle"', { book: '"Une cité industrielle"' }),
  A('perret', /\bperret\b/, 'Auguste Perret (1874–1954)', '"Auguste Perret"'),
  A('saarinen', /\beliel saarinen\b/, 'Eliel Saarinen (1873–1950)', '"Eliel Saarinen"'),
  A('asplund', /\basplund\b/, 'Gunnar Asplund (1885–1940)', 'Asplund'),
  A('lutyens', /\blutyens\b/, 'Edwin Lutyens (1869–1944)', 'Lutyens'),
  // Modern masters: curated licensed drawings and measured surveys, never generic photographs.
  M('lecorbusier', /\ble ?corbusier\b|\bcorbu\b/, 'Le Corbusier (1887–1965)', '"Le Corbusier"', [['Fondation Le Corbusier', 'https://www.fondationlecorbusier.fr/']]),
  M('mies', /\bmies\b/, 'Ludwig Mies van der Rohe (1886–1969)', '"Mies van der Rohe"', [['MoMA', 'https://www.moma.org/']]),
  M('wright', /\b(?:frank\s+l(?:l)?oy(?:d|ds|s)?\s+(?:wright|write)|frank\s+lloyd\s+wright|wright)\b/, 'Frank Lloyd Wright (1867–1959)', '"Frank Lloyd Wright"', [['Frank Lloyd Wright Foundation', 'https://franklloydwright.org/']]),
  M('gropius', /\bgropius\b|\bbauhaus\b/, 'Walter Gropius (1883–1969)', '"Walter Gropius"', [['Bauhaus-Archiv', 'https://www.bauhaus.de/']]),
  M('aalto', /\baalto\b/, 'Alvar Aalto (1898–1976)', '"Alvar Aalto"', [['Alvar Aalto Foundation', 'https://www.alvaraalto.fi/']]),
  M('kahn', /\b(?:louis )?kahn\b/, 'Louis Kahn (1901–1974)', '"Louis Kahn"'),
];

/* Exact Commons file titles, not full-text matches. These are independently drawn plans
   or HABS measured sheets; each file's current licence is checked before display. */
const farn = ' - Edith Farnsworth House, 14520 River Road, Plano, Kendall County, IL HABS ILL,47-PLAN.V,1- (sheet ';
const price = ' - Price Tower, 510 South Dewey Avenue, Bartlesville, Washington County, OK HABS OK-67 (sheet ';
const CURATED = {
 mies: [
  ['Plan Barcelona Pavillon.png','floor-plan','Barcelona Pavilion · floor plan'],
  ['Plan'+farn+'3 of 8).tif','floor-plan','Farnsworth House · floor plan'],
  ['West and East Elevations and Sections'+farn+'5 of 8).tif','section','Farnsworth House · sections and elevations'],
  ['Plan and North, East and South Elevations of Core, and Section'+farn+'6 of 8).tif','section','Farnsworth House · core plan and section'],
  ['South and North Elevations'+farn+'4 of 8).tif','elevation','Farnsworth House · north and south elevations']
 ],
 lecorbusier: [
  ['Plan chapelle Notre-Dame-du-Haut.svg','floor-plan','Ronchamp · site plan']
 ],
 wright: [
  ['Fallingwaterfloorplan.jpg','floor-plan','Fallingwater · second floor plan'],
  ['Wright-Hickox Ground Floor Plan 01.png','floor-plan','Hickox House · ground floor'],
  ['Wright-Hickox Second Floor Plan.png','floor-plan','Hickox House · second floor'],
  ['Wright-Heurtley House Lower Floor.png','floor-plan','Heurtley House · lower floor'],
  ['Wright-Heurtley House Upper Floor.png','floor-plan','Heurtley House · upper floor'],
  ['Wright-Willey.png','floor-plan','Willey House · floor plan'],
  ['First Floor Plan'+price+'4 of 17).png','floor-plan','Price Tower · first floor'],
  ['Section, and Light, Louver, and Spire Details'+price+'17 of 17).tif','section','Price Tower · section'],
  ['East Elevation'+price+'12 of 17).tif','elevation','Price Tower · east elevation']
 ]
};
const drawingRank = { 'floor-plan':0, section:1, elevation:2, 'technical-detail':3, portrait:4 };
// A single specifically identified portrait, never a generic photograph search.
const PORTRAITS = {
 mies:'Hugo Erfurth - Portrait Ludwig Mies van der Rohe, 1934.jpg',
 lecorbusier:'Le Corbusier (1964).jpg',
 wright:'Frank Lloyd Wright portrait.jpg'
};
async function authorPortrait(author) {
 const title=PORTRAITS[author.key];if(!title)return [];
 const u=new URL(API);
 for(const [k,v] of Object.entries({action:'query',format:'json',formatversion:'2',titles:'File:'+title,prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'360',iiextmetadatafilter:'LicenseShortName|LicenseUrl|Artist'}))u.searchParams.set(k,v);
 const res=await fetch(u,{headers:{'User-Agent':UA,Accept:'application/json'},cf:{cacheTtl:3600,cacheEverything:true}});
 if(!res.ok)return [];
 const d=await res.json(),p=d.query?.pages?.[0],i=p?.imageinfo?.[0],m=i?.extmetadata||{},lic=strip(m.LicenseShortName?.value);
 if(!i||!FREE.test(lic)||NC.test(lic)||!/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(i.thumburl||'')||!/\.(?:jpe?g|png)(?:[?#]|$)/i.test(i.thumburl||''))return [];
 return [{kind:'portrait',drawingType:'portrait',format:/\.png(?:[?#]|$)/i.test(i.thumburl)?'png':'jpg',title:author.label,author:author.label,credit:strip(m.Artist?.value).slice(0,150),license:lic,licenseUrl:strip(m.LicenseUrl?.value),thumb:i.thumburl,image:i.thumburl,page:i.descriptionurl||'https://commons.wikimedia.org/wiki/'+encodeURIComponent('File:'+title)}];
}
async function curatedDrawings(author, words) {
 const specs=CURATED[author.key]||[];
 const normalize=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/_/g,' ');
 const query=normalize(words).replace(/\b(?:cortes?|sections?|plantas?|plans?|vistas?|elevations?|alzados?|fachadas?)\b/g,' ').trim();
 const filtered=specs.filter(x=>!query||query.split(/\s+/).every(w=>normalize(x.join(' ')).includes(w)));
 if(!filtered.length)return [];
 const byTitle=new Map(filtered.map(x=>[normalize('File:'+x[0]),x]));
 const u=new URL(API);
 for(const [k,v] of Object.entries({action:'query',format:'json',formatversion:'2',titles:filtered.map(x=>'File:'+x[0]).join('|'),prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'1600',iiextmetadatafilter:'LicenseShortName|LicenseUrl|Artist'}))u.searchParams.set(k,v);
 const res=await fetch(u,{headers:{'User-Agent':UA,Accept:'application/json'},cf:{cacheTtl:3600,cacheEverything:true}});
 if(!res.ok)throw Error('Commons HTTP '+res.status);
 const d=await res.json();
 return (d.query?.pages||[]).flatMap(p=>{
  const spec=byTitle.get(normalize(p.title)),i=p.imageinfo?.[0],m=i?.extmetadata||{},lic=strip(m.LicenseShortName?.value);
  if(!spec||!i||!FREE.test(lic)||NC.test(lic))return [];
  // Render TIFF/SVG originals as the provider's JPEG/PNG derivative, not as a photo.
  const original=i.url||'',raster=/\.(?:png|jpe?g)(?:[?#]|$)/i.test(original)?original:i.thumburl;
  const thumb=i.thumburl||raster;
  if(!/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(raster||'')||!/\.(?:png|jpe?g)(?:[?#]|$)/i.test(raster||''))return [];
  return [{kind:'plate',drawingType:spec[1],curated:true,format:/\.png(?:[?#]|$)/i.test(raster)?'png':'jpg',title:spec[2],author:author.label,credit:strip(m.Artist?.value).slice(0,150),license:lic,licenseUrl:strip(m.LicenseUrl?.value),thumb,image:raster,page:i.descriptionurl||'https://commons.wikimedia.org/wiki/'+encodeURIComponent(p.title)}];
 });
}
function historicalDrawingType(title) {
 const q=String(title||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/_/g,' ');
 if(/\b(?:photographs?|photos?|fotografias?|fotos?|perspectivas?|perspectives?|render|aerial|general view|seen from|street view|frontispiece|portada|cover)\b/.test(q))return null;
 if(/\b(?:floor plans?|ground plans?|plans?|pianta|piante|planta|plantas|grundriss|grundrisse|ichnographia)\b/.test(q))return 'floor-plan';
 if(/\b(?:cross sections?|sections?|sezione|sezioni|corte|cortes|seccion|schnitt)\b/.test(q))return 'section';
 if(/\b(?:elevations?|alzados?|alzato|prospetto|orthographia)\b/.test(q))return 'elevation';
 if(/\b(?:architectural details?|construction details?|technical drawings?|detalles? constructivos?|detalles? arquitectonicos?)\b/.test(q))return 'technical-detail';
 return null;
}

const COVER = '(frontispiece OR "title page" OR frontespizio OR frontispice OR portada OR Titelblatt OR Titelseite)';
function linksFor(a, words = '') {
  const q = encodeURIComponent(a.name.replace(/"/g, '').replace(/\s+architecture$/, ''));
  const out = (a.links || []).map(([t, u]) => ({ t, u }));
  out.push({ t: 'Wikipedia', u: 'https://es.wikipedia.org/w/index.php?search=' + q });
  if (a.modern) {
    // Additional documents remain accessible at their source; copyright is respected.
    const pq = encodeURIComponent((a.name.replace(/"/g, '') + ' ' + words + ' planta corte plan section').replace(/\s+/g, ' ').trim());
    out.unshift({ t: 'Plantas y cortes · Google', u: 'https://www.google.com/search?tbm=isch&q=' + pq });
    out.splice(1, 0, { t: 'Pinterest', u: 'https://www.pinterest.com/search/pins/?q=' + pq });
  }
  if (!a.modern) {
    out.push({ t: 'Internet Archive', u: 'https://archive.org/search?query=' + q + '&sin=TXT' });
    out.push({ t: 'Gallica', u: 'https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&query=' + encodeURIComponent('(gallica all "' + a.name.replace(/"/g, '').replace(/\s+architecture$/, '') + '")') });
  }
  return out;
}
const DROP = /\b(?:autor(?:es)?|authors?|maestros?|masters?|modernos?|modern|tratadistas?|portadas?|covers?|libros?|tratados?|plantas?|planos?|clasic[oa]s?|classic(?:al|s)?|plans?|fotos?|photos?|laminas?|de|del|la|el|los|las|en|y|of|the|and|ver|mostrar|quiero|arquitectura|arquitectos?|obras?|historic[oa]s?|antiguas?)\b/g;
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

// Require positive attribution or a known work, not merely a search-engine match.
function relevantAuthorDrawing(page,author,words=''){
 const norm=v=>strip(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const meta=page.imageinfo?.[0]?.extmetadata||{};
 const title=norm(page.title),description=norm(meta.ImageDescription?.value),object=norm(meta.ObjectName?.value),artist=norm(meta.Artist?.value);
 const evidence=[title,description,object,artist].join(' ');
 const name=norm(author.name.replace(/"/g,'').replace(/\s+architecture$/,''));
 const matchName=author.key==='custom'?(' '+evidence+' ').includes(' '+name+' '):author.re.test(evidence)||(' '+evidence+' ').includes(' '+name+' ');
 if(!matchName)return false;
 const work=norm(words).split(' ').filter(t=>t.length>2&&!/^(?:floor|plan|plans|section|sections|elevation|elevations|corte|cortes|vista|vistas|dibujo|drawing|drawings|architectural|arquitectonico|fachada|fachadas|alzado|alzados)$/.test(t));
 if(work.length&&!work.every(t=>(' '+evidence+' ').includes(' '+t+' ')))return false;
 return true;
}
function toItem(page, author, kind) {
  const info = page.imageinfo?.[0], m = info?.extmetadata || {};
  const lic = strip(m.LicenseShortName?.value);
  if (!info?.thumburl || !info?.url || !FREE.test(lic) || NC.test(lic)) return null;
  // Drawings must be public domain; photographs may be CC BY / CC BY-SA with credit.
  const pd = /public\s*domain|^pd|cc0|dominio/i.test(lic);
  if (kind === 'cover' && !pd) return null; // freely licensed drawings retain the declared attribution
  const desc = strip(m.ImageDescription?.value || m.ObjectName?.value).slice(0, 200);
  const big = info.width > 2000 && /\/360px-/.test(info.thumburl) ? info.thumburl.replace('/360px-', '/2000px-') : info.url;
  return {
    kind,
    title: (desc || page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')).slice(0, 140),
    author: author.label,
    credit: pd ? '' : strip(m.Artist?.value).slice(0, 80),
    date: strip(m.DateTimeOriginal?.value).replace(/\s*(?:date\s+)?QS:\S*/gi, '').replace(/\s+/g, ' ').trim().slice(0, 40),
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
  const cache = caches.default, key = new Request(url.toString() + (url.search ? '&' : '?') + 'cv=9', { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  const chosen = AUTHORS.filter((a) => a.re.test(raw));
  const explicitAuthor=raw.match(/^(?:autor(?:a)?|author|arquitect[oa]|architect)\s*:?\s+([a-z][a-z .'-]{2,70})$/i);
  const custom=!chosen.length&&explicitAuthor?A('custom',/$^/,explicitAuthor[1],'"'+explicitAuthor[1].trim()+'"',undefined,{modern:true,links:[]}):null;
  const general=/^(?:clasicos|classic plans|classical plans|plantas clasicas|planos clasicos|autores clasicos|arquitectos clasicos|arquitectos modernos|modern architects|tratados(?: de arquitectura)?|autores de la arquitectura)$/i.test(raw)||!raw;
  const list = chosen.length ? chosen.slice(0,3) : custom?[custom]:general?AUTHORS.filter(a=>a.plates&&!a.modern).slice(0,4):[];
  const rest = raw.replace(/[^a-z0-9 ]+/g,' ').replace(DROP,' ');
  const words = custom?'':AUTHORS.reduce((s,a)=>s.replace(a.re,' '),rest).replace(/\s+/g,' ').trim();
  const w=words?words+' ':'';
  const per=chosen.length===1?30:10;
  const jobs=[];
  for(const a of list){
   if(a.modern)jobs.push(curatedDrawings(a,words));
   if(chosen.length===1&&PORTRAITS[a.key])jobs.push(authorPortrait(a));
   jobs.push(commons(w+a.name+' '+DRAW,per).then(p=>p.flatMap(x=>{
    const type=historicalDrawingType(x.title);
    if(!type||!relevantAuthorDrawing(x,a,words))return [];
    const it=toItem(x,a,'plate');if(!it)return [];
    const raster=/\.(?:png|jpe?g)(?:[?#]|$)/i.test(it.image)?it.image:it.thumb;
    if(!/\.(?:png|jpe?g)(?:[?#]|$)/i.test(raster||''))return [];
    return [{...it,image:raster,format:/\.png(?:[?#]|$)/i.test(raster)?'png':'jpg',drawingType:type,curated:false}];
   })));
  }
  try {
    const groups = await Promise.all(jobs.map((j) => j.catch(() => [])));
    const seen = new Set(), items = [];
    for (const g of groups) for (const it of g) if (it && !seen.has(it.page)) { seen.add(it.page); items.push(it); }
    items.sort((p,q)=>drawingRank[p.drawingType]-drawingRank[q.drawingType]);
    const drawings=items.filter(x=>x.kind==='plate'),portrait=items.find(x=>x.kind==='portrait');
    const ordered=drawings.slice(0,59);if(portrait)ordered.push(portrait);
    const res = json({ query: raw, authors: list.map((a) => a.label), links: (custom?[custom]:chosen.slice(0,3)).flatMap((a) => linksFor(a, words).map((l) => ({ ...l, a: a.label }))), modern: list.some((a) => a.modern), index: chosen.length||custom ? [] : AUTHORS.map((a) => ({ label: a.label, q: a.name.replace(/"/g, '').replace(/\s+architecture$/, ''), modern: !!a.modern })), items: ordered });
    waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ error: 'Biblioteca clásica no disponible / Classic library unavailable' }, 502);
  }
}

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='https://blackline-cad.org/';
// Las páginas públicas son las del sitemap; las principales siempre deben estar.
const paths=[...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]===base?'index.html':m[1].slice(base.length)+'.html');
for(const must of ['index.html','manual-comandos.html','legal.html'])if(!paths.includes(must))throw new Error('Falta en sitemap: '+must);
test('Blackline CAD public pages have canonical, description, and crawlable metadata',()=>{
 for(const path of paths){
  const html=fs.readFileSync(path,'utf8');
  const head=html.split(/<\/head>/i)[0];
  const canonical=base+(path==='index.html'?'':path.replace(/\.html$/,''));
  assert(head.includes('<link rel="canonical" href="'+canonical+'">'),path+' canonical');
  assert(/<meta name="description" content="[^"]{65,}"/.test(head),path+' description');
  assert(!/name="robots"[^>]*noindex/i.test(head),path+' must not be excluded');
  assert(/<title>[^<]{15,}<\/title>/.test(head),path+' title');
 }
});
test('Blackline CAD sitemap lists only files that exist with matching canonicals',()=>{
 const sitemap=fs.readFileSync('sitemap.xml','utf8');
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.equal(urls.length,paths.length);
 assert.equal(new Set(urls).size,urls.length);
 for(const url of urls){
  assert(url.startsWith(base));
  assert(!url.endsWith('.html'),'Sitemap must use redirect-free public URLs: '+url);
  const page=url===base?'index.html':url.slice(base.length)+'.html';
  assert(fs.existsSync(page),'Sitemap page not found: '+page);
  assert(fs.readFileSync(page,'utf8').includes('<link rel="canonical" href="'+url+'">'));
 }
 const robots=fs.readFileSync('robots.txt','utf8');
 assert(robots.includes('Sitemap: '+base+'sitemap.xml'));
});
test('Structured app metadata describes product without asserting unsupported fees',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert(match,'Structured data missing');
 const item=JSON.parse(match[1]);
 assert.equal(item['@type'],'WebApplication');
 assert.equal(item.url,base);
 assert.equal(item.name,'Blackline CAD2D3D');
 assert.equal(item.applicationCategory,'DesignApplication');
 assert(!('offers' in item),'Pricing must not be invented');
});

test('Technical guide supports real CAD workflows and honest format limitations',()=>{
 const html=fs.readFileSync('guia-cad-2d-online.html','utf8');
 const head=html.split(/<\/head>/i)[0];
 assert(head.includes('https://blackline-cad.org/guia-cad-2d-online'));
 for(const term of ['DXF','DWG','capas','unidades','PDF'])assert(html.includes(term),'Guide is missing: '+term);
 assert(html.includes('manual-comandos'),'Guide lacks link to manual');
 assert(html.includes('href="./"'),'Guide lacks navigation to the working editor');
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert(match,'TechArticle JSON-LD missing');
 const doc=JSON.parse(match[1]);
 assert.equal(doc['@type'],'TechArticle');
 assert.equal(doc.mainEntityOfPage,'https://blackline-cad.org/guia-cad-2d-online');
});

test('CAD editor exposes a heading without changing rendering scripts',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const heading=html.match(/<h1 class="brand"[^>]*>CAD2D3D<small>[^<]+<\/small><\/h1>/);
 assert(heading,'Brand heading must remain a visible, semantic H1');
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
});

test('Public pages retain unique titles, valid structured data and consistent brand safeguards',()=>{
 const titles=new Set();
 for(const path of paths){
  const html=fs.readFileSync(path,'utf8'),head=html.split(/<\/head>/i)[0];
  const title=head.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim().toLowerCase();
  assert(title,path+' missing title');
  assert(!titles.has(title),path+' duplicate title: '+title);titles.add(title);
  assert.match(head,/<html\b[^>]*\blang=["'][a-z]{2}(?:-[A-Za-z]+)?["']/i,path+' missing document language');
  for(const m of head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))assert.doesNotThrow(()=>JSON.parse(m[1]),path+' malformed JSON-LD');
  assert(!/auto[\s_-]*(?:cad|desk)/i.test(html),path+' restricted third-party brand');
 }
});
test('Academic resources link to the editor and contain the precision exercise in both languages',()=>{
 for(const path of ['cad-2d-educacion.html','cad-2d-education.html']){
  const html=fs.readFileSync(path,'utf8');
  for(const term of ['OSNAP','OTRACK','ORTHO','DXF','PDF'])assert(html.includes(term),path+' missing '+term);
  assert(html.includes('href="/"'),path+' missing editor link');
 }
});

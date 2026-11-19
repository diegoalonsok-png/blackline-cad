const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='https://blackline-cad.org/';
const paths=['index.html','manual-comandos.html','legal.html','guia-cad-2d-online.html'];
test('Blackline CAD public pages have canonical, description, and crawlable metadata',()=>{
 for(const path of paths){
  const html=fs.readFileSync(path,'utf8');
  const head=html.split(/<\/head>/i)[0];
  const canonical=base+(path==='index.html'?'':path);
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
  const page=url===base?'index.html':url.slice(base.length);
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
 assert.equal(item.name,'Blackline CAD');
 assert.equal(item.applicationCategory,'DesignApplication');
 assert(!('offers' in item),'Pricing must not be invented');
});

test('Technical guide supports real CAD workflows and honest format limitations',()=>{
 const html=fs.readFileSync('guia-cad-2d-online.html','utf8');
 const head=html.split(/<\/head>/i)[0];
 assert(head.includes('https://blackline-cad.org/guia-cad-2d-online.html'));
 for(const term of ['DXF','DWG','capas','unidades','PDF'])assert(html.includes(term),'Guide is missing: '+term);
 assert(html.includes('manual-comandos.html'),'Guide lacks link to manual');
 assert(html.includes('href="./"'),'Guide lacks navigation to the working editor');
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert(match,'TechArticle JSON-LD missing');
 const doc=JSON.parse(match[1]);
 assert.equal(doc['@type'],'TechArticle');
 assert.equal(doc.mainEntityOfPage,'https://blackline-cad.org/guia-cad-2d-online.html');
});

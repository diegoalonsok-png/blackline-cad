const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('Worker: plan Estudio con precio anual y equipo de 4 invitados',()=>{
 const w=R('billing/worker.js');
 assert.match(w,/'studio-yearly':env\.PRICE_STUDIO_YEARLY/);
 assert.match(w,/\[env\.PRICE_STUDIO_YEARLY\]:'studio'/);
 assert.match(w,/const TEAM_MAX=4;/);
 assert.match(w,/path==='\/api\/team\/add'/);
 assert.match(w,/me\?\.plan!=='studio'\|\|me\.teamOf/,'solo el titular administra el equipo');
 assert.match(w,/teamOf:team\.owner/);
 assert.match(R('billing/schema.sql'),/CREATE TABLE IF NOT EXISTS team_members/);
});
test('Cliente: botones de Estudio y panel de equipo',()=>{
 const c=R('cad-plan.js');
 assert.match(c,/data-plan="studio"/);assert.match(c,/data-plan="studio-yearly"/);
 assert.match(c,/9,99 €/);assert.match(c,/89,99 €/);
 assert.match(c,/function teamUI\(/);
 assert.doesNotMatch(c,/bibliotecas compartidas/);
});

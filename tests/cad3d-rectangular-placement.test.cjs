const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('cad3d-lab.js', 'utf8');

// Exercise the actual command and canvas handlers with a fixed workplane projection.
function openDrawing() {
  const handlers = new Map();
  const canvas = {
    dataset: {}, focus() {}, setPointerCapture() {}, hasPointerCapture() { return false; },
    addEventListener(name, handler) { handlers.set(name, handler); },
    getBoundingClientRect() { return {left: 0, top: 0, right: 800, bottom: 600}; }
  };
  const field = {value: ''};
  const element = {hidden: true, classList: {toggle() {}}, removeAttribute() {}};
  const panel = {
    querySelectorAll() { return []; },
    querySelector(selector) { return selector === '#cad3dCommand' ? field : element; }
  };
  const setup = `
    root=panel;renderer={domElement:canvas};cad3dNavigationTool='select';
    groundAt=e=>({x:e.clientX/10,y:e.clientY/10,z:0});
    worldPerPixel=()=>.05;
    redraw=renderProps=render3DGrips=cad3dSyncCompactBars=cad3dUpdateDraftPreview=
      cad3dEndZoom=hideObjectContextMenu=updatePlacementGuide=updateDynamicReadout=cad3dMarqueeHide=text=()=>{};
    bindCanvas(canvas);
    return {tool:action,records:records,submit:run3DCommand};
  })();`;
  const cad = vm.runInNewContext(source.slice(0, source.indexOf('window.BlacklineCAD3D=Object.freeze')) + setup, {
    canvas, panel, window: {addEventListener() {}},
    document: {createElement() { return {}; }, head: {appendChild() {}}}
  });
  function pointer(name, x, y) {
    handlers.get(name)({button: 0, pointerId: 1, clientX: x, clientY: y, preventDefault() {}});
  }
  function click(x, y) { pointer('pointerdown', x, y); pointer('pointerup', x, y); }
  return {...cad, field, pointer, click};
}

for (const tool of ['slab', 'floor']) {
  test(tool + ' uses two opposite clicks, independent of their order, with 20 cm thickness', () => {
    const cad = openDrawing();
    cad.tool(tool);
    cad.click(70, 80);
    assert.equal(cad.records.length, 0);
    cad.click(20, 80); // Same Y. Keep the first corner and allow a retry.
    assert.equal(cad.records.length, 0);
    cad.click(20, 40);
    assert.equal(cad.records.length, 1);
    const r = cad.records[0];
    assert.deepEqual([r.type, r.x, r.y, r.w, r.d, r.z, r.h], ['slab', 4.5, 6, 5, 4, 0, .2]);
  });

  test(tool + ' completes a drag once and accepts signed decimal dimensions after a click', () => {
    const cad = openDrawing();
    cad.tool(tool);
    cad.pointer('pointerdown', 50, 40);
    cad.pointer('pointermove', 100, 80);
    assert.equal(cad.records.length, 0);
    cad.pointer('pointerup', 100, 80);
    cad.tool(tool);
    cad.click(90, 90);
    cad.field.value = '-5,5×4,25';
    cad.submit();
    assert.equal(cad.records.length, 2);
    assert.deepEqual([cad.records[0].w, cad.records[0].d], [5, 4]);
    const r = cad.records[1];
    assert.deepEqual([r.x, r.y, r.w, r.d, r.h], [6.25, 11.125, 5.5, 4.25, .2]);
  });
}

test('an explicit slab preset is respected, and the toolbar starts the next slab at 20 cm', () => {
  const cad = openDrawing();
  cad.tool('slab', 'thin-12');
  cad.click(20, 30); cad.click(60, 70);
  cad.tool('slab');
  cad.click(30, 40); cad.click(80, 80);
  assert.equal(cad.records[0].h, .12);
  assert.equal(cad.records[1].h, .20);
});

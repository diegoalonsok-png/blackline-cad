/* Comparison is performed locally, without touching the active drawing. */
importScripts('cad-model-compare.js?v=20261124-compare-v1');
self.onmessage=e=>{try{self.postMessage({result:self.CAD2DCompare.compare(e.data.current,e.data.previous)})}catch(err){self.postMessage({error:String(err?.message||err)})}};

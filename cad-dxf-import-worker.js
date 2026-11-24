/* Local file processing only. No uploads. */
importScripts('cad-dxf-proxy-2d.js?v=20261123-aec-v1','cad-dxf-parser.js?v=20261124-worker-v1');
self.onmessage=function(e){
 try{const {text,options,style}=e.data;const result=self.CAD2DDxfParser.parse(text,options,style);self.postMessage({result});}
 catch(err){self.postMessage({error:String(err?.message||err),fatal:!!err?.cadImportFatal});}
};

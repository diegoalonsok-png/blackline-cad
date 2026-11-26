/* Local file processing only. No uploads. */
importScripts('cad-dxf-proxy-2d.js?v=20261123-aec-v1','cad-hatch-patterns.js?v=20261120-1850','cad-dxf-parser.js?v=20261126-paper4');
self.onmessage=function(e){
 try{const {text,options,style}=e.data;const result=self.CAD2DDxfParser.parse(text,options,style);self.postMessage({result});}
 catch(err){self.postMessage({error:String(err?.message||err),fatal:!!err?.cadImportFatal});}
};

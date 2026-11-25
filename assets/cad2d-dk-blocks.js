/* Biblioteca original Blackline: registro de metadatos y orden del catálogo.
 * La geometría se solicita individualmente al insertar o editar.
 * Las miniaturas SVG son independientes de los archivos CAD. */
(function(){
 'use strict';
 const LIB=window.CAD2D_ARQ_LIBRARY,DEMAND=window.CAD2D_DK_DEMAND;
 if(!LIB||!DEMAND)return;
 const ids=["dk-teclado","dk-mouse","dk-arbol-radial","dk-puerta-bano-70","dk-bacha-doble","dk-anafe-4","dk-arbusto-arbol","dk-living","dk-cama-1p","dk-inodoro-a","dk-bidet-oval","dk-cama-2p","dk-ventana-135","dk-ventana-217","dk-ventana-287","dk-pano-245","dk-ventana-100","dk-ventana-086","dk-heladera","dk-puerta-140","dk-puerta-pano","dk-mesa-redonda-chica","dk-puerta-135","dk-bacha-circular","dk-modulor-silueta","dk-arbol-vista","dk-arbol-invierno","dk-arbol-hojas","dk-arbol-organico","dk-dos-arboles","dk-ventana-bano","dk-ventana-2x2-vista","dk-ventana-bano-vista","dk-arbol-follaje","dk-arbol-ramas","dk-mesa-redonda-6","dk-mesa-8","dk-puerta-098","dk-corrediza-3m","dk-puerta-solia","dk-planta-alta","dk-inodoro-sup","dk-lavatorio","dk-bano-chico","dk-mesa-6","dk-puerta-060","dk-bacha-apoyo","dk-banera-160","dk-inodoro-mochila","dk-bidet","dk-bano-armado","dk-puerta-070","dk-bano-local","dk-planta-baja","dk-toilette-damero","dk-auto-planta"];
 for(const id of ids)DEMAND.register(LIB,[id]);
})();

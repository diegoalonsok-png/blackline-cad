# Galería 3D / 2.5D: estándar de aceptación visual

Objetivo: componentes semirrealistas o realistas para visualización arquitectónica, no simples volúmenes esquemáticos. La referencia visual es una biblioteca profesional como SketchUp, no una autorización para copiar sus componentes.

## Publicación

- Revisar cada componente en planta, alzado y perspectiva, y en una escena arquitectónica.
- 3D: dimensiones métricas verificadas; silueta, geometría, curvas y detalles coherentes; materiales reconocibles; sin geometría rota ni elementos flotantes. Preferir modelos optimizados con UV y materiales PBR. El importador actual de mallas de color único no preserva PBR completo: no aprobar un modelo si pierde su calidad al insertarlo.
- 2.5D: fotografía o render semirrealista con transparencia real, borde limpio, proporciones y altura comprobadas; personas orientadas a cámara y vegetación en planos cruzados. No publicar caricaturas ni polígonos como recortes fotográficos.
- Miniatura derivada del objeto efectivamente insertado; no una fotografía que oculte un modelo simplificado.
- Procedencia, autor y licencia de redistribución comercial verificadas individualmente; CC BY requiere atribución y enlace. No usar recursos con restricciones de redistribución independiente ni descargar 3D Warehouse masivamente.
- Mantener en R2, generar miniaturas ligeras, cargar el archivo completo únicamente al colocar el objeto. Conservar bloques ya usados en los documentos.
- Ninguna aprobación automática basada solo en cantidad de polígonos, resolución o nombre del archivo.

## Metadatos de calidad del catálogo R2

Solo después de revisión humana: `quality: "realistic"` o `"semirealistic"`, `source` (URL de ficha original o "Blackline original"), `license` (CC0-1.0, CC-BY-4.0, Public Domain, Blackline original), `author`, y `review: {approved:true,date:"YYYY-MM-DD",reviewer:"..."}`. Los modelos sin estos datos permanecen provisionales. Las formas detalladas existentes pueden verse, pero se marcan como pendientes de revisión.

Para 2.5D, catálogo: `kind:"2.5d"`, `mount:"face"` o `"cross"`, medidas w,d,h en metros; modelo JSON v3: `{version:3,w,d,h,mount,name,image:"data:image/webp;base64,..."}`. PNG también admitido. La imagen tiene que estar recortada y optimizada antes de publicarse. La miniatura y el JSON se alojan por separado; el JSON solo se descarga al colocar.

## Fuentes candidatas verificadas para futuras adquisiciones

- Poly Haven: https://polyhaven.com/models ; licencia https://polyhaven.com/license (CC0; respetar términos de servicio y de API).
- ambientCG: https://ambientcg.com/ ; https://docs.ambientcg.com/license/ (CC0; materiales y modelos).

Estas fuentes son candidatas, no una declaración de importación ni una aprobación visual de sus modelos en CAD2D3D. Los recortes fotográficos requieren una fuente compatible y revisión individual de derechos.

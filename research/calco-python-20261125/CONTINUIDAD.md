# CALCOPY — registro de continuidad 2026-11-25 (Argentina)

No reiniciar el motor desde cero al cambiar de sesión. Este directorio conserva los módulos originales recuperados de la tarde y los experimentos posteriores.

## Base y estado
- PR #240: siete módulos originales preservados en main.
- PR #241: ejecución Python en navegador mediante Pyodide/Web Worker, CALCOPY, revisión de candidatos.
- PR #242: botón CALCOPY en IMG. El usuario comprobó que Python se ejecutaba, pero el reconocimiento de muros era incompleto.
- Esta rama añade wall_black_mask.py, wall_refinement.py, wall_rectangles.py y native_wall_plan.py. No son aún el pipeline de producción.

## Requisitos de continuidad
1. Leer los módulos existentes antes de cambiar nada. Conservar el motor anterior como referencia.
2. Reconocer muros negros, grises, rayados y de contorno; pintar de negro su superficie en una máscara virtual sin cambiar el raster original.
3. Reconstruir rectángulos con espesor de referencia de 0,20 m, conservando el espesor observado (p. ej. 0,10 / 0,15 / 0,30 m).
4. Resolver encuentros L/T/X y extremos libres perpendiculares, sin puntas ni huecos accidentales. Repetir comparación con la imagen original y corregir errores con evidencia, no cerrar vanos indiscriminadamente.
5. Entregar ejes y espesores a WALL nativo, y puertas/ventanas paramétricas al mecanismo existente que perfora ambas caras. No perforar el muro dos veces. No inventar aberturas.
6. Probar en la carpeta Google Drive PLANTAS CAD2D3D, sin modificar originales. La carpeta fue inventariada con 136 imágenes individuales y un ZIP de 18 plantas; hay duplicados y detalles de ambientes. Ensayos locales parciales en 34 imágenes; aún no hay validación completa de exactitud arquitectónica ni de toda la colección.
7. Priorizar calidad sobre tiempo; procesamiento cancelable y fuera del hilo principal. Conservar CALCO como respaldo.
8. Antes de fusionar cambios funcionales: pruebas controladas, comparación con plantas reales, revisión visual, prueba de inserción WALL y aberturas dentro del CAD, y verificación del despliegue Cloudflare. No afirmar que el motor reconoce toda la planta sin evidencia.

## Módulos
- calco_semantico.py, wall_vision.py, wall_solid_vision.py, wall_hatch_vision.py: detectores recuperados.
- wall_junctions.py: ajuste de ejes y unión con extremos planos.
- ventanas_vision.py: análisis de ventanas; prueba revisada, no detector universal.
- prueba_planta_completa.py: fixture de anotaciones revisadas, no reconocimiento automático.
- browser_bridge.py: adaptador actualmente integrado para candidatos.
- wall_black_mask.py: relleno experimental de interiores delimitados.
- wall_refinement.py: segunda pasada con evidencia y convergencia.
- wall_rectangles.py: extracción experimental de rectángulos.
- native_wall_plan.py: valida y prepara datos de WALL y aberturas conocidas; no reconoce las aberturas por sí solo.

Próximo paso: integrar y medir las cuatro piezas nuevas como un pipeline opt-in, con referencias verificadas y métricas de precisión/cobertura; mantener el código de producción intacto hasta superar las pruebas.

## Orden de aceptación acordado (25/11, noche)
1. Muros: corregir iterativamente con referencias independientes. No confundir ejecución sin error con exactitud; comprobar anchos reales, uniones, vanos y ausencia de falsos positivos.
2. Puertas y ventanas: insertar bloques paramétricos y perforar con WALL nativo, sin duplicar cortes.
3. Resto de bloques arquitectónicos: mobiliario, sanitarios y otros, con dimensiones, orientación y capas.
4. HATCH/sombreados: al final, como entidades editables en CAD, con límites, huecos y escalas correctos. No confundir el relleno negro provisional de la detección de muros con HATCH final.
5. Verificar todas las fases dentro de CAD2D3D publicado: CALCOPY, selección IMG, inserción nativa, UNDO/REDO, guardado DXF y reapertura, rendimiento y cancelación. No declarar listo hasta verificar producción.

Nueva ronda: refine_caps.py y regression_gate.py. 53 casos de ensayo (51 sin referencia completa y 2 con máscaras manuales aproximadas), 0 errores de ejecución, 0 regresiones de IoU entre las dos referencias, 0 coincidencias exactas. En la última planta anotada la cobertura aumentó de 95,85% a 96,58%; precisión 99,61%. No certificar ni fusionar en producción por ahora. Se necesita ampliar el corpus anotado y validar geometría nativa, no solo máscara raster.

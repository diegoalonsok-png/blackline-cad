# CAD3D · motor de croquis y biblioteca de ambientación (propuesta aislada)

## Estado de esta revisión

- Los estilos artísticos heredados que solamente recolorean la escena quedan ocultos de la galería y bloqueados por `CAD3D_LEGACY_ARTISTIC_STYLES_ENABLED=false`.
- Permanecen los ocho modos técnicos (`wire2d`, `wire3d`, `hidden`, `shaded`, `shaded-edges`, `realistic`, `monochrome`, `xray`).
- Se mejora el acabado visual del ViewCube y orbitador, conservando el comportamiento de arrastre y paneo.
- El renderizador artístico nuevo, biblioteca de billboards y la exportación avanzada **no están implementados en esta revisión**.
- Esta rama no debe publicarse sin QA visual en navegador y validación CAD2D / CAD3D.

## Motor artístico que debe implementarse como submódulo desactivable

1. Extraer contornos visibles y siluetas de la escena, con depth/normal passes y supresión de líneas ocultas.
2. Componer trazos de tinta, grafito, marcadores y grabado orientados por iluminación y geometría: no pegar un patrón uniforme a cada cara.
3. Mantener sombras solares reales, oclusión ambiental y una capa de papel/pigmento independiente de la escena CAD.
4. Renderizar vistas guardadas sin alterar entidades paramétricas ni sus identificadores; exportar PNG/JPG/PDF con controles de resolución.
5. Feature flag independiente para desactivar NPR instantáneamente y volver a `shaded-edges` ante error.

## Biblioteca de ambientación 3D + 2.5D

- Árboles, personas y vegetación: imágenes PNG transparentes en planos 3D (billboards) que miran a la cámara en azimut, opcionalmente sin inclinarse en vertical; escalas en metros.
- Incorporar opción de siluetas y mallas 3D para objetos próximos; permitir alternar billboard / volumen por familia.
- Los billboards deben contribuir a la composición y no bloquear la selección paramétrica de muros, puertas y ventanas.
- Se proyectarán sombras aproximadas opcionales para los billboards; la transparencia y las imágenes se combinarán con el estilo artístico elegido.
- Mobiliario, vehículos y árboles organizados por categorías, nombres genéricos y sin duplicados.
- Incluir licencias y procedencia válida de cada recurso; no copiar galerías de terceros sin permiso.

## QA mínimo antes de mezclar la rama

- Validar sintaxis JS, arranque CAD2D y apertura/cierre de CAD3D.
- Probar ViewCube, órbita, paneo, rueda, vistas Top/Front/Iso y cambio de proyección.
- Confirmar que las opciones artísticas heredadas no se seleccionan y que los modos técnicos siguen funcionando.
- Probar puertas, ventanas, edición de parámetros, sombras, guardado, apertura y DXF/OBJ.
- En la siguiente fase, comparar capturas con las referencias de croquis sobre la misma cámara y geometría, sin aprobar estilos que solo cambien color.

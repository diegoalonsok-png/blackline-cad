# Barra de herramientas CAD — auditoría de herramientas (16 de noviembre de 2026)

Las capturas muestran las áreas **Draw / Dibujo**, **Modify / Modificar** y la barra inferior de precisión. Se debe reproducir el **comportamiento funcional**, no limitarse a copiar sus iconos.

## Integrado en esta versión

- **OTRACK / F11 — Rastreo de referencia a objetos:** al activar el botón inferior o introducir `OTRACK`, se pueden adquirir puntos geométricos usando OSNAP y proyectar alineaciones horizontales/verticales. Dos puntos adquiridos permiten un cruce de guías. Las líneas son superposiciones temporales del lienzo: no se almacenan entre las entidades, no se exportan ni se imprimen.
- La adquisición requiere OSNAP activo y el cursor cerca de un punto de referencia; el radio de activación de la guía es de 10 píxeles, adaptado al zoom.
- Se conservan F3 (OSNAP), F8 (ORTHO), F9 (SNAP), F10 (POLAR) y el resto de los comandos.

## Inventario por barra

| Zona | Funciones principales | Estado en el núcleo y próximos pasos |
| --- | --- | --- |
| Dibujo | Línea, polilínea, círculo, arco, rectángulo, elipse | Existen, ampliar previsualización y edición de arcos / polilíneas |
| Dibujo | HATCH y área | Implementaciones básicas, faltan patrones de producción |
| Modificar | MOVE, COPY, ROTATE, SCALE | Rutas de acción disponibles; deben ampliarse pruebas end-to-end |
| Modificar | TRIM, EXTEND, OFFSET, FILLET, CHAMFER | Implementación parcial; priorizar recorte de muros y casos de intersección |
| Modificar | MIRROR, ARRAY, STRETCH | Existen rutas, faltan mayor fidelidad y regresiones |
| Modificar | EXPLODE, JOIN | Rutas implementadas; revisar objetos complejos |
| Inferior | GRID, SNAP, ORTHO, POLAR, OSNAP | Integradas |
| Inferior | OTRACK / F11 | Nueva implementación inicial con guías temporales |
| Inferior | Escala 1:1, PAN, ZOOM, capas, propiedades | Integradas |
| Inferior | Paper space, viewports, anotación asociativa | Parciales; requieren etapas separadas |

## Pruebas y limitaciones

Pruebas geométricas disponibles en `tests/object-tracking.test.cjs` (8 casos reproducibles). Comprobación adicional en aislamiento de adquisición, proyección, límites de zoom y ausencia de persistencia: 11/11.

La implementación actual es **OTRACK ortogonal básico**; el rastreo angular adquirido, la espera configurable para adquirir un punto, el borrado manual de anclas y la intersección extendida con líneas polares quedan para una segunda fase. La prueba manual del lienzo en navegador, impresión y exportación aún debe completarse, por lo cual no se declara equivalencia plena con programas CAD comerciales.

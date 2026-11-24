# ARCHGEN: módulos paramétricos reversibles

Requisito de diseño acordado: la parametrización del ambiente es opcional y no limita la edición CAD convencional.

## Modelo de implementación
- Mantener entidades CAD nativas y un identificador de módulo compartido. No aplanar los bloques internos mediante GROUP ni encapsular las aberturas en una geometría que pierda sus referencias de vano.
- El módulo seleccionado expone pinzamientos laterales y de esquina; entrada numérica expresa la dimensión final en metros, no un factor de escala. El borde opuesto permanece anclado.
- Redimensionar mediante una transacción: validar geometría y capas, conservar medidas, orientaciones y clases de los componentes, actualizar contorno, vanos, cotas y hatch. Rechazar una reducción incompatible sin modificar el dibujo.
- EXPLODE o DESAGRUPAR sobre un módulo libera únicamente su asociación paramétrica. Las entidades permanecen en su posición, con las mismas capas, IDs y referencias de vanos. No aplanar puertas, ventanas ni bloques comunes.
- EXPLODE posterior sobre una entidad individual sigue el comportamiento convencional del CAD.
- UNDO inmediatamente después de liberar el módulo restaura su asociación y pinzamientos en una operación. REDO vuelve a liberarlo.
- No reconstruir automáticamente un módulo liberado a partir de elementos que el usuario haya editado manualmente.
- No alterar GROUP, EXPLODE ni UNGROUP para objetos ajenos a ARCHGEN. No publicar en producción hasta verificar regresiones.

## Criterios de aceptación
1. Insertar un baño de 3 × 3 m y redimensionarlo a 3.80 × 3 m; no deformar artefactos ni cambiar ancho de vanos.
2. Seleccionar el módulo y ejecutar EXPLODE; comprobar que todos los componentes conservan sus tipos, capas, IDs, medidas y propiedades. Solo se pierde la asociación de ambiente.
3. Mover un inodoro de manera independiente; modificar una puerta paramétrica y comprobar la vinculación al muro.
4. UNDO del movimiento y de EXPLODE; volver a seleccionar el ambiente y verificar que los pinzamientos y dimensiones originales están disponibles.
5. REDO y comprobar edición independiente. Repetir con dos módulos para verificar que liberar uno no afecta al otro.
6. Guardar y volver a abrir un dibujo; verificar persistencia de asociaciones, separación de módulos e integridad de referencias. Copiar un módulo no debe compartir su identificador con el original.
7. Probar cotas/hatch desactivados, capas bloqueadas y contracciones inválidas sin pérdida de geometría.
8. Verificar las esquinas de los muros tanto en la miniatura como en el CAD insertado.

Estado: especificación de implementación y pruebas; no implica que los pinzamientos o EXPLODE de módulos estén implementados.

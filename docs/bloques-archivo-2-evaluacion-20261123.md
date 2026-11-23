# Archivo 2(1).zip — revisión de incorporación para Blackline CAD2D

Fecha: **23/11/2026**. Esta nota preserva la clasificación de la colección entregada por el titular del proyecto; **no contiene ningún DWG ni geometría**.

- SHA-256 del ZIP entregado: `0deea653a915a5cb89e1419b1036a2ee6f1199db01b54109568acef36544b2b1`
- Contenido: **625 DWG** y **1 ZIP anidado**. Todos los DWG principales tienen firmas binarias antiguas `AC1014` (R14) o `AC1006` (R10).
- No se encontró un archivo de licencia que permita **redistribuir los dibujos de este ZIP** en una biblioteca comercial.
- La biblioteca pública de Blackline **no recibe ningún archivo de este ZIP** hasta verificar derechos de redistribución y la geometría con una conversión de fidelidad comprobada.
- Ningún bloque de ROCA, FERRUM o Glastender se importa. Ningún dibujo previo se borra o modifica.

## Decisiones por carpeta

| Carpeta | Archivos principales | Decisión |
| --- | ---: | --- |
| `Gastronomia/Glastender` | 576 DWG + 1 ZIP adicional | **Excluido**: dibujos asociados a fabricante comercial. No incorporar ni convertir para publicación |
| `Heladeras/NEVER*.DWG` | 5 | **Excluido** por posible asociación comercial no esclarecida |
| `Flechas/` | 21 DWG | **Excluir** de la galería profesional: representaciones básicas y simbología redundante |
| `Farolas/hoja-far.dwg` | 1 | **No es un bloque unitario**: posible hoja compuesta, solo revisión |
| `Excavadoras/` | 9 | **Candidato**, no publicar sin derechos y revisión de dibujo |
| `Farolas/faro-*.dwg` | 9 | **Candidato**, no publicar sin derechos y revisión de dibujo |
| `Heladeras/` (nombres genéricos) | 4 | **Candidato**, no publicar sin derechos y revisión de dibujo |

Total: **22 candidatos a revisión**, cero publicados desde esta colección.

## Registro de candidatos

Los hashes siguientes son los primeros 16 dígitos hexadecimales del SHA-256 del archivo contenido en el ZIP; permiten identificar archivos sin copiar ni distribuir su geometría.

| Ruta dentro del ZIP | SHA-256 (prefijo) | Estado |
| --- | --- | --- |
| `Excavadoras/Escav_a.dwg` | `5efde6ae1557c0a0` | Derechos y geometría por comprobar |
| `Excavadoras/Escav_l.dwg` | `7113d14b1b0c03` | Derechos y geometría por comprobar |
| `Excavadoras/Escav_p.dwg` | `df0bdbb8b72c86b8` | Derechos y geometría por comprobar |
| `Excavadoras/vf-trac1.dwg` | `8a9bed4f17189a49` | Derechos y geometría por comprobar |
| `Excavadoras/vf-trac2.dwg` | `47f4a05c30f33b` | Derechos y geometría por comprobar |
| `Excavadoras/vl-escav.dwg` | `de82538e1132f6a8` | Derechos y geometría por comprobar |
| `Excavadoras/vl-trac1.dwg` | `68e74ba536f67ccc` | Derechos y geometría por comprobar |
| `Excavadoras/vl-trac2.dwg` | `90c5f9a953ffa8db` | Derechos y geometría por comprobar |
| `Excavadoras/vl-trac3.dwg` | `a9ef16f94d49299b` | Derechos y geometría por comprobar |
| `Farolas/faro-c1l.dwg` | `84e582512899884e` | Derechos y geometría por comprobar |
| `Farolas/faro-c2a.dwg` | `b971e7107335ab7a` | Derechos y geometría por comprobar |
| `Farolas/faro-c4a.dwg` | `854a7b088b8f50` | Derechos y geometría por comprobar |
| `Farolas/faro-n1a.dwg` | `1edbd83c100b4a77` | Derechos y geometría por comprobar |
| `Farolas/faro-n2a.dwg` | `92333d39997cda9d` | Derechos y geometría por comprobar |
| `Farolas/faro-p1a.dwg` | `58996fdb097cd0a1` | Derechos y geometría por comprobar |
| `Farolas/faro-p2a.dwg` | `0f917bf08e53e461` | Derechos y geometría por comprobar |
| `Farolas/faro-r1a.dwg` | `490603792ec5b2a0` | Derechos y geometría por comprobar |
| `Farolas/faro-r2a.dwg` | `deafa438bd3f3338` | Derechos y geometría por comprobar |
| `Heladeras/Hela.frente.dwg` | `8c1d9cd9afb84420` | Derechos y geometría por comprobar |
| `Heladeras/Helad.Late.dwg` | `51b301bfc16919e6` | Derechos y geometría por comprobar |
| `Heladeras/Helad.Plan.dwg` | `a087f72d1c89ba85` | Derechos y geometría por comprobar |
| `Heladeras/Heladera.dwg` | `ddcda5d5d81b39f3` | Derechos y geometría por comprobar |

## Comprobación técnica

El lector DWG disponible (`ezdxf.addons.dwg`) rechaza las versiones `AC1014` y `AC1006` de la colección. Convertir a DXF correctamente requiere un lector/conversor compatible, por ejemplo LibreDWG, que documenta compatibilidad R14 y R10; **la conversión aún no se realizó**.

La ausencia de marca visible en un DWG no acredita que sea de dominio público. En algunos metadatos binarios aparecen rutas antiguas de terceros (p.ej. carpetas personales de bloques), que tampoco constituyen licencia.

La prioridad de Blackline sigue siendo **solo bloques bien dibujados y cuya redistribución esté autorizada**. Las colecciones CC0 que sí cumplen ambas condiciones se trabajan por separado, con evidencia de licencia y geometría.

## Criterios para dar de alta un candidato

1. Derecho de redistribución comercial explícito o autoría propia confirmada.
2. Geometría visible y vectorial, dibujo detallado y proporciones coherentes.
3. Escala métrica verificable, sin símbolos sin sentido, duplicados ni registros de fabricante.
4. Prueba de inserción con capa 0 y color por capa, sin alteración del proyecto existente.

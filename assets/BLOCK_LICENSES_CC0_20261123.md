# Bloques CAD2D incorporados desde la web — 23/11/2026

## Fuente y autorización

- **Repositorio original:** [pjm4github/FloorPlanner](https://github.com/pjm4github/FloorPlanner)
- **Licencia específica de los símbolos:** [assets/furnishings/LICENSE](https://github.com/pjm4github/FloorPlanner/blob/main/assets/furnishings/LICENSE) — Creative Commons Zero 1.0 Universal (CC0).
- **Alcance:** solamente los SVG de la carpeta `assets/furnishings`; no se importó el código de la aplicación, iconos del programa ni fuentes tipográficas.
- **Autor indicado por el proyecto:** Patrick Moran (gráficos elaborados para FloorPlanner).
- **Adaptación:** extracción de polígonos y círculos originales a entidades vectoriales nativas de CAD2D. Las unidades de `viewBox`, expresadas en pulgadas, fueron convertidas a metros por el factor exacto 0,0254.
- **Archivo integrado:** `assets/cad2d-cc0-curated-web-20261123.js`.

| ID de Blackline | SVG de origen | SHA de origen |
|---|---|---|
| `cc0-fp-suv-elev` | `suv.side.svg` | `12680a33bb52b9c844988e7e6a73f4135ed27ed5` |
| `cc0-fp-bike-elev` | `bicycle.side.svg` | `d5e08754844018594837501b52342b585e9a51c7` |
| `cc0-fp-tractor-loader-elev` | `garden_tractor.side.svg` | `bcdf0ef27078ac713e5975fd8d6bcdbcf444b77d` |
| `cc0-fp-nautical-trailer-elev` | `boat_trailer.side.svg` | `66d695efec2853ffe93cc4d8ab2df9435a68dbe1` |

La geometría está destinada a representación arquitectónica; **no acredita dimensiones de fabricación, tolerancias ni cumplimiento de normativa**. Cada bloque se inserta con su tamaño nominal de fuente.

## Fuentes evaluadas pero NO incorporadas

- `GSStnb/dxfBlocks`: GitHub muestra CC0 en los metadatos, pero su README declara **CC BY-NC-SA 4.0**. La contradicción impide asumir una autorización comercial segura.
- Sitios de descarga gratuita que **no autorizan expresamente redistribución en una biblioteca CAD**.
- Bloques de fabricantes como **ROCA y FERRUM**, excluidos por decisión del titular de Blackline.

La selección se puede ampliar únicamente si la licencia está clara, la geometría vectorial se puede inspeccionar, y la calidad gráfica justifica añadir el modelo.

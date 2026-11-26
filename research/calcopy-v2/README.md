# CALCOPY v2 · detector de muros (en desarrollo, no conectado)

Solo Python + OpenCV + NumPy (lo mismo que carga Pyodide en el navegador).

- `walls_v2.py`: muros llenos (dos umbrales, apertura morfológica, sin rellenos amplios ni color saturado)
  y muros huecos (núcleos blancos finos y alargados); vectoriza a ejes H/V con espesor, une contornos
  dobles y prolonga extremos a encuentros L/T.
- `bench_both.py`: banco de prueba con los 18 planos de `assets/architecture-references/house/unverified`.

Estado 26/11/2026: lectura "llena" buena en 04, 05, 09, 11, 13, 14, 16, 18; parcial en 10;
falla en 01, 02, 03, 06, 07, 08, 12, 15, 17 (doble línea fina, grises, planos girados, capturas con interfaz).

## Calco asistido (26/11/2026, conectado a CALCOPY)
- `bridge_v2.py` (Pyodide): dos lecturas, muros llenos y doble línea; elige la de más encuentros.
- `assets/cad-calcopy-assist.js`: clic → muro medido en la imagen; clic en hueco → puerta (lado y bisagra) o ventana;
  escala con dos clics; arma el plan nativo (WALL 2D + aberturas que cortan el muro + bloques).

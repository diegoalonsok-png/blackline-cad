# Calco con IA propia

Modelo propio de CAD2D3D que lee una planta (imagen o PDF rasterizado) y marca, píxel por píxel,
**muro, puerta, ventana, mueble/artefacto y texto/cota**. Después, el agente del calco convierte eso en
muros paramétricos, aberturas como bloques dinámicos y locales, con la escala sacada de una cota.

- **Datos:** 100 % propios y sintéticos (`dibujar_dataset.py` + motor de ARQ Assist). Sin conjuntos de
  terceros (los públicos más usados tienen licencia no comercial).
- **Modelo:** `CalcoNet`, U-Net liviana (~0,7 M parámetros, ~2,6 MB ONNX). Corre en el navegador del
  usuario (onnxruntime-web, WebAssembly): costo cero por plano, el plano no sale de su computadora.
- **Entrenamiento:** `Calco_entrenamiento.ipynb` en Google Colab con GPU gratuita (2–3 h).

Archivos:
- `generar_plantas.cjs` — plantas del motor de ARQ Assist (`plantas_motor.jsonl`, ya generado).
- `dibujar_dataset.py` — dibuja plantas en estilos variados con su máscara y su JSON vectorial.
- `entrenar.py` — entrena y exporta `calco.onnx`.

Prueba local rápida (CPU): `python3 dibujar_dataset.py --salida /tmp/ds --cantidad 600 --lado 384`
y `python3 entrenar.py --datos /tmp/ds --epocas 3 --lado 256 --minutos 8 --salida /tmp/calco.onnx`.

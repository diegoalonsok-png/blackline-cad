# CAD2D3D — prueba de croquis IA desde la perspectiva

El botón **✦ CREAR CROQUIS IA** aparece en la barra de cámaras del módulo 3D. Captura exactamente los píxeles de la perspectiva del canvas (sin modificar entidades ni capas), reduce la imagen de referencia a menos de 512 × 512 px, y permite generar una interpretación con Cloudflare Workers AI.

## Activar

1. Publicar la rama main en el proyecto Cloudflare Pages de CAD2D3D. GitHub Pages por sí solo no ejecuta Pages Functions.
2. En Cloudflare Pages, **Settings → Functions → Workers AI Bindings**, crear un binding con nombre exacto **AI**.
3. En las variables de entorno de Pages establecer **CROQUIS_ENABLED=true**. Dejarlo desactivado hasta tener controlado el consumo.
4. Volver a desplegar; la ruta del servidor es **POST /croquis/render**. No interfiere con api.blackline-cad.org.
5. Abrir una maqueta en 3D, elegir perspectiva, hacer clic en **CREAR CROQUIS IA**, seleccionar estilo y pulsar **Generar croquis**. El diálogo compara la fotografía original con el PNG generado y permite descargarlo.

## Modelos y límites

- Prueba rápida: **@cf/black-forest-labs/flux-2-klein-4b**.
- Mayor detalle: **@cf/black-forest-labs/flux-2-dev**, con 25 pasos.
- Imagen de referencia: PNG reducido a 500 px en su lado mayor, para cumplir los límites de Cloudflare FLUX.2. El servidor rechaza cargas superiores a 1,4 MB.
- El servicio responde con un PNG. No persiste datos en GitHub ni Cloudflare R2.
- Solo acepta peticiones con origen igual al sitio. Variable de activación **CROQUIS_ENABLED** requerida. Puede instalarse una binding opcional **CROQUIS_RATE_LIMIT** para controlar el consumo por IP.

Antes de abrirlo a usuarios, añadir autorización PRO real en el servidor, cuota de uso diaria, facturación y protección anti abuso Cloudflare WAF. No hay credenciales de servicios de IA en el navegador.

**Precisión:** por ser IA generativa, puede reinterpretar materiales, aberturas o geometría. Es una imagen de presentación, no un plano constructivo. No reactivar el antiguo renderizador NPR deshabilitado por el usuario.
## Diagnóstico verificado 23/11/2026

La ruta pública **https://blackline-cad.org/croquis/render** responde ahora a GET con JSON sin secretos:
`ready`, `aiBinding`, `enabled` y `error`.

En la comprobación de la instalación actual, `aiBinding=false` y `enabled=false`: la Function está publicada, pero faltan dos opciones en el dashboard de Cloudflare:

1. **Workers & Pages → [proyecto CAD2D3D] → Settings → Production → Bindings → Add → Workers AI → nombre AI**.
2. **Settings → Variables and Secrets / Environment variables → Production → CROQUIS_ENABLED → true**.
3. **Redeploy** la versión de producción. Reabrir el módulo 3D y elegir **Comprobar Cloudflare**.

No se recomienda incorporar un `wrangler.jsonc` nuevo con `pages_build_output_dir` sin antes importar la configuración Pages existente: podría sobrescribir settings de producción.
El botón ofrece **Guardar foto 3D** incluso sin Workers AI; esa captura se puede transformar aquí en ChatGPT como alternativa temporal.

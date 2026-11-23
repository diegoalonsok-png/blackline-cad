# CAD2D3D — botón RENDER IA: una imagen nueva, no un filtro

## Objetivo
Convertir la captura de la cámara 3D en una imagen completamente nueva con IA. La imagen final puede transformar detalles del modelo y NO reemplaza la documentación de obra.

## Estado: prototipo, NO DESPLEGADO
El frontend está en cad3d-ai-render.js y la captura en cad3d-lab.js. El backend seguro está en ai-render/worker.js. El motor NPR viejo permanece desactivado. No fusionar ni publicar el botón como operativo sin conectar el backend y verificar imágenes de prueba.

## Activar piloto de manera controlada
1. Crear un proyecto de OpenAI API, confirmar facturación independiente de ChatGPT y configurar un límite de gasto.
2. Desde la carpeta ai-render copiar wrangler.toml.example a wrangler.toml, y ejecutar npx wrangler deploy.
3. Instalar SOLO EN CLOUDFLARE los secretos con npx wrangler secret put OPENAI_API_KEY y npx wrangler secret put RENDER_TEST_TOKEN. El segundo es un token de prueba independiente, largo y aleatorio. Nunca poner la clave de OpenAI en HTML ni en JavaScript público.
4. Asignar a este Worker un dominio separado como https://ai.blackline-cad.org (no modificar los Workers DWG ni Billing).
5. Confirmar GET /health con ready:true.
6. Configurar window.CAD3D_AI_RENDER_ENDPOINT='https://ai.blackline-cad.org/render' antes de cargar el script cad3d-ai-render.js.
7. Abrir CAD2D3D > módulo 3D > C · CÁMARAS > RENDER IA. Ingresar el token piloto y elegir croquis, fotorrealista, grafito o marcadores.

## Contrato
POST /render recibe JSON con image como data URL PNG, style entre croquis/realista/grafito/conceptual, width y height. Requiere Authorization: Bearer con el token de prueba.
Devuelve JSON con image como data URL PNG. No se envían registros CAD, geometría vectorial, capas ni nombres de proyecto. El Worker no guarda imágenes.

## Protección
El servicio valida el origen, el token, el tipo/tamaño de la imagen, las dimensiones, los estilos y un rate limit de 3 por minuto aproximadamente por dirección de conexión. Los límites locales NO equivalen a un presupuesto global estricto. Para liberar a usuarios públicos, sustituir el token compartido por autenticación con sesión verificada, autorización por plan, presupuestos y cuota estricta persistida. Revisar la facturación y cumplimiento de privacidad.

## Límites gráficos
La IA genera una imagen de presentación; puede alterar proporciones, marcos, ventanas y materiales. Es imprescindible revisar contra el modelo. El navegador no utiliza directamente las capacidades internas de ChatGPT: llama mediante la API de imágenes, que requiere una cuenta propia y cobra por uso.

## Test
node --test tests/cad3d-ai-image.test.cjs

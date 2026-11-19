# CAD2D en Cloudflare: dominio .org, sitio, conversor DWG y cobro

Mismo esquema que Vitruvius Digital Library: **GitHub sigue siendo la fuente** y Cloudflare publica desde ahí. No se borra ni se desconecta GitHub Pages: queda como espejo.

```
blackline-cad.org        → Cloudflare Pages (este repositorio, rama main)
api.blackline-cad.org    → /api/convert/dwg  → Worker + Container con LibreDWG (dwg-converter/)
                      → /auth/*, /api/*   → Worker de cuentas y Stripe (billing/)
```

## 1. Dominio
Dominio elegido: **`blackline-cad.org`**, comprado en **Cloudflare → Registrar**.

## 2. Sitio (Cloudflare Pages)
1. **Workers & Pages → Create → Pages → Connect to Git** y elegí `diegoalonsok-png/blackline-cad`. Funciona aunque el repositorio sea privado.
2. Rama `main`, sin framework, sin comando de compilación y directorio de salida `.`.
3. **Custom domains**: agregá `blackline-cad.org` y `www.blackline-cad.org`.
4. En `cad2d-config.js`, completá `var DOMINIO='blackline-cad.org';`. Mientras esté vacío, el sitio sigue en beta abierta y solo con DXF.

El archivo `_headers` agrega cabeceras de seguridad y caché; GitHub Pages las ignora.

## 3. Conversor DWG → DXF (`dwg-converter/`)
- **Por qué en el servidor:** GNU LibreDWG tiene licencia GPL v3. Usada como programa aparte en tu servidor, no se distribuye a los usuarios, así que el código de CAD2D puede seguir siendo propietario. **No hay que incluir LibreDWG en el navegador.**
- **Es opcional y se puede activar más adelante.** Sin el conversor, CAD2D funciona entero con DXF.
- **Opción Cloudflare:** plan **Workers Paid** (desde USD 5 por mes, con un uso incluido) y Docker en la computadora desde donde se publica.
- **Opción sin costo fijo:** el mismo `Dockerfile` + `server.py` corre en cualquier servicio de contenedores con capa gratuita (por ejemplo Google Cloud Run). Verificá los límites gratuitos vigentes al activarlo. En ese caso, en `cad2d-config.js` poné `DWG_ACTIVO=true` y la dirección del servicio en `DWG_ENDPOINT`. `server.py` ya acepta directamente el formulario de CAD2D en `/api/convert/dwg`, con acceso limitado a `ALLOWED_ORIGINS`.
- **Publicación:** `cd dwg-converter && cp wrangler.jsonc.example wrangler.jsonc` (cambiá el dominio) y `npx wrangler deploy`.
- **Privacidad:** el archivo se convierte en memoria y en una carpeta temporal que se borra al terminar. No se guardan copias ni registros con contenido, y CAD2D pide permiso al usuario antes de enviarlo.
- **Límites:** 25 MB por archivo, 6 conversiones por minuto por IP y solo desde tu dominio.
- **Alcance:** solo lectura. Para guardar se sigue usando DXF, que abre cualquier CAD. Algunos objetos muy avanzados de DWG recientes pueden omitirse. Verificá capas, unidades y escala 1:1 con planos reales antes de anunciarlo.

## 4. Cuentas y cobro (`billing/`)
Seguí `billing/README.md` y usá `APP_ORIGIN=https://blackline-cad.org`, `APP_PATH=/` y `COOKIE_DOMAIN=blackline-cad.org`. Con la app y la API en el mismo dominio, la sesión funciona aunque el navegador bloquee cookies de terceros.

## 5. Después de publicar
- Google Search Console: agregar el dominio y enviar el sitemap cuando exista.
- Analítica: sumar el dominio.
- Recién cuando `blackline-cad.org` funcione completo, decidir si GitHub Pages redirige al dominio nuevo. Hasta entonces, los dos sirven el mismo contenido.

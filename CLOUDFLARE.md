# CAD2D en Cloudflare: dominio .org, sitio, conversor DWG y cobro

Mismo esquema que Vitruvius Digital Library: **GitHub sigue siendo la fuente** y Cloudflare publica desde ahí. No se borra ni se desconecta GitHub Pages: queda como espejo.

```
tu-dominio.org        → Cloudflare Pages (este repositorio, rama main)
api.tu-dominio.org    → /api/convert/dwg  → Worker + Container con LibreDWG (dwg-converter/)
                      → /auth/*, /api/*   → Worker de cuentas y Stripe (billing/)
```

## 1. Dominio
Comprá el dominio en **Cloudflare → Registrar**. Por ejemplo `cad2d.org` o `blackline-cad.org`, según cuál esté libre; evitá "dwg" y "autocad" en el nombre. El registro queda directamente en tu cuenta de Cloudflare.

## 2. Sitio (Cloudflare Pages)
1. **Workers & Pages → Create → Pages → Connect to Git** y elegí `diegoalonsok-png/blackline-cad`. Funciona aunque el repositorio sea privado.
2. Rama `main`, sin framework, sin comando de compilación y directorio de salida `.`.
3. **Custom domains**: agregá `tu-dominio.org` y `www.tu-dominio.org`.
4. En `cad2d-config.js`, completá `var DOMINIO='tu-dominio.org';`. Mientras esté vacío, el sitio sigue en beta abierta y solo con DXF.

El archivo `_headers` agrega cabeceras de seguridad y caché; GitHub Pages las ignora.

## 3. Conversor DWG → DXF (`dwg-converter/`)
- **Por qué en el servidor:** GNU LibreDWG tiene licencia GPL v3. Usada como programa aparte en tu servidor, no se distribuye a los usuarios, así que el código de CAD2D puede seguir siendo propietario. **No hay que incluir LibreDWG en el navegador.**
- **Requisitos:** plan **Workers Paid** (desde USD 5 por mes, con un uso incluido) y Docker en la computadora desde donde se publica.
- **Publicación:** `cd dwg-converter && cp wrangler.jsonc.example wrangler.jsonc` (cambiá el dominio) y `npx wrangler deploy`.
- **Privacidad:** el archivo se convierte en memoria y en una carpeta temporal que se borra al terminar. No se guardan copias ni registros con contenido, y CAD2D pide permiso al usuario antes de enviarlo.
- **Límites:** 25 MB por archivo, 6 conversiones por minuto por IP y solo desde tu dominio.
- **Alcance:** solo lectura. Para guardar se sigue usando DXF, que abre cualquier CAD. Algunos objetos muy avanzados de DWG recientes pueden omitirse. Verificá capas, unidades y escala 1:1 con planos reales antes de anunciarlo.

## 4. Cuentas y cobro (`billing/`)
Seguí `billing/README.md` y usá `APP_ORIGIN=https://tu-dominio.org`, `APP_PATH=/` y `COOKIE_DOMAIN=tu-dominio.org`. Con la app y la API en el mismo dominio, la sesión funciona aunque el navegador bloquee cookies de terceros.

## 5. Después de publicar
- Google Search Console: agregar el dominio y enviar el sitemap cuando exista.
- Analítica: sumar el dominio.
- Recién cuando `tu-dominio.org` funcione completo, decidir si GitHub Pages redirige al dominio nuevo. Hasta entonces, los dos sirven el mismo contenido.

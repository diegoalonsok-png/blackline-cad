# CAD2D · Modelo de pago después del período gratuito

**Estado: plantilla NO desplegada.** Hoy el sitio funciona como **beta abierta**: todo habilitado, sin cuentas ni cobros. Este directorio deja listo el camino para cobrar cuando el producto esté validado.

## Cómo funciona

| Etapa | Qué ve el usuario | Quién decide |
| --- | --- | --- |
| Beta abierta (hoy) | Todo habilitado. Insignia **BETA ABIERTA** en la barra superior. | Nadie (no hay servidor configurado) |
| Prueba de 90 días | Crea su cuenta con un enlace por correo (sin contraseña). Todo habilitado durante 90 días. | Servidor (`users.trial_ends_at`) |
| Plan Gratis (después de la prueba) | Sigue dibujando, abre y exporta sus dibujos en DXF, SVG, PNG y PDF A4. Se bloquean solo las funciones Pro. | Servidor |
| Pro / Estudio | Todo habilitado. | Webhook firmado de Stripe |

Principios:

- **Nunca se secuestra el trabajo del cliente.** El dibujo, abrir y exportar DXF son siempre gratis.
- **El navegador nunca decide quién pagó.** `cad-plan.js` solo muestra lo que responde `/api/status`. Un usuario que edite el JavaScript solo se engaña a sí mismo, porque el servidor es la fuente de verdad.
- **Si el servidor no responde, no se bloquea a nadie.** Es mejor perder un cobro que impedir que alguien abra un dibujo.
- **Ninguna clave secreta va al frontend.** `STRIPE_SECRET_KEY` vive solo como secreto del Worker. Hay una prueba que falla si aparece una clave `sk_` en el cliente.

## Planes sugeridos (editables en `cad-plan.js` y en Stripe)

- **Gratis:** dibujo 2D completo, capas, cotas, DXF/SVG/PNG, PDF A4 y la galería básica.
- **Pro (US$ 9 por mes o US$ 90 por año):** bloques Pro de la galería, ploteo A0–A3, proyectos ilimitados, DWG cuando exista el conversor, nube y sin marca de agua.
- **Estudio (US$ 29 por mes, 5 usuarios):** todo lo de Pro, más equipo y bibliotecas compartidas.

Los precios son una propuesta inicial. Validalos con tus usuarios antes de publicar.

## Puesta en marcha (cuando decidas cobrar)

1. Cuenta en Cloudflare (Workers + D1) y en Stripe. En Stripe, creá los productos **Pro** y **Estudio**, con los precios mensual y anual (`price_…`).
2. Base de datos: `wrangler d1 create cad2d` y luego `wrangler d1 execute cad2d --file=billing/schema.sql`.
3. Copiá `wrangler.toml.example` como `wrangler.toml` y completá los orígenes, los precios y el id de D1.
4. Cargá los secretos: `wrangler secret put STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET` (64 o más caracteres aleatorios) y `RESEND_API_KEY` (correo del enlace de acceso).
5. Publicá con `wrangler deploy`. En Stripe, agregá el webhook `https://api.tu-dominio.com/api/stripe-webhook` con los eventos `checkout.session.completed` y `customer.subscription.*`.
6. En `index.html`, **antes** de `workspace-upgrade.js`, agregá:

   ```html
   <script>window.CAD2D_AUTH_CONFIG={loginUrl:'https://api.tu-dominio.com/auth/login',statusUrl:'https://api.tu-dominio.com/api/status',checkoutUrl:'https://api.tu-dominio.com/api/checkout',portalUrl:'https://api.tu-dominio.com/api/portal',enforce:true};</script>
   ```

7. Probá todo en modo de prueba de Stripe (tarjeta 4242 4242 4242 4242): alta, prueba, pago, cancelación, pago vencido y webhook repetido.
8. Recomendado: migrar el frontend a Cloudflare Pages con un dominio propio, para que la app y la API compartan dominio y la cookie de sesión sea de primera parte. Con GitHub Pages y una API en otro dominio, algunos navegadores con bloqueo estricto de cookies de terceros pueden no conservar la sesión.

## Antes de cobrar (no técnico)

- Términos y condiciones, política de privacidad y de reembolsos.
- Facturación en Argentina: definí si facturás como monotributista o con una empresa. Stripe no opera directamente con cuentas argentinas. Las alternativas habituales son una LLC en EE. UU. con Stripe, o Mercado Pago / Paddle / Lemon Squeezy como comerciante registrado. El Worker está escrito para Stripe, pero la lógica de planes no depende del proveedor. Consultá con tu contador antes de elegir.
- No soy abogado ni contador: estas notas son técnicas, no asesoramiento legal o fiscal.

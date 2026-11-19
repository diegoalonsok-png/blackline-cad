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

## Precios (editables en `cad-plan.js` y en Stripe)

Período gratuito: **3 meses (90 días)** desde el alta (`TRIAL_DAYS=90`). Precios en Stripe (entorno de prueba, cuenta Blackline CAD con Managed Payments): mensual `price_1UdWXqDRUE2reABAHniRmfHw` (1,59 €), anual `price_1UdWYdDRUE2reABAPWeKFW5K` (12,99 €). Modo activo: mensual `price_1UdX22DY9yzl20JEdPDjQo3X`, anual `price_1UdX22DY9yzl20JE1Gzk27li`.

| Plan | Precio (IVA incluido) | Te queda por cobro* |
| --- | --- | --- |
| Gratis | 0 € (dibujo, DXF, SVG, PNG, PDF A4, galería básica) | — |
| Pro mensual | **1,59 €** | ≈ 1,02 € |
| Pro anual | **12,99 €** (32 % menos que 12 meses) | ≈ 10,13 € |
| Estudio mensual (5 usuarios) | 4,99 € | ≈ 3,74 € |
| Estudio anual (5 usuarios) | 49,99 € | ≈ 39,71 € |

\* Estimación con IVA español del 21 %, tarjeta del EEE (1,5 % + 0,25 €), Billing 0,7 % y Stripe Tax 0,5 %. Con tarjetas de fuera del EEE la comisión es mayor (3,15 % + 0,25 €, más 2 % si hay conversión de moneda). El precio mensual se fijó en 1,59 € para que, tras comisiones e IVA, quede aproximadamente 1 € neto.

Al crear los precios en Stripe, marcá *Incluir impuestos en el precio* (`tax_behavior=inclusive`) para que el cliente pague exactamente esos importes. Con tickets tan chicos conviene **destacar el plan anual**: la comisión fija de 0,25 € se paga una vez por año en lugar de doce.

## Cuenta de Stripe: diagnóstico (18 nov 2026)

La cuenta conectada (`acct_…U61u`, país **ES**, moneda **EUR**, con **N26** vinculada e identidad verificada) **no está lista para CAD2D**:

1. **No puede cobrar ni transferir pagos** (`charges_enabled=false`, `payouts_enabled=false`, estado *en revisión*). Tiene vencido un formulario de **verificación del modelo de negocio** y una **apelación** pendiente por un rechazo previo.
2. **La creó Buy Me a Coffee** como cuenta conectada, con la descripción "creador que recibe pagos por buymeacoffee.com". En los resúmenes de tarjeta los clientes verían `BUYMEACOFFEE.COM`. Conviene no mezclar el negocio de software con esa cuenta.

**Recomendación:** crear una **cuenta nueva de Stripe propia para CAD2D** en dashboard.stripe.com (menú de la cuenta → *Nueva cuenta*). Configurala así:

- País España, persona física (o la sociedad, si la creás).
- Nombre comercial **CAD2D**.
- Descripción: *software de dibujo 2D en línea por suscripción*.
- Sitio web: la URL de GitHub Pages o tu dominio.
- Descriptor de los resúmenes de tarjeta: `CAD2D`.
- Cuenta bancaria: la misma N26, que es un IBAN español en EUR.

Después:

- Conectá la cuenta nueva al conector de Stripe de Claude con permisos de **modo de prueba**. Desde ahí se pueden crear los productos y precios y probar todo el circuito sin dinero real.
- **PayPal:** con una cuenta española, Stripe procesa PayPal dentro de Checkout. Se activa en *Configuración → Métodos de pago → PayPal* y, para suscripciones, hay que pedir los *pagos recurrentes* de PayPal. El código no fija métodos de pago, así que PayPal, tarjeta, SEPA, Apple Pay y Google Pay aparecen solos cuando los activás.
- **IVA:** activá Stripe Tax con la dirección de origen en España y la variable `STRIPE_TAX=1`. Para vender a consumidores de otros países de la UE suele ser necesario el régimen de ventanilla única (OSS).

Antes de cobrar, consultá con un gestor:

- Para vender como persona física en España normalmente hay que darse de alta como autónomo y facturar.
- Si vivís en Argentina, también importa dónde tributás.

## Puesta en marcha (cuando decidas cobrar)

1. Cuenta en Cloudflare (Workers + D1) y en Stripe. En Stripe, creá los productos **Pro** y **Estudio**, con los precios mensual y anual (`price_…`).
2. Base de datos: `wrangler d1 create cad2d` y luego `wrangler d1 execute cad2d --file=billing/schema.sql`.
3. Copiá `wrangler.toml.example` como `wrangler.toml` y completá los orígenes, los precios y el id de D1.
4. Cargá los secretos: `wrangler secret put STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET` (64 o más caracteres aleatorios) y `RESEND_API_KEY` (correo del enlace de acceso).
5. Publicá con `wrangler deploy`. En Stripe, agregá el webhook `https://api.blackline-cad.org/api/stripe-webhook` con los eventos `checkout.session.completed` y `customer.subscription.*`.
6. En `index.html`, **antes** de `workspace-upgrade.js`, agregá:

   ```html
   <script>window.CAD2D_AUTH_CONFIG={loginUrl:'https://api.blackline-cad.org/auth/login',statusUrl:'https://api.tu-dominio.com/api/status',checkoutUrl:'https://api.tu-dominio.com/api/checkout',portalUrl:'https://api.tu-dominio.com/api/portal',enforce:true};</script>
   ```

7. Probá todo en modo de prueba de Stripe (tarjeta 4242 4242 4242 4242): alta, prueba, pago, cancelación, pago vencido y webhook repetido.
8. Recomendado: migrar el frontend a Cloudflare Pages con un dominio propio, para que la app y la API compartan dominio y la cookie de sesión sea de primera parte. Con GitHub Pages y una API en otro dominio, algunos navegadores con bloqueo estricto de cookies de terceros pueden no conservar la sesión.

## Antes de cobrar (no técnico)

- Términos y condiciones, política de privacidad (RGPD) y de reembolsos o desistimiento (14 días en la UE para consumidores, salvo renuncia expresa al empezar a usar el servicio).
- Alta fiscal en España y emisión de facturas. Stripe Invoicing o una herramienta compatible con VERI*FACTU pueden automatizarlas.
- No soy abogado ni gestor: estas notas son técnicas, no asesoramiento legal o fiscal.

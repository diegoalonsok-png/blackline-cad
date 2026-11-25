# CAD2D3D — croquis IA: piloto privado protegido

## Estado
Mantener CROQUIS_ENABLED=false en Production hasta revisar el consumo total de la cuenta y configurar las protecciones. No contratar ni cancelar servicios. No cambiar Vitruvius, R2, dominios, billing, DWG ni el motor 3D.

El cliente puede fotografiar y guardar una perspectiva PNG sin IA. El renderizador anterior sigue desactivado.

## Política private-pilot-v1
- Solo FLUX.2 Klein 4B. Entrada PNG con dimensiones máximas de 512 x 512, salida de lado mayor 768, una referencia y una llamada, sin reintentos automáticos.
- Máximo 20 retoques por día UTC (≈110 neuronas cada uno, ≈2.200 de las 10.000 neuronas gratuitas diarias), globales para este piloto, no por navegador/IP. Reserva previa mediante UPSERT atómico en D1. No se devuelven reservas fallidas.
- Clave privada aleatoria de al menos 32 caracteres en secreto CROQUIS_PILOT_KEY. No incluir en GitHub, ni guardar en navegador. No usar la contraseña de Cloudflare.
- No ejecutar inferencias si falta el binding AI, el contador, la clave, autorización válida o si CROQUIS_ENABLED no vale true.
- GET /croquis/render devuelve estados de protección, no claves.
- Limita el consumo de este código, no garantiza una factura de cero: los 10.000 neuronas gratuitas diarias son compartidas por la cuenta, puede haber otras llamadas y D1/Workers pueden tener cargos de excedente.

## Preparación antes de activar (requiere aprobación del titular)
1. Mantener CROQUIS_ENABLED=false. Revisar el plan y el consumo real de Workers AI. Verificar que exista margen suficiente para esta prueba dentro de la cuota incluida.
2. Si el titular aprueba, crear una base D1 dedicada exclusivamente a croquis; no requiere una nueva suscripción por sí misma, pero tiene medición de consumo. No utilizar las bases ni R2 de otros servicios. Ejecutar una sola vez en la consola SQL de esa base:
```sql
CREATE TABLE IF NOT EXISTS croquis_daily (
 day TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 20)
);
```
3. En Settings > Bindings del proyecto blackline-cad (Production) vincular esa base como CROQUIS_QUOTA. Crear el secreto CROQUIS_PILOT_KEY (tipo Secret) con valor aleatorio de >=32 caracteres.
4. Confirmar la publicación del código nuevo en main; la respuesta de /croquis/render debe indicar policy=private-pilot-v1, quotaConfigured=true, privateAccessConfigured=true, aiBinding=true. Revisar también los enlaces de despliegues previos: un despliegue inmutable anterior con IA habilitada podría conservar su propia configuración. Restringir accesos a despliegues antiguos mediante controles de acceso apropiados, sin eliminar sitios o deployments, antes de exponer el piloto.
5. Solo después de verificar el presupuesto y accesos, activar CROQUIS_ENABLED=true, desplegar y probar una única generación privada. Si no se puede confirmar margen de cuota, mantener desactivado. No usar límites generales de toda la cuenta que puedan interrumpir otros sitios.

Precios y cuotas: https://developers.cloudflare.com/workers-ai/platform/pricing/

**Precisión arquitectónica:** la IA puede reinterpretar materiales, aberturas o geometría. No es documentación de obra.


## Retoque del render artístico (nov 2026)
El panel de IA usa por defecto como entrada el **render artístico local** (botón ✦ Retocar con IA en RENDER ARTÍSTICO) y el estilo «Retocar el render artístico»: la IA solo afina un dibujo que ya coincide con el modelo. Tope de 20 por día pensado para no salir nunca de la cuota gratuita; revisar el consumo total de Workers AI de la cuenta antes de subirlo.

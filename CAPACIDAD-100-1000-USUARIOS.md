# Blackline CAD — capacidad de 100 y 1.000 usuarios (2026-11-16)

## Arquitectura verificada en el código

El sitio se distribuye como páginas y archivos JavaScript estáticos en GitHub Pages. El lienzo Canvas 2D, el dibujo, las transformaciones, el OSNAP, el historial y el guardado con IndexedDB se ejecutan en cada navegador. No existe actualmente un servicio propio de colaboración en tiempo real, base de datos central de dibujos ni API del CAD a la que cada movimiento envíe solicitudes.

Por ello, 100 o 1.000 usuarios independientes **no producen 100 o 1.000 cálculos de dibujo en el servidor**. Sí generan descargas de recursos iniciales y solicitudes al alojamiento; las prestaciones dependen de la CDN, caché, límites operativos de GitHub Pages, red y recursos de CPU/memoria de cada dispositivo.

## Presupuesto inicial (solo recursos principales)

Los 10 archivos principales conocidos, incluido `index.html`, suman aproximadamente **461.115 bytes sin compresión** en la rama de esta prueba.

| Primeras visitas frías | Transferencia teórica agregada |
| --- | ---: |
| 100 | 46,1 MB |
| 1.000 | 461,1 MB |

Son estimaciones de primer acceso y **no** miden la transferencia real: se excluyen otros recursos opcionales, cabeceras, compresión HTTP, retransmisiones, y también las reducciones por caché. Tampoco equivalen a capacidad asegurada o aprobación de GitHub Pages para tráfico intensivo.

## Simulación segura y reproducible

```bash
node --test tests/performance.test.cjs
node scripts/simulate-concurrent-users.cjs --users=100 --concurrency=50
node scripts/simulate-concurrent-users.cjs --users=1000 --concurrency=50
```

El script solamente crea un servidor HTTP en `127.0.0.1` de puerto aleatorio, lee los archivos del repositorio local y simula 100/1.000 visitantes virtuales, con un máximo de 50 sesiones activas. Cada visitante solicita diez archivos; registra tasas, latencia p50/p95, fallas y tráfico. **No efectúa solicitudes al sitio público.** Sirve para detectar errores básicos de empaquetado, rutas y sobrecarga del servidor de prueba local, pero **NO** reproduce las condiciones de GitHub Pages, su CDN o los navegadores de los visitantes.

Los cálculos de visibilidad de los objetos estándar (línea, rectángulo, círculo, arco, polilínea simple) tienen un camino optimizado. Bloques, cotas, elipses y geometrías especiales conservan el cálculo anterior para evitar pérdida de precisión.

## Riesgos y medidas siguientes

1. **Rendimiento del dispositivo:** ensayar con 1.000, 10.000 y 100.000 entidades en Chromium/Firefox/Safari, midiendo FPS, duración de `draw()`, OSNAP, TRIM y memoria (incluidos los 75 estados posibles de deshacer).
2. **Estado de trabajo:** IndexedDB es local y por navegador. Debe advertirse al usuario que no hay sincronización automática entre dispositivos. Mantener exportación CADJSON como respaldo independiente.
3. **Disponibilidad:** las pruebas del servidor local no acreditan capacidad de GitHub Pages. Para una previsión profesional, usar analítica agregada, monitoreo de errores y, si los términos y tráfico lo requieren, infraestructura estática/CDN escalable.
4. **Tamaño inicial:** el HTML principal pesa alrededor de 385 KB sin comprimir; la mayor ganancia futura será separar el motor JavaScript monolítico del HTML para facilitar caché, con pruebas de regresión estrictas.
5. **Carga real:** realizar ensayos externos únicamente con autorización, tasa limitada y fuera de horarios críticos. No lanzar 1.000 conexiones simultáneas contra GitHub Pages sin coordinarlo.

## Criterios de aceptación antes de declarar soporte para 1.000 usuarios

- Cero errores críticos en navegación, apertura de biblioteca, dibujo/guardado y recursos faltantes.
- Medidas de disponibilidad, error HTTP y latencia reales tomadas en infraestructura autorizada.
- Pruebas en navegadores y equipos representativos con planos grandes.
- Verificación de recuperación de datos y ausencia de pérdida al cerrar o recargar el navegador.

Esta versión implementa mejoras y herramientas de medición, **no certifica** todavía el soporte de 1.000 usuarios simultáneos en producción.


## Resultados confirmados en GitHub Actions (PR #14)

El workflow de validación ejecutado el 16 de noviembre de 2026 concluyó con **éxito** tanto en la batería geométrica como en ambos escenarios locales. Estos resultados corresponden a `127.0.0.1` dentro del runner; **NO** deben extrapolarse a latencia de red o concurrencia de GitHub Pages.

| Métrica | 100 sesiones | 1.000 sesiones |
| --- | ---: | ---: |
| Límite de sesiones paralelas | 50 | 50 |
| Solicitudes realizadas | 1.000 | 10.000 |
| Sesiones fallidas | 0 | 0 |
| Transferencia agregada | 43,98 MiB | 439,75 MiB |
| Duración local | 0,17 s | 0,78 s |
| Latencia p95 por solicitud | 9,68 ms | 7,35 ms |
| Latencia p95 por sesión | 162,65 ms | 70,25 ms |

Registros de la ejecución: https://github.com/diegoalonsok-png/blackline-cad/actions/runs/43938886706.

Prueba de regresión general también exitosa: https://github.com/diegoalonsok-png/blackline-cad/actions/runs/43938886830.

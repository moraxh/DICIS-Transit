# Guía de Contribución

¡Hola! Gracias por querer aportar a DICIS Transit. Toda ayuda es bienvenida, especialmente si hace que la app sea más útil, rápida, confiable y barata de mantener.

## 1. Alcance del proyecto

DICIS Transit es una herramienta estudiantil para consultar rutas, horarios, avisos y reportes del transporte universitario.

- **Mantén el enfoque:** evita convertirla en un sistema académico, de trámites o de gestión oficial.
- **Sé claro con los datos:** la app trabaja con rutas y tiempos estimados; no presentes predicciones como información oficial garantizada.
- **Cuida el aviso legal:** cualquier cambio de UX debe mantener claro que es una propuesta estudiantil, no una herramienta oficial de la UG.

## 2. Plataforma gratis

Queremos que el proyecto siga funcionando con capas gratuitas tanto como sea posible. Antes de agregar una función, piensa en su costo operativo:

- Evita consultas constantes desde el cliente.
- Prefiere cargas agrupadas y datos ya filtrados desde Supabase.
- Usa realtime solo donde aporte valor real.
- No agregues jobs, cron tasks o servicios externos sin justificar su consumo.
- Optimiza queries, índices y views cuando una pantalla empiece a depender de datos agregados.

Las contribuciones que reduzcan costos, mejoren caché o disminuyan el trabajo del navegador son especialmente valiosas.

## 3. Rendimiento móvil

La mayoría de estudiantes usará la app desde celular. Mantén la experiencia ligera:

- Evita timers agresivos y renders innecesarios.
- No agregues dependencias pesadas si el stack actual puede resolver el caso.
- Cuida batería, datos móviles y tamaño del bundle.
- Prueba vistas principales en mobile antes de abrir el PR.

## 4. Seguridad y datos

La app usa Supabase con RLS, roles y rutas server-side para operaciones sensibles.

- No expongas claves privadas en el cliente.
- Usa `SUPABASE_SERVICE_ROLE_KEY` solo en server/API routes.
- Mantén las políticas RLS alineadas con los roles `student` y `admin`.
- No debilites límites contra spam, duplicados o abuso de reportes.
- Si modificas tablas, agrega migraciones explícitas en `supabase/migrations`.

## 5. Diseño y experiencia

Procura respetar el estilo actual de la app: oscuro, compacto, móvil primero y enfocado en consulta rápida.

- Mantén consistencia con componentes existentes.
- Usa iconos y controles claros para acciones frecuentes.
- Evita pantallas explicativas largas dentro de la app.
- Para cambios visuales grandes, abre primero un issue o discusión.

## 6. PRs atómicos

Haz PRs pequeños y enfocados. Es más fácil revisar:

- Un bug fix aislado.
- Una mejora de rendimiento concreta.
- Una migración de base de datos con su ajuste de UI.
- Una mejora visual acotada a una pantalla.

Evita mezclar refactors grandes, cambios de diseño y modificaciones de base de datos en el mismo PR.

## 7. Formato de código

El proyecto usa Biome para revisar y formatear el código de la app.

Desde `app/`:

```bash
pnpm lint
pnpm format
```

Antes de abrir un PR, asegúrate de que el proyecto compile:

```bash
pnpm build
```

## 8. Desarrollo local

Flujo recomendado:

```bash
supabase start
supabase db reset

cd app
pnpm install
pnpm dev
```

Si agregas variables de entorno nuevas, documenta su propósito en el README y evita commitear valores reales.

¡Gracias por ayudar a que DICIS Transit sea más útil para la comunidad estudiantil!

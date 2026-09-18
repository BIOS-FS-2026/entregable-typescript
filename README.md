# Proyecto s15.1 — TypeScript strict

Práctica de TypeScript strict (Node 24 + ESM) con utilidades de tareas, unión discriminada y red tipada.

**Qué hace (5 líneas):**
1. Utilidades de tareas en `src/utils/`: `countPendingTasks`, `slugificar`, `agruparPorPrioridad`, `formatTask` y `aEntero` (valida entradas devolviendo `Resultado<T>`, nunca `throw` ni `null`).
2. `EstadoLista` (unión discriminada de `cargando | exito | error`) con `describirEstado`: `switch` sobre `estado` y `default` con `never` para que el compilador garantice que todos los casos estén cubiertos.
3. La app del módulo 3 migrada a `src/app.ts` (`lista-tareas`): lista de tareas con `localStorage`, cada acceso al DOM protegido contra `null` (sin `!`) y `obtenerTareas` tipado como `Promise<Resultado<Tarea[]>>`.
4. `src/types/api.ts` define los request/response del endpoint futuro de tareas, derivados del modelo con `Omit`/`Partial` (no copiados a mano).
5. Se corre con: `npm run check` (valida tipos), `npm run build` (compila a `dist/`), `npm run start` (corre el entry de Node) y `npm run dev` (modo watch con `tsx`).

Requiere Node 24+. Archivo migrado del módulo 3: `lista-tareas/app.js` → `src/app.ts`.

## Scripts

| Comando   | Qué hace                                                        |
| --------- | --------------------------------------------------------------- |
| `dev`     | `tsx watch src/index.ts` — ejecuta TS y recarga al editar       |
| `check`   | `tsc --noEmit` — solo comprueba errores de tipos, sin compilar  |
| `build`   | `tsc` — compila el TS de `src/` a JavaScript en `dist/`         |
| `start`   | `node dist/index.js` — ejecuta el JS ya compilado               |

## Estructura

```
src/
├── index.ts           # Entry de Node: demo de tipos y utilidades
├── app.ts             # Migrado del módulo 3: lista de tareas + fetch tipado
├── types/
│   ├── index.ts       # Priority, Resultado<T>, Task, EstadoLista
│   ├── tarea.ts       # interface Tarea (modelo del módulo 3)
│   └── api.ts         # request/response (Omit/Partial de Tarea)
└── utils/             # barril con re-exports nombrados
```
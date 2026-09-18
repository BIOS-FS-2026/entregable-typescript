# Explicación — Utilidades con barril y `Resultado<T>`

## Qué se hizo

Se reorganizó `src/utils/` para que cada utilidad viva en su **propio archivo**, se agregó
la unión discriminada `Resultado<T>` que permite fallar **sin `throw` ni `null`**, se creó
un **barril** (`src/utils/index.ts`) y se reescribió el consumidor en `src/index.ts`.

## 1. Las utilidades (5, cada una en su archivo)

| Archivo                        | Utilidad              | Firma                                          | Comportamiento |
| ------------------------------ | --------------------- | ---------------------------------------------- | -------------- |
| `formatTask.ts`                | `formatTask`          | `(task: Task): string`                         | Dibuja una tarea como `[x] Título (prioridad)`. |
| `countPendingTasks.ts`         | `countPendingTasks`   | `(tasks: Task[]): number`                      | Cuenta las tareas sin completar. |
| `slugificar.ts`                | `slugificar`          | `(frase: string): string`                      | Convierte un texto a slug de URL (minúsculas, sin tildes, guiones). |
| `agruparPorPrioridad.ts`       | `agruparPorPrioridad` | `(tasks: Task[]): GrupoPorPrioridad`           | Agrupa las tareas en `{ baja, media, alta }`. |
| `aEntero.ts`                   | `aEntero`             | `(texto: string): Resultado<number>`           | Parsea un entero; **falla con entrada inválida**. |

Todas tienen **parámetros y retorno anotados** explícitamente.

## 2. El tipo `Resultado<T>` (unión discriminada)

Definido en `src/types/index.ts`:

```ts
export type Resultado<T> =
  | { ok: true; valor: T }    // éxito → lleva el valor
  | { ok: false; error: string }; // fallo → lleva el mensaje
```

`ok` es el **discriminador**: si es `true`, el objeto solo deja acceder a `valor`;
si es `false`, solo a `error`. TypeScript estrecha el tipo dentro de cada rama del `if`.

`aEntero` es la utilidad que puede fallar. **Nunca lanza `throw`** para el caso esperado
ni devuelve `null`: una entrada como `"hola"`, `("")` o `"3.14"` produce
`{ ok: false, error: "..." }`.

```ts
export function aEntero(texto: string): Resultado<number> {
  const limpio = texto.trim();
  if (!/^-?\d+$/.test(limpio)) {
    return { ok: false, error: `"${texto}" no es un número entero válido` };
  }
  return { ok: true, valor: Number.parseInt(limpio, 10) };
}
```

## 3. El consumidor en `src/index.ts`

El valor solo se toca si `r.ok` es `true`; el mensaje de error va en el `else`.
Fuera del `if`, el compilador **no te deja tocar `valor`** (no existe en esa rama):

```ts
const r = aEntero(process.argv[2] ?? '');

if (r.ok) {
  console.log('entero:', r.valor);
} else {
  console.error('entrada invalida:', r.error);
}
```

Notas:

- Se usa `process.argv[2] ?? ''` (no `? ""`) para pasar `""` cuando no hay argumento.
- Los imports llevan extensión `.js` (`./utils/index.js`) en lugar de `.ts`: con
  `module: "NodeNext"` es obligatorio para que `build` (que **sí emite** `dist/`) funcione.
- El resto del archivo también usa las demás utilidades (barril), así `npm start` imprime su salida.

## 4. El barril `src/utils/index.ts`

Solo re-exports **nombrados**, nada de `export *`, y los tipos con `export type`:

```ts
export { agruparPorPrioridad } from './agruparPorPrioridad.js';
export { aEntero } from './aEntero.js';
export { countPendingTasks } from './countPendingTasks.js';
export { formatTask } from './formatTask.js';
export { slugificar } from './slugificar.js';
export type { GrupoPorPrioridad } from './agruparPorPrioridad.js';
```

## 5. Pruebas ejecutadas

```bash
npx tsc -version        # Version 6.0.3  (instalada 6.0.3 para cumplir el requisito)
npm run check           # tsc --noEmit → sin errores de tipos
npm run build           # crea dist/
npm run start           # imprime la salida de las utilidades
node dist/index.js 42   # aEntero ok → "entero: 42"
```

Salida de `npm start`:

```
Tareas pendientes: 2
Slug del título 1: configurar-el-proyecto
Tareas de prioridad alta: 1

[x] Configurar el proyecto (alta)
[ ] Crear tipos y utilidades (media)
[ ] Compilar y ejecutar (baja)

--- aEntero ---
entrada invalida: "" no es un número entero válido
```

## Verificaciones de la tarea

- [x] Entre 4 y 5 utilidades, cada una en su propio archivo.
- [x] `aEntero` falla con entrada inválida y devuelve `Resultado<T>` (sin `throw`, sin `null`).
- [x] El consumidor accede al valor dentro de `if (r.ok)` y al error en el `else`.
- [x] Barril con re-exports nombrados y `export type` para tipos; sin `export *`.
- [x] Se importan dos utilidades (`aEntero` y `countPendingTasks`) desde el barril y `npm run check` pasa.
- [x] `npm run build` crea `dist/` y `npm start` imprime la salida.
- [x] `npx tsc -version` imprime la versión 6.0.3.
- [x] `git status` no lista `dist/` ni `node_modules/` (están en `.gitignore`).
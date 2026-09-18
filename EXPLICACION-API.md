# Explicación: tipar la red con `Promise<Resultado<T>>` y las interfaces de request/response

## La regla de las funciones `async`

En una función marcada `async`, el tipo de retorno **siempre** es una `Promise`.
El `await` es lo que "desenvuelve" esa promesa:

- Una función normal declara `Resultado<Tarea[]>`.
- Una función `async` que devuelve lo mismo declara `Promise<Resultado<Tarea[]>>`.
- `const r = await obtenerTareas(url)` hace que `r` sea `Resultado<Tarea[]>`.

Es decir: `async` envuelve el resultado en una promesa y `await` lo vuelve a
sacar. Son operaciones inversas.

## `src/types/api.ts` — interfaces de request y response

```ts
import type { Tarea } from './tarea.js';
```
Trae el modelo `Tarea` solo como tipo (no se emite `import` en el JS final).
Se usa `./tarea.js` (con `.js`) porque el proyecto es `NodeNext` + `type: module`.

```ts
export type CrearTareaRequest = Omit<Tarea, 'id'>;
```
`Omit<Tarea, 'id'>` construye un tipo nuevo copiando **todos** los campos de
`Tarea` menos `id`. El `id` no lo manda el cliente: lo genera el backend.
No se copian los campos a mano; si mañana cambia `Tarea`, este tipo cambia solo.

```ts
export interface CrearTareaResponse {
  id: string;
  creadoEn: string;
}
```
Lo que el backend devuelve al crear: el `id` que generó y la marca de tiempo.
No es el modelo completo, por eso es una interfaz propia y no un `Tarea`.

```ts
export type ActualizarTareaRequest = Partial<Omit<Tarea, 'id'>>
```
`Partial<...>` vuelve **opcionales** todos los campos. Para un `PATCH`/`PUT`
parcial, alcanza con mandar solo los campos que cambian. `Partial` + `Omit`
derivan del modelo en vez de repetir campos a mano.

## `src/app.ts` — el fetch tipado

```ts
import type { Resultado } from './types/index.js';
```
Reutiliza el `Resultado<T>` que ya existía en el proyecto (no se duplica).
Se importa como tipo porque solo se usa en anotaciones.

```ts
import type { Tarea } from './types/tarea.js';
```
El modelo que va a validar la respuesta.

```ts
const API_URL = '/api/tareas';
```
Ruta del endpoint que existirá cuando armemos el backend. Al ser relativa,
en el navegador se resuelve contra el origen actual.

```ts
export async function obtenerTareas(url: string): Promise<Resultado<Tarea[]>> {
```
La firma clave: `async` + `Promise<Resultado<Tarea[]>>`. La función **nunca
lanza** una excepción esperada: el error de red y el error HTTP se convierten
en la variante de fallo (`{ ok: false, error }`).

```ts
  try {
    const respuesta = await fetch(url);
```
`fetch` devuelve `Promise<Response>`; el `await` da un `Response`. Se envuelve
todo en `try` porque `fetch` **sí** rechaza la promesa ante un error de red
(por ejemplo, sin conexión). Ese caso lo captura el `catch`.

```ts
    if (!respuesta.ok) {
      return { ok: false, error: `HTTP ${respuesta.status}` };
    }
```
`respuesta.ok` es `false` para códigos 4xx/5xx. Eso no es una excepción, es
un estado HTTP: se mapea a la variante de fallo con el código (`HTTP 404`).
El `return` corta la función; el tipo de retorno lo garantiza el compilador.

```ts
    const datos: unknown = await respuesta.json();
```
`respuesta.json()` devuelve `Promise<any>`. Se anota como `unknown` a
propósito: lo que llega de la red **no es** una `Tarea` todavía, es un dato
sin forma conocida. Así el compilador nos obliga a validarlo antes de usarlo.

```ts
    if (!Array.isArray(datos)) {
      return { ok: false, error: 'la respuesta no es un array' };
    }
```
`Array.isArray` estrecha `unknown` a un array. Si no lo es, fallo.

```ts
    const elementos: unknown[] = datos;
```
Se tipa como `unknown[]` para que cada elemento siga siendo desconocido hasta
validarlo. Evita arrastrar el `any` que venía de `JSON.parse`.

```ts
    if (!elementos.every(esTarea)) {
      return { ok: false, error: 'la respuesta no tiene la forma de Tarea[]' };
    }
```
`esTarea` es un **type predicate** (`valor is Tarea`): no miente. `every`
recorre el array y, si todos pasan, TypeScript estrecha `elementos` a
`Tarea[]`. Si alguno no tiene la forma, devolvemos fallo en vez de romper.
Esto es lo que reemplaza al `as`:

- `as Tarea[]` le dice al compilador "confiá en mí" aunque el dato sea basura.
- `esTarea` **verifica de verdad** y además le enseña el tipo al compilador.

```ts
    return { ok: true, valor: elementos };
  } catch (error) {
```
Si todos los elementos son `Tarea`, ahora sí `elementos` es `Tarea[]` y se
devuelve la variante de éxito.

```ts
    return { ok: false, error: error instanceof Error ? error.message : 'error de red' };
  }
```
El `catch` recibe `unknown` (por `strict`). `instanceof Error` lo estrecha para
leer `.message`; si no es un `Error`, se usa un texto genérico. Un error de red
termina siendo exactamente el mismo `{ ok: false, error }` que un HTTP 500:
**una sola forma de fallar** para quien consume.

## La función principal que la consume con `await`

```ts
async function iniciar(): Promise<void> {
```
Función principal `async`. Como no devuelve datos, el retorno es
`Promise<void>` (el `void` también se anota).

```ts
  const r = await obtenerTareas(API_URL);
```
`await` desenvuelve la promesa: `r` es `Resultado<Tarea[]>`, no una promesa.

```ts
  if (r.ok) {
    tareas = r.valor;
    guardar();
  } else {
    console.error('No se pudo cargar desde la API:', r.error);
  }
```
Los dos casos, explícitos. Dentro del `if (r.ok)` el compilador sabe que
existe `r.valor`; en el `else` sabe que existe `r.error`. Fuera del `if` no
se puede tocar ninguno de los dos. Si la API no está, el error se informa y
la app sigue funcionando con las tareas guardadas en `localStorage`.

```ts
  renderizar();
}
```
Se dibuja la lista recién cuando terminó la carga (éxito o fallo), así no se
pinta dos veces.

```ts
  iniciar();
```
Al final del arranque se lanza la función principal. No se hace `await` en el
top-level porque ya no hay nada más que esperar: la propia app reacciona
cuando la promesa se resuelve.

## Verificación

- `npm run check` -> sin errores.
- Sin `any` y sin operador de aserción no nula (`!`) en `src/app.ts`.
- `npm run build` y `npm run start` siguen funcionando (el `index.ts` de Node
  no importa `app.ts`, que es código de navegador).

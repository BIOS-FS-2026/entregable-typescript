# Bitácora: migrar el proyecto del módulo 3 a TypeScript strict

## Origen

- Proyecto del módulo 3: `lista-tareas` (`index.html`, `styles.css`, `app.js`).
- El archivo se copió a `src/app.ts` tal cual, sin arreglar nada.
- Aclaración: ese `app.js` pinta el DOM y persiste con `localStorage`
  (no usa `fetch`). Es el único archivo del módulo 3 que manipula el DOM.

## Paso 2 — lista completa de errores de `npm run check`

Salida cruda, sin editar (18 errores):

```
src/app.ts(28,23): error TS7006: Parameter 'texto' implicitly has an 'any' type.
src/app.ts(37,22): error TS7006: Parameter 'id' implicitly has an 'any' type.
src/app.ts(43,24): error TS7006: Parameter 'id' implicitly has an 'any' type.
src/app.ts(49,3): error TS18047: 'lista' is possibly 'null'.
src/app.ts(72,5): error TS18047: 'lista' is possibly 'null'.
src/app.ts(76,1): error TS18047: 'form' is possibly 'null'.
src/app.ts(78,17): error TS18047: 'input' is possibly 'null'.
src/app.ts(78,23): error TS2339: Property 'value' does not exist on type 'HTMLElement'.
src/app.ts(84,3): error TS18047: 'input' is possibly 'null'.
src/app.ts(84,9): error TS2339: Property 'value' does not exist on type 'HTMLElement'.
src/app.ts(85,3): error TS18047: 'input' is possibly 'null'.
src/app.ts(88,1): error TS18047: 'lista' is possibly 'null'.
src/app.ts(89,14): error TS18047: 'e.target' is possibly 'null'.
src/app.ts(89,23): error TS2339: Property 'closest' does not exist on type 'EventTarget'.
src/app.ts(93,7): error TS18047: 'e.target' is possibly 'null'.
src/app.ts(93,16): error TS2339: Property 'classList' does not exist on type 'EventTarget'.
src/app.ts(96,14): error TS18047: 'e.target' is possibly 'null'.
src/app.ts(96,23): error TS2339: Property 'matches' does not exist on type 'EventTarget'.
```

### Cómo leer esa lista (era la lista de tareas del refactor)

- **TS7006** `'texto'`, `'id'` implicitly any -> anotar los parámetros:
  `texto: string` e `id: string`.
- **TS18047** `'lista' | 'input' | 'form' | 'e.target' is possibly 'null'` ->
  cada acceso al DOM viene de `Element | null`; hay que chequear contra `null`
  antes de usarlo.
- **TS2339** `Property 'value' does not exist on type 'HTMLElement'` ->
  `getElementById` devuelve `HTMLElement` genérico; el input necesita
  `HTMLInputElement`.
- **TS2339** `'closest' | 'classList' | 'matches' does not exist on type 'EventTarget'`
  -> `e.target` es `EventTarget`; hay que angostarlo a `HTMLElement`.

## Decisiones de la migración

1. Se usa `document.querySelector<...>(...)` con el genérico para obtener
   `HTMLFormElement | null`, `HTMLInputElement | null` y
   `HTMLUListElement | null` (en vez de `getElementById` + cast).
2. **Ningún** operador de aserción no nula (`!`) y **ningún** `any`.
3. Cada acceso al DOM está protegido:
   - `form`, `input` y `lista` se chequean explícitamente con `=== null`
     antes de registrar los listeners.
   - `renderizar()` sale temprano con `if (lista === null) return;`.
   - En `manejarSubmit` se chequea `input === null`.
   - En `manejarClick`, `e.target` se angosta con
     `if (!(objetivo instanceof HTMLElement)) return;` y `li`/`id` también
     se chequean contra `null`/`undefined`.
4. `JSON.parse` devuelve `any`; se guarda en una variable tipada `unknown`
   y se valida con el type guard `esTarea`, así no aparece ningún `any`.

## tsconfig.json — por qué se agregó `lib` con `DOM`

`@types/node` no conoce `document`, `HTMLElement`, `localStorage`, etc.
TypeScript ya incluye `DOM` por defecto con `target: ES2022`, pero se dejó
explícito: si `lib` no incluyera `DOM`, el compilador no conocería la API del
navegador que usa `src/app.ts` (código del módulo 3). Queda comentado en la
línea correspondiente.

## Paso 6 — refactor con el compilador como red de seguridad

Se renombró el campo `texto` -> `titulo` en la interface `Tarea`
(`src/types/tarea.ts`). El compilador listó los sitios afectados:

```
src/app.ts(45,5): error TS2353: Object literal may only specify known properties, and 'texto' does not exist in type 'Tarea'.
src/app.ts(78,30): error TS2339: Property 'texto' does not exist on type 'Tarea'.
```

Sitios corregidos: el objeto que arma `agregarTarea` y la lectura
`tarea.texto` en `renderizar`.

**Caveat importante:** el type guard `esTarea` accede con `'titulo' in valor`
y `typeof valor.titulo`, claves dinámicas que el compilador **no** puede
relacionar con la interface. Por eso se actualizó a mano. Lección: la red de
seguridad del compilador cubre el código tipado, pero los formatos
persistidos (y las claves string) hay que cuidarlos aparte. En un caso real,
renombrar un campo persistido en `localStorage` requiere una migración de
datos, porque los registros viejos quedan con la clave `texto`.

## Verificación final

- `npm run check` -> sin errores (`exit=0`).
- `npm run build` -> genera `dist/` (`exit=0`).
- `npm run start` -> imprime la salida de las utilidades (`exit=0`).
- `rg -n "\bany\b" src` -> sin coincidencias.
- Sin operador `!` de aserción no nula en `src/app.ts` (solo `!==`, `!`,
  `!(...)` como negación lógica).
- La interface `Tarea` la usan más de dos funciones: `esTarea`, `cargar`,
  `guardar`, `agregarTarea`, `toggleTarea`, `eliminarTarea` y `renderizar`.
- No queda ninguna referencia al campo viejo `texto` del modelo; la única
  aparición de la cadena es la clase CSS `texto-tarea` (UI, no modelo).

---

## Entradas acumuladas — s14.1 y s14.2

### s14.1 · utilidades tipadas y `Resultado<T>`

#### Entrada s14.1-1 · `TS7006` — parámetro sin anotar

- **Código:** `Parameter 'texto' implicitly has an 'any' type.`
- **Qué hacías mal:** escribí `aEntero(texto)` sin anotar el argumento; en JS
  no hace falta, en strict `TS` no infiere entradas.
- **Cómo lo arreglaste:** `function aEntero(texto: string): Resultado<number>`
  y retorno `{ ok: true, valor } | { ok: false, error }`, nunca `throw` ni
  `null` para el caso esperado.

#### Entrada s14.1-2 · `TS2339` — tocar `valor` fuera del `if (r.ok)`

- **Código:**
  ```
  src/index.ts(29,26): error TS2339: Property 'valor' does not exist on type 'Resultado<number>'.
  ```
- **Qué hacías mal:** "compacté" el consumidor leyendo `r.valor` directo y
  dejando el `else` vacío; fuera del `if` el compilador no sabe que la
  variante es la de éxito.
- **Cómo lo arreglaste:** el acceso va **dentro** de `if (r.ok) { r.valor }`
  y el error en `else { r.error }`. El `if` sobre el discriminante `ok` es lo
  que estrecha la unión.

### s14.2 · discriminated union de estado, `never` y DOM

#### Entrada s14.2-1 · `TS2339` — leer `e.datos` fuera de su `case`

- **Código:**
  ```
  src/utils/describirEstado.ts(4,19): error TS2339: Property 'datos' does not exist on type 'EstadoLista'.
  ```
- **Qué hacías mal:** tempé la lectura de `e.datos` antes del `switch`. El
  tipo solo existe en la variante `{ estado: 'exito'; datos }`.
- **Cómo lo arreglaste:** `e.datos` se lee dentro de `case 'exito'`, donde el
  compilador angostó `e`.

#### Entrada s14.2-2 · `TS2322` — el `default` deja de ser `never`

- **Código:**
  ```
  src/utils/describirEstado.ts(10,13): error TS2322: Type '{ estado: "error"; mensaje: string; }' is not assignable to type 'never'.
  ```
- **Qué hacías mal:** quité el `case 'error'`; el `default` absorbió esa
  variante y `const imposible: never = e;` pasó a recibir un tipo real.
- **Cómo lo arreglaste:** volví a cubrir las tres variantes; con el switch
  exhaustivo el `default` vuelve a ser `never`.

#### Entrada s14.2-3 · `TS18047` + `TS2339` — migración del módulo 3 al DOM

- **Código:**
  ```
  src/app.ts(76,1): error TS18047: 'form' is possibly 'null'.
  src/app.ts(78,23): error TS2339: Property 'value' does not exist on type 'HTMLElement'.
  ```
- **Qué hacías mal:** usaba los elementos del DOM sin chequear `null` y
  asumía `value` sobre un `HTMLElement` genérico.
- **Cómo lo arreglaste:** `querySelector<HTMLInputElement>(...)`, chequeos
  `=== null` antes de usar y `instanceof HTMLElement` para `e.target`, sin
  el operador `!`.

---

## Entradas nuevas — 18/09/2026

### Entrada 1 · `TS7006` — parámetros implícitamente `any`

- **Código de error:** `Parameter 'texto' implicitly has an 'any' type.` (también
  `'id'`) en `src/app.ts`.
- **Qué hacías mal:** al copiar `app.js` del módulo 3 a `.ts` no anoté los
  argumentos; en JavaScript no hace falta, pero en strict el compilador no
  infiere los tipos de entrada.
- **Cómo lo arreglaste:** firma la llamada a la red como
  `Promise<Resultado<Tarea[]>>` y anotá los parámetros: `texto: string`,
  `id: string`. Nunca `any` explícito ni implícito.

### Entrada 2 · `TS18047` + `TS2339` — el DOM es `Element | null`

- **Código de error:**
  ```
  src/app.ts(76,1): error TS18047: 'form' is possibly 'null'.
  src/app.ts(78,23): error TS2339: Property 'value' does not exist on type 'HTMLElement'.
  src/app.ts(89,23): error TS2339: Property 'closest' does not exist on type 'EventTarget'.
  ```
- **Qué hacías mal:** usaba `getElementById` (devuelve `HTMLElement | null`)
  y lo usaba directo; además `value` no existe en `HTMLElement` genérico y
  `e.target` es `EventTarget`, no un elemento.
- **Cómo lo arreglaste:** `document.querySelector<HTMLInputElement>('#...')`
  para tipar cada elemento, chequeos explícitos contra `null` antes de usar y
  `objetivo instanceof HTMLElement` para angostar `e.target`. Nunca el
  operador de aserción no nula (`!`).

### Entrada 3 · `TS2353` + `TS2339` — renombrar un campo con red de seguridad

- **Código de error:**
  ```
  src/app.ts(45,5): error TS2353: Object literal may only specify known properties, and 'texto' does not exist in type 'Tarea'.
  src/app.ts(78,30): error TS2339: Property 'texto' does not exist on type 'Tarea'.
  ```
- **Qué hacías mal:** renombré `texto` -> `titulo` solo en la interfaz
  `Tarea` y el resto del archivo seguía creyendo en `texto`.
- **Cómo lo arreglaste:** `npm run check` listó los dos lugares (el objeto de
  `agregarTarea` y la lectura en `renderizar`); los corregí y volvió a verde.
  Es exactamente la red de seguridad que no existe en JavaScript.

### Entrada 4 · `TS2339` — borrar `await` a la llamada de red

- **Código de error:**
  ```
  src/app.ts(146,9): error TS2339: Property 'ok' does not exist on type 'Promise<Resultado<Tarea[]>>'.
  src/app.ts(147,16): error TS2339: Property 'valor' does not exist on type 'Promise<Resultado<Tarea[]>>'.
  src/app.ts(150,56): error TS2339: Property 'error' does not exist on type 'Promise<Resultado<Tarea[]>>'.
  ```
- **Qué hacías mal:** pensaba que `obtenerTareas(...)` devolvía el
  `Resultado` directo; sin `await` me queda la `Promise`, y `Promise` no
  tiene `ok`/`valor`/`error`.
- **Cómo lo arreglaste:** `const r = await obtenerTareas(API_URL);`
  restaura y `r` vuelve a ser `Resultado<Tarea[]>`. Es la regla: función
  `async` -> `Promise<...>`, y `await` desenvuelve.

### Entrada 5 · `TS2322` — prueba de fuego del `never` (sección 5)

Quité el `case 'error'` de `describirEstado` para comprobar que el `default`
deja de ser inalcanzable:

```
src/utils/describirEstado.ts(10,13): error TS2322: Type '{ estado: "error"; mensaje: string; }' is not assignable to type 'never'.
```

- **Qué hacías mal:** sin el `case`, en el `default` `e` ya no es `never`:
  queda la variante `{ estado: 'error'; mensaje: string }` sin cubrir, y
  `const imposible: never = e;` exige un tipo imposible.
- **Cómo lo arreglaste:** restauré el `case 'error'`; al cubrir las tres
  variantes el `default` vuelve a ser `never` y el proyecto queda en verde.

### Entrada 6 · `TS2322` — cuarta variante `'vacio'` sin `case` (prueba del `never`)

Agregué la variante `{ estado: 'vacio' }` a `EstadoLista` **sin tocar** el
`switch`. Salida exacta de `npm run check`:

```
src/utils/describirEstado.ts(12,13): error TS2322: Type '{ estado: "vacio"; }' is not assignable to type 'never'.
```

- **Qué hacías mal:** nada del archivo: el tipo `EstadoLista` pasó a tener una
  variante más que el `switch` no cubre.
- **Cómo lo arreglaste:** borré la cuarta variante; al quedar las tres
  originales cubiertas, el `default` vuelve a ser `never` y `npm run check`
  pasa de nuevo (`exit=0`). La prueba demuestra que `const imposible: never =
  e;` fuerza al compilador a avisarte cada vez que alguien añade un estado
  nuevo sin manejarlo.

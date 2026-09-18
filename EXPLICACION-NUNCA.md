# Explicación: prueba de fuego del `never` línea por línea

Esta prueba demuestra que el patrón
`const imposible: never = e;` en el `default` de un `switch` funciona:
si alguien agrega una variante nueva (o se olvida un `case`), el compilador
rompe con `TS2322` y te avisa. Se agregó una cuarta variante y **no se tocó
el switch**, que es exactamente el punto.

## Por qué falla antes de mirar el código

`describirEstado` recibe `e: EstadoLista` y hace `switch (e.estado)`.
El `switch` maneja 3 variantes: `'cargando'`, `'exito'` y `'error'`.
Cuando agregás `{ estado: 'vacio' }`, el `switch` ya no cubre todos los
estados posibles: en el `default` queda entrando un `e` que todavía es
`{ estado: 'vacio' }`. Asignar eso a `never` es mentirle al compilador, y
ese es el error `TS2322`.

## Línea por línea

### `src/types/index.ts` (el tipo del estado)

```ts
export type EstadoLista =
  | { estado: 'cargando' }
  | { estado: 'exito'; datos: Task[] }
  | { estado: 'error'; mensaje: string }
  | { estado: 'vacio' };
```
La última línea nueva es la variante agregada en la prueba. Tiene el
discriminante literal `'vacio'`, que no existía. Como es un literal (no
`string` genérico), TypeScript sabe exactamente qué valores puede tomar
`e.estado`: `'cargando' | 'exito' | 'error' | 'vacio'`.

### `src/utils/describirEstado.ts` (el consumidor que NO se tocó)

```ts
export function describirEstado(e: EstadoLista): string {
```
`e` puede ser cualquiera de las 4 variantes.

```ts
  switch (e.estado) {
```
Se discrimina por el campo `estado`.

```ts
    case 'cargando':
      return 'Cargando...';
    case 'exito':
      return `${e.datos.length} tareas`;
    case 'error':
      return `Error: ${e.mensaje}`;
```
Tres `case`, uno por variante original. Al `'vacio'` no le corresponde
ninguno. Cada `case` agota a `e` dentro de su rama (por ejemplo, solo en
`case 'exito'` existe `e.datos`).

```ts
    default: {
      const imposible: never = e;
```
Esta es la línea que dispara el error. Acá llega todo lo que los `case`
no cubrieron. Antes de la prueba, eso no pasaba: las 3 variantes estaban
cubiertas y `e` era `never` (el conjunto vacío). Con la variante `'vacio'`,
el compilador sabe que acá puede haber un `{ estado: 'vacio' }`, así que
asignarlo a `never` ya no es válido y suelta el `TS2322`.

```ts
      return imposible;
    }
  }
}
```
Cada `case` retorna; también el `default`. No hay `return` después del
`switch` (si lo hubiera, el `default` sería inalcanzable para el flujo de
tipos y el `never` no se verificaría igual).

## La salida exacta del error (evidencia)

```
src/utils/describirEstado.ts(12,13): error TS2322: Type '{ estado: "vacio"; }' is not assignable to type 'never'.
```

- `TS2322` es "este tipo no se puede asignar a este otro".
- Apunta a la línea 12, columna 13: la `const imposible: never = e;`.
- El "type cannot be assigned to never" confirma que el `never` está bien
  puesto: cuando el `switch` deja de estar exhaustivo, falla el proyecto.

Después de capturarlo se borró la cuarta variante y `npm run check` volvió
a `exit=0`.

## Checklist de revisión si NO aparece el error

1. ¿Hay un `return` después del `switch`? Bórralo: hace inalcanzable el
   `default`.
2. ¿El discriminante es `string` en vez de un literal? Usa literales
   (`'cargando'`, `'exito'`, ...).
3. ¿Hay un `any` en el parámetro o en el tipo? Quítalo.
4. ¿Está `"strict": true` en `tsconfig.json`? Sin strict el chequeo de
   `never` no se verifica igual.
5. ¿Falta el `case` de alguna de las tres variantes originales? El `default`
   las estaría absorbiendo. Cúbrelas todas.
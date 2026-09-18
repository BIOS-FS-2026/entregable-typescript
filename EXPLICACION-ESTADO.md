# Explicación: estado con unión discriminada, `switch` y `never`

## 1. La unión discriminada `EstadoLista`

```ts
export type EstadoLista =
  | { estado: 'cargando' }
  | { estado: 'exito'; datos: Task[] }
  | { estado: 'error'; mensaje: string };
```

Tres variantes, un mismo campo discriminante literal `estado`. El compilador sabe
que si `e.estado === 'exito'`, entonces sí existe `e.datos`, y solo en ese caso.

## 2. El consumidor: `switch` sobre el discriminante

`describirEstado(e: EstadoLista): string` en `src/utils/describirEstado.ts`
hace `switch (e.estado)` con un `case` por variante:

- `case 'cargando'` -> `Cargando...`
- `case 'exito'` -> `e.datos.length` (aquí TS sí permite `datos`)
- `case 'error'` -> `e.mensaje`
- `default` -> asigna `const imposible: never = e` y lo retorna

Como los tres estados cubren **todos** los casos, el `default` es inalcanzable:
si el programa llegara ahí, `e` tendría un tipo imposible, y el tipo `never`
lo representa. Asignar `e` a `never` es la manera de decirle a TypeScript
"esto no debe pasar". El compilador además exige que el `default` retorne,
porque sin él la función no devolvería `string` en todos los caminos.

Cada `case` hace `return`, así que no hay `break` ni `return` después del switch.

## 3. Prueba: el compilador te frena

**Dentro del case** (`exito`), `e.datos` se lee sin problema, porque ahí
`e` está reducido a `{ estado: 'exito'; datos: Task[] }`.

**Fuera de su case**, agregué temporalmente `const fuera = e.datos;` antes
del `switch` y corrí `npm run check`:

```
src/utils/describirEstado.ts(4,19): error TS2339: Property 'datos' does not exist on type 'EstadoLista'.
  Property 'datos' does not exist on type '{ estado: "cargando"; }'.
```

Error: la variante `'cargando'` no tiene `datos`, así que acceder a él siempre
es un bug que TypeScript detecta en tiempo de compilación. Quité la línea y
`npm run check` volvió a pasar (`exit=0`).

Lo mismo se probó antes con `Resultado<T>`: quitar `if (r.ok)` y leer
`r.valor` directo falla con `TS2339: Property 'valor' does not exist on type
'Resultado<number>'`. Por eso el acceso al valor va dentro del `if (r.ok)`
y el error en el `else`.

## 4. Regla que este diseño respeta

Nunca `throw` para el caso esperado y nunca `null` como respuesta de error:
la falla es un valor dentro de la unión (por ejemplo
`{ estado: 'error', mensaje: ... }`). El tipo garantiza, en compilación,
que el consumidor no pueda tocar el dato que no corresponde al estado actual.
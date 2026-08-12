# Lúmina

Espacio personal local-first para documentar, dibujar, organizar ideas y ejecutar diagramas de flujo visualmente.

## Desarrollo

```bash
npm install
npm run dev
```

## Arquitectura

- `src/components`: interfaz, navegación, comandos, ajustes y exportación.
- `src/editor`: editor enriquecido e inserción de imágenes.
- `src/drawing`: lienzo de dibujo persistente.
- `src/flowchart`: editor y simulador visual de diagramas.
- `src/database`: estado inicial y persistencia IndexedDB.
- `src/hooks`: coordinación del workspace y autosave.
- `src/utils`: exportadores y copias de seguridad.
- `src/types`: modelo de datos tipado.

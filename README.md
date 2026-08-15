# Lúmina

Agenda personal local-first con estética de diario clásico para escribir, organizar recuerdos y trabajar con recursos visuales.

## Funciones principales

- Editor enriquecido con cursor estable, guardado automático, historial y pestañas.
- Calendario mensual que reúne las entradas del diario por fecha.
- Preferencias de apariencia, tipografía, lectura, accesibilidad y copias de seguridad.
- Búsqueda y paleta de comandos con navegación por teclado.
- Lienzo con lápiz, borrador, líneas y figuras; diagramas de flujo visuales con una plantilla de simulación por edad.
- Papelera con restauración y borrado definitivo.
- Exportación a PDF, DOCX, Markdown, HTML, TXT, JSON, PNG, JPG, SVG, CSV y XLSX.

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

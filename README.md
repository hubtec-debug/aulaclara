# Aula Clara — paquete de publicación estática

Este paquete contiene la interfaz web actual para publicarla como demo estática en GitHub Pages.

## Archivos

- `index.html`: página de entrada.
- `styles.css`: estilos de la interfaz.
- `app.js`, `registration.js`, `activities.js`, `management.js`, `screenings.js`: comportamiento de las pantallas.
- `logo-aula-clara.svg`: identidad visual.

Mantené todos estos archivos juntos en la raíz del repositorio para que las rutas relativas funcionen.

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub.
2. Subí el contenido de esta carpeta a la raíz del repositorio (no la carpeta contenedora como subcarpeta).
3. En el repositorio, abrí **Settings → Pages**.
4. En **Build and deployment**, elegí **Deploy from a branch**, seleccioná la rama principal y la carpeta `/ (root)`, y guardá.
5. GitHub va a mostrar la dirección pública cuando termine de publicar.

## Alcance actual

Esta versión es una demo de interfaz estática. El acceso acepta credenciales de prueba; no hay autenticación real, base de datos compartida ni sincronización entre dispositivos. Los cambios se guardan localmente en el navegador. La IA, el análisis de audio e imágenes, los percentiles/baremos y los informes automáticos todavía no están conectados.

No cargues datos reales de alumnos ni uses esta publicación para gestionar información escolar. Para comercializarla o usarla en un colegio hay que integrar un backend seguro, autenticación y permisos reales, almacenamiento protegido, consentimiento y las funciones de análisis pendientes.

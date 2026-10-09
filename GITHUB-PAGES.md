# Aula Clara · piloto web conectado

Esta carpeta puede publicarse en GitHub Pages como una interfaz estática conectada a Supabase. GitHub Pages no aloja el servidor ni convierte por sí solo el proyecto en un producto listo para colegios.

## Archivos que deben quedar juntos en la raíz del sitio

- `index.html`
- `styles.css`
- `app.js`
- `registration.js`
- `activities.js`
- `management.js`
- `screenings.js`
- `cloud-client.js`
- `supabase-config.js`
- `logo-aula-clara.svg`

El paquete `aula-clara-github-pages.zip` contiene esos archivos en la raíz. No subas la carpeta `online-pilot` al sitio público; contiene los archivos SQL de desarrollo.

## Publicar

1. Creá un repositorio en GitHub.
2. Subí los archivos del ZIP a la raíz del repositorio (no subas el ZIP como único archivo).
3. En **Settings → Pages**, elegí **Deploy from a branch**, la rama principal y **/(root)**.
4. Abrí la dirección HTTPS que GitHub Pages muestre.
5. En Supabase, agregá esa dirección a **Authentication → URL Configuration → Redirect URLs** y configurala como **Site URL**. Esto permite que los enlaces de confirmación regresen a la página publicada.

## Prueba segura

Creá una cuenta con un correo al que puedas acceder, confirmá el correo si Supabase lo solicita e iniciá sesión. Usá solo nombres y datos ficticios durante el piloto.

No publiques una clave `secret` o `service_role`; el cliente usa una clave publicable y las tablas tienen RLS. Antes de usar datos identificables de estudiantes hacen falta cuentas individuales, revisión de permisos, consentimiento, resguardo de archivos y revisión de privacidad.

## Funciones conectadas y límites

- Funciona el acceso por correo y contraseña y la conexión de cursos, estudiantes, screenings de lectura, tareas y entregas.
- La vista de estudiante es una simulación bajo la sesión docente; aún no existen cuentas individuales para alumnos.
- Las invitaciones reales de docentes, análisis IA de audio/imágenes, percentiles/baremos y PDF siguen pendientes.
- El borrado de registros está pausado en el modo conectado para evitar eliminar información institucional por error.

# Centro de Control Académico — versión sincronizada

Esta es la app web que hace posible todo lo demás: se despliega una sola vez
en internet (con Vercel, igual que KAIZEN) y desde ahí:

- La abres en el navegador de tu **tablet** y la instalas como app.
- La abres desde el **envoltorio de escritorio** (`CentroControlAcademico.exe`,
  en el otro zip que te di) para tenerla como programa en tu PC.
- Como ambas apuntan al mismo lugar y usas el mismo login, **todo se
  sincroniza solo** entre los dos dispositivos.
- Además, desde Configuración ⚙️ dentro de la app puedes copiar un enlace
  para **suscribir tus evaluaciones en Outlook** como calendario.

## 1. Base de datos (Supabase)

Usa el mismo proyecto de Supabase que ya tienes para KAIZEN.

1. Entra a tu proyecto en [supabase.com](https://supabase.com) → **SQL
   Editor** → **New query**.
2. Pega todo el contenido de `supabase/schema.sql` (está en esta carpeta) y
   ejecútalo. Es seguro volver a correrlo si ya tenías una versión anterior.
3. Ve a **Authentication → Settings** y confirma que el login por correo
   esté habilitado (viene así por defecto). Si quieres evitar el paso de
   confirmar el correo, desactiva "Confirm email" ahí mismo.
4. Ve a **Project Settings → API** y copia estos 3 valores:
   - **Project URL**
   - **anon public key**
   - **service_role key** (la secreta — la necesitas para el calendario de
     Outlook, nunca se expone al navegador)

## 2. Configurar y publicar (Vercel)

1. Renombra `.env.local.example` a `.env.local` y completa los 3 valores de
   arriba.
2. Sube esta carpeta a un repositorio de GitHub.
3. En [vercel.com](https://vercel.com) → **Add New Project** → importa el
   repo.
4. En **Environment Variables**, agrega las mismas 3 variables de tu
   `.env.local`.
5. Deploy. Te va a quedar una URL tipo
   `https://centro-control-academico.vercel.app` — esa es la que usas en la
   tablet y en el `.exe` de escritorio.

## 3. Usarla en cada dispositivo

- **Computador:** abre el zip `CentroControlAcademico-sync-PC`, corre el
  `.exe` de adentro, pega tu URL de Vercel la primera vez.
- **Tablet:** abre esa misma URL en Chrome/Safari → "Instalar app" /
  "Agregar a pantalla de inicio".
- En ambos, inicia sesión con el mismo correo y contraseña — ahí se
  sincroniza todo.

## 4. Conectar Outlook

Dentro de la app → ⚙️ Configuración → sección "Conectar con Outlook" →
copiar el enlace. En Outlook: **Agregar calendario → Suscribirse desde
internet** → pega el enlace. Tus evaluaciones van a aparecer solas como
eventos, y se actualizan cada media hora.

## Estructura

```
app/
  page.js                    → página principal
  layout.js                   → layout raíz + metadatos PWA
  api/calendar/[token]/       → genera el feed .ics para Outlook
components/
  CentroControl.jsx           → toda la interfaz y lógica
lib/
  supabaseClient.js           → cliente del navegador (login, lecturas)
  supabaseAdmin.js            → cliente del servidor (solo para el feed de Outlook)
supabase/
  schema.sql                  → tablas y seguridad — pégalo en el SQL Editor
```

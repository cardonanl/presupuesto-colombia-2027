# Guía de despliegue: Vercel + subdominio propio

Objetivo final: `https://presupuesto2027.nicolascardona.com` sirviendo este sitio.

Este proyecto es 100% estático (HTML/CSS/JS, sin build), así que Vercel lo
despliega sin configuración adicional.

Herramientas ya instaladas en esta máquina: **Git** ✅. **Node.js / npm** ❌
(no instalado). Por eso la ruta recomendada es GitHub + panel web de Vercel,
que no necesita Node ni la terminal para nada después del primer push.

## Paso 1 — Subir el proyecto a GitHub

### Opción A (recomendada): GitHub Desktop, sin usar la terminal
1. Instala [GitHub Desktop](https://desktop.github.com/) e inicia sesión con
   tu cuenta de GitHub (créala gratis en github.com si no tienes).
2. `File → Add local repository...` y selecciona esta carpeta:
   `C:\Users\NicolasCardona\Documents\nicolas\prespuestocolombia2027`
3. Te va a decir que no es un repositorio git todavía → click en
   **"create a repository"**.
4. Escribe un mensaje de commit (ej. "Primera versión") y click
   **"Commit to main"**.
5. Click **"Publish repository"** arriba. Puedes dejarlo público o privado
   (ambos funcionan igual con Vercel). Nombre sugerido: `presupuesto-2027`.

### Opción B: por terminal (si prefieres, o si quieres que yo lo prepare)
Dímelo y te dejo el repo listo con `git init` + primer commit localmente;
solo te faltaría crear el repositorio vacío en github.com y darme la URL
para hacer `git remote add` + `git push`. El push probablemente te pida
iniciar sesión en una ventana del navegador la primera vez (normal).

## Paso 2 — Importar el proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com/) → **Sign Up** (puedes entrar
   directo con tu cuenta de GitHub, es un solo clic).
2. En el dashboard: **Add New... → Project**.
3. Busca y selecciona el repositorio que acabas de crear (`presupuesto-2027`).
4. Vercel va a detectar que es un sitio estático ("Other" framework preset).
   No cambies nada — no hay build command ni output directory que configurar.
5. Click **Deploy**. En menos de un minuto te da una URL tipo
   `https://presupuesto-2027-xxxx.vercel.app` — ábrela y confirma que todo
   se ve bien (landing, tabla, detalle de una dependencia, metodología).

Desde ahora, cada vez que hagas un nuevo commit/push a GitHub (por ejemplo si
me pides actualizar los datos con una nueva versión del proyecto de ley),
Vercel vuelve a desplegar automáticamente. No tienes que repetir estos pasos.

## Paso 3 — Conectar el subdominio `presupuesto2027.nicolascardona.com`

1. En el proyecto dentro de Vercel: **Settings → Domains**.
2. Escribe `presupuesto2027.nicolascardona.com` y click **Add**.
3. Vercel te va a mostrar un registro DNS para crear, normalmente:

   ```
   Tipo:   CNAME
   Nombre: presupuesto2027
   Valor:  cname.vercel-dns.com
   ```

   (Si por algún motivo Vercel pide un registro tipo `A` en vez de `CNAME`,
   usa exactamente el valor que te muestre en pantalla — puede variar.)

4. Ve al panel DNS de donde tengas administrado el dominio
   `nicolascardona.com` (el sitio donde lo compraste/gestionas: puede ser
   GoDaddy, Namecheap, Cloudflare, Google Domains, etc. — dime cuál usas si
   quieres que te dé los clics exactos para ese proveedor).
5. Agrega un registro **CNAME** nuevo:
   - **Host / Nombre:** `presupuesto2027`
   - **Valor / Apunta a:** `cname.vercel-dns.com`
   - **TTL:** el que venga por defecto está bien.
6. Guarda. La propagación DNS suele tardar entre 5 minutos y un par de
   horas. Vercel marca el dominio como "Valid" automáticamente en cuanto lo
   detecta (no hace falta que hagas nada más ahí) y emite el certificado
   HTTPS solo.

## Verificación final

Abre `https://presupuesto2027.nicolascardona.com` en el navegador y revisa:
- [ ] La página de inicio carga los stat tiles y el gráfico
- [ ] Click en una fila de la tabla lleva al detalle de esa dependencia
- [ ] `https://presupuesto2027.nicolascardona.com/metodologia.html` carga

## Actualizaciones futuras

Para publicar cambios (nuevos datos, ajustes visuales, etc.):
1. Pide los cambios en una conversación con Claude Code sobre esta carpeta.
2. Haz commit y push (GitHub Desktop: "Commit" + "Push origin"), o pídeme
   que lo haga si ya tenemos el remoto configurado.
3. Vercel redespliega solo. No hay que tocar nada en el panel de Vercel ni
   en el DNS otra vez.

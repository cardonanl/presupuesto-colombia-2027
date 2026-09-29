# Guía de despliegue: Vercel + subdominio propio

Objetivo final: `https://presupuesto2027.nicolascardona.com` sirviendo este sitio.

Este proyecto es 100% estático (HTML/CSS/JS, sin build), así que Vercel lo
despliega sin configuración adicional.

Herramientas ya instaladas en esta máquina: **Git** ✅. **Node.js / npm** ❌
(no instalado). Por eso la ruta recomendada es GitHub + panel web de Vercel,
que no necesita Node ni la terminal para nada después del primer push.

## Paso 1 — Subir el proyecto a GitHub

Se decidió subirlo **manualmente por arrastrar-y-soltar** en la web de
GitHub (sin git ni GitHub Desktop), porque este equipo tiene credenciales de
Git guardadas que no son la cuenta personal (`cardonanl`) — una es de otra
cuenta (`cardonanl96`) y otra es la cuenta de trabajo de Beast Industries.
Para no arriesgar mezclar cuentas:

1. En [github.com](https://github.com) (con la cuenta `cardonanl`), **New
   repository** → nombre sugerido `presupuesto-2027` → vacío, sin README.
2. En la página del repo recién creado, click en el enlace **"uploading an
   existing file"**.
3. En el Explorador de Windows, abre
   `C:\Users\NicolasCardona\Documents\nicolas\prespuestocolombia2027`,
   selecciona todo el contenido (Ctrl+A) — incluye `assets/`, `data/`,
   `scripts/`, `docs/` y todos los `.html`/`.md` — y arrástralo a la zona de
   GitHub.
4. **Commit changes**.

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

4. El dominio está en **Namecheap**, así que:
   - Entra a [namecheap.com](https://namecheap.com) → **Domain List** →
     click **Manage** junto a `nicolascardona.com`.
   - Pestaña **Advanced DNS**.
   - En **Host Records**, click **Add New Record**.
   - Tipo: **CNAME Record**
   - Host: `presupuesto2027`
   - Value: `cname.vercel-dns.com` (sin `https://`, y si Namecheap te pide
     un punto final `.` al final del valor, agrégalo: `cname.vercel-dns.com.`)
   - TTL: `Automatic`
   - Click en el ✓ verde para guardar la fila.
5. Vuelve a Vercel (Settings → Domains) — en unos minutos debería marcar el
   dominio como **Valid** solo (no hay que hacer nada más ahí). La
   propagación DNS real puede tardar de 5 minutos a un par de horas; Vercel
   emite el certificado HTTPS automáticamente en cuanto detecta el DNS.

   ⚠️ Si `nicolascardona.com` usa nameservers de otro proveedor (por
   ejemplo Cloudflare) en vez de los de Namecheap, hay que agregar el mismo
   registro CNAME allá en su lugar — se puede confirmar mirando si en
   Namecheap, en la pestaña **Domain**, dice "Namecheap BasicDNS" (ahí sí
   aplica lo de arriba) o algo distinto.

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

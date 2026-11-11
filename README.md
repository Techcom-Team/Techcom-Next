# ServiTx – Tienda virtual de productos y servicios de Telecomunicaciones (Next.js + Odoo 17)

Tienda online headless: el frontend está hecho con **Next.js** y todos los datos
(productos, servicios, categorías, pedidos y usuarios) vienen de **Odoo 17**
mediante su API (JSON-RPC con API Key).

---

## 📋 Requisitos

- **Node.js 18 o superior** → https://nodejs.org (descarga LTS)
- **Git** → https://git-scm.com
- **Odoo 17** corriendo (en tu PC o en un servidor) con la base de datos de la tienda

---

## 🚀 Instalación en tu PC o servidor

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   cd TU_REPOSITORIO
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Crea el archivo `.env.local`** en la raíz del proyecto con estos datos:
   ```env
   ODOO_URL=http://localhost:8069
   ODOO_DB=servitx
   ODOO_USER=tu_usuario@correo.com
   ODOO_API_KEY=pega_aqui_tu_api_key
   ```
   > ⚠️ Este archivo **NO está en GitHub** por seguridad. Cada persona crea el suyo.
   > Si Odoo está en otra PC, cambia `localhost` por la IP, ej: `http://192.168.1.50:8069`

4. **Ejecuta en modo desarrollo:**
   ```bash
   npm run dev
   ```
   Abre el navegador en **http://localhost:3000** ✅

---

## 🔑 Cómo generar la API Key en Odoo

1. Entra a Odoo → clic en tu **avatar** (arriba a la derecha) → **Mi perfil**
2. Pestaña **Seguridad de la cuenta** → sección **Claves API** → **Nueva clave API**
3. Escribe una descripción (ej: "Web Next.js") y confirma tu contraseña
4. **Copia la clave** (solo se muestra una vez) y pégala en `ODOO_API_KEY`

---

## 🏭 Modo producción (servidor)

```bash
npm run build
npm start
```
La web quedará corriendo en http://localhost:3000 lista para usarse detrás de un proxy (Nginx) o en un VPS.

---

## ☁️ Deploy automático (Vercel)

1. Sube el código a GitHub (`git push`)
2. En Vercel: **Add New Project** → importa el repo
3. En **Environment Variables** agrega: `ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_API_KEY`
   (el `ODOO_URL` debe ser una dirección pública de tu Odoo, ej: con ngrok o dominio propio)
4. Cada `git push` hará deploy automático 🚀

---

## 📁 Estructura del proyecto

```
app/            → Páginas (home, tienda, servicios, contacto, login, checkout...)
app/api/        → Rutas API que hablan con Odoo (productos, auth, pedidos...)
components/     → Header, Footer, carrito lateral, carruseles...
lib/            → Lógica: odoo.ts (conexión), cart.ts (carrito), auth.ts (sesión)
public/         → Logo, banners e imágenes
.env.local      → Credenciales de Odoo (NO subir a GitHub)
```

---

## 🛠️ Solución de problemas

| Problema | Solución |
|---|---|
| `Access Denied` al cargar productos | Revisa que `ODOO_USER` sea el dueño de la API Key y que `ODOO_DB` sea el nombre exacto de la base |
| `NetworkError` en el navegador | Odoo no está corriendo o el puerto 8069 está bloqueado |
| Imágenes no cargan | Verifica que `ODOO_URL` sea accesible desde el navegador |

---

🏢 Cómo cambiar la dirección y los datos de contacto de la web
El footer lee los datos de contacto directamente desde Odoo, no del código:
- El teléfono y el email vienen del usuario configurado en `ODOO_USER` (su ficha de contacto) En el archivo que creaste .env.local
- La dirección viene de la dirección de la compañía registrada en Odoo.

Para cambiar la dirección que se muestra en la web:
1. Entra a Odoo → Ajustes → Usuarios y compañías → Compañías.
2. Abre la compañía (ServiTx) y edita su dirección (calle, ciudad, provincia, país).
3. Guarda los cambios y recarga la web: el footer mostrará la nueva dirección automáticamente.
⚠️ La dirección NO se edita en el código: se cambia siempre en la compañía de Odoo.

## Despliegue en Render

- Servicio: shopservitx (https://shopservitx.onrender.com), (https://shop.servitx.cu)
- Repositorio: https://github.com/Techcom-Team/Techcom-Next
- Auto-Deploy: activado (On commit). Cada git push a la rama configurada despliega automaticamente.
- Build Command: npm ci && npm run build
- Start Command: npm run start
- Variables de entorno (solo en Render, nunca en el repo): ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY

**© 2026 ServiTx · Telecomunicaciones · Informática · Electrónica**

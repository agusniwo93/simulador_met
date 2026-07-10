# Learning English — Simulador

Simulador del **Michigan English Test (MET)** con examen multi-sección: **Writing, Listening, Grammar y Reading**, con temporizador, corrección automática y resultados por sección. Incluye panel de administración con analíticas, idiomas **Español / Inglés** y diseño con fondo 3D animado.

**Secciones:**
- **Writing** — tareas de texto libre corregidas con **LanguageTool** (gramática, ortografía, estilo, extensión) + consejos de mejora.
- **Listening** — el audio se reproduce con la **síntesis de voz del navegador** (TTS) a partir de la transcripción; preguntas de opción múltiple.
- **Grammar / Reading** — opción múltiple auto-corregida (Reading incluye los textos de lectura).
- (Speaking y los pasajes que venían como imagen del documento original no están incluidos: requieren grabación de voz / imágenes.)

No usa cuentas de usuario: el alumno entra, **paga el acceso** (IziPay) y, solo tras un pago verificado, rinde el examen. El administrador entra con un **código** para gestionar las preguntas y ver analíticas.

---

## 🚀 Cómo arrancar (rápido)

Requisitos: **Node.js 20+** (probado en Node 22) y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
#    (copia .env.example a .env.local y pega tus credenciales de IziPay)
copy .env.example .env.local      # Windows
# cp .env.example .env.local       # Mac/Linux

# 3. Arrancar en desarrollo
npm run dev
```

Abre **http://localhost:3000**.

> El pago es **obligatorio**: solo se entra al examen tras un pago verificado por IziPay.

---

## 🔑 Accesos de prueba

- **Examen**: en la landing pulsa *Comenzar el simulacro* → *Pagar con IziPay* → tras aprobar el pago entras al examen.
- **Panel admin**: ve a `/admin`. Te redirige a `/admin/login`; ingresa el código **`met-admin-2026`** (configurable en `.env.local` con `ADMIN_CODE`). El acceso queda protegido por una **sesión firmada en cookie** (8 h) verificada en el servidor (middleware) — el código nunca se guarda en el navegador y hay **límite de intentos** anti fuerza bruta.

---

## ✨ Funciones

- **Examen multi-sección** (Writing, Listening, Grammar, Reading) con temporizador que **no se reinicia al refrescar** (guarda el tiempo y las respuestas en el navegador).
- **Corrección automática**: Writing con LanguageTool (palabras vs. mínimo, gramática/ortografía/estilo + consejos); Listening/Grammar/Reading auto-corregidas (opción múltiple).
- **Listening por voz**: el navegador lee la transcripción en voz alta (TTS); el alumno no ve el texto, solo escucha.
- **Página de resultados** con puntaje general (gauge), **puntaje por sección**, respuestas correctas/incorrectas reveladas y, en Writing, problemas con sugerencias y tips.
- **Panel admin** protegido por código:
  - **Subir PDF** con plantilla fija → carga automática de preguntas y su retroalimentación.
  - **Analíticas**: total de exámenes, puntaje promedio, distribución de puntajes, errores más comunes, promedio por tarea y exámenes recientes.
- **Pago de acceso** con PayPal (Orders v2), con pase válido por 24 h (cookie firmada, sin cuentas). Solo se concede tras un pago verificado.
- **Bilingüe EN/ES** con cambio instantáneo.
- **Diseño 3D** (three.js) + animaciones (Framer Motion), responsive para móvil y escritorio.

---

## ⚙️ Variables de entorno (`.env.local`)

| Variable | Descripción | Demo |
|---|---|---|
| `ADMIN_CODE` | Código de acceso al panel admin (**requerido en producción**) | `met-admin-2026` |
| `ACCESS_SECRET` | Secreto para firmar el pase de acceso (genera uno propio) | (incluido) |
| `NEXT_PUBLIC_BASE_URL` | URL base de la app (para redirecciones de pago) | `http://localhost:3000` |
| `IZIPAY_SHOP_ID` / `IZIPAY_API_KEY` | Credenciales REST de IziPay. **Requeridas**: sin ellas no hay acceso | *(vacío)* |
| `IZIPAY_PUBLIC_KEY` | Clave pública de IziPay (se envía al formulario de pago) | *(vacío)* |
| `PAY_AMOUNT` | Monto del acceso | `15` |
| `PAY_CURRENCY` | Moneda (ej. `USD`, `PEN`) | `USD` |
| `LANGUAGETOOL_API` | Endpoint de LanguageTool | API pública |

Genera un `ACCESS_SECRET` propio:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 💳 Configurar el pago con IziPay

1. Entra a tu panel de [IziPay](https://secure.micuentaweb.pe) → **Configuración** → **Claves de API REST**.
2. Copia el **Shop ID** (identificador de tienda), la **Clave API REST** y la **Clave pública**.
3. Pégalas en `.env.local`:
   ```
   IZIPAY_SHOP_ID=...
   IZIPAY_API_KEY=...
   IZIPAY_PUBLIC_KEY=...
   PAY_AMOUNT=15
   PAY_CURRENCY=USD
   ```
4. Reinicia `npm run dev`. El botón genera un `formToken` con IziPay y abre el formulario de pago incrustado; al aprobar el pago se emite el pase de acceso.

> El pago se procesa contra la API REST de IziPay (`https://api.micuentaweb.pe`). **Sin pago confirmado no se entra.**

---

## 📝 Cargar preguntas (panel admin)

En `/admin` puedes subir un **PDF** que siga esta plantilla fija. Las preguntas y su retroalimentación se cargan solas:

```
TITLE: My MET Writing Set

[TASK]
TYPE: scenario
TOPIC: Daily Routine
PROMPT: What time do you usually wake up?
FEEDBACK: Mention a specific time and a short reason.
MINWORDS: 20
[/TASK]

[TASK]
TYPE: essay
TOPIC: Education
PROMPT: Some people think students should only study academic subjects. Do you agree?
FEEDBACK: Write a structured essay: intro, two body paragraphs, conclusion.
MINWORDS: 150
[/TASK]
```

- `TYPE`: `scenario` o `essay`.
- `MINWORDS`: mínimo de palabras (0 si no aplica).
- Puedes descargar esta plantilla desde el propio panel.

---

## 🧪 Pruebas

```bash
npm test          # corre la batería de tests (Vitest)
npm run test:watch
```

Cubre la lógica clave: corrección/puntuación (`grammar`), parser de plantillas PDF (`pdf-template`), pase de acceso (`access`) y código admin (`admin`).

---

## 🏗️ Comandos

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Linter |
| `npm test` | Tests |

---

## 🧱 Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **three.js** (fondo 3D) + **Framer Motion** (animaciones)
- **jose** (pase de acceso JWT en cookie)
- **LanguageTool** (corrección gramatical)
- **pdf-parse** (lectura de PDFs)
- **Vitest** (tests)
- Persistencia: base de datos en archivo JSON (`data/db.json`) — fácil de cambiar por una BD real.

---

## 📁 Estructura

```
src/
├─ app/
│  ├─ page.tsx            # Landing + diálogo de pago
│  ├─ exam/               # Instrucciones y examen (/exam, /exam/run)
│  ├─ results/[id]/       # Resultados con feedback
│  ├─ admin/              # Panel admin (preguntas + analíticas)
│  └─ api/                # exam, results, admin, pay
├─ components/            # Navbar, Dialog, Background3D, LanguageToggle...
├─ lib/                   # db, grammar, access, admin, pdf-template, i18n, types
└─ middleware.ts          # protege /exam con el pase de acceso
```

---

## ⚠️ Notas

- La carpeta `data/` y `.env.local` están en `.gitignore` (no se suben).
- Si cambias el monto/moneda, ajusta `PAY_AMOUNT`, `PAY_CURRENCY` (ej. `pen`) y el texto del precio en `src/lib/i18n/dictionaries.ts` (`pay.price`).

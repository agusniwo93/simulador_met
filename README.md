# ExamBridge MET — Simulador

Simulador del **Michigan English Test (MET)** con examen multi-sección: **Writing, Listening, Grammar y Reading**, con temporizador, corrección automática y resultados por sección. Incluye panel de administración con analíticas, idiomas **Español / Inglés** y diseño con fondo 3D animado.

**Secciones:**
- **Writing** — tareas de texto libre corregidas con **LanguageTool** (gramática, ortografía, estilo, extensión) + consejos de mejora.
- **Listening** — el audio se reproduce con la **síntesis de voz del navegador** (TTS) a partir de la transcripción; preguntas de opción múltiple.
- **Grammar / Reading** — opción múltiple auto-corregida (Reading incluye los textos de lectura).
- (Speaking y los pasajes que venían como imagen del documento original no están incluidos: requieren grabación de voz / imágenes.)

No usa cuentas de usuario: el alumno entra, **paga el acceso** (Stripe — tarjeta o Link) y, solo tras un pago verificado, rinde el examen. El administrador entra con un **código** para gestionar las preguntas y ver analíticas.

---

## 🚀 Cómo arrancar (rápido)

Requisitos: **Node.js 20+** (probado en Node 22) y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
#    (copia .env.example a .env.local y pega tu STRIPE_SECRET_KEY)
copy .env.example .env.local      # Windows
# cp .env.example .env.local       # Mac/Linux

# 3. Arrancar en desarrollo
npm run dev
```

Abre **http://localhost:3000**.

> El pago es **obligatorio y real**: solo se entra al examen tras un pago verificado por Stripe. Para probar sin cobrar dinero real, usa una clave **de test** (`sk_test_...`) y la tarjeta de prueba `4242 4242 4242 4242` (cualquier fecha futura y CVC).

---

## 🔑 Accesos de prueba

- **Examen**: en la landing pulsa *Comenzar el simulacro* → *Pagar de forma segura* (Stripe: tarjeta o Link) → tras el pago entras al examen.
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
- **Pago de acceso** con Stripe Checkout (tarjeta o Link), con pase válido por 24 h (cookie firmada, sin cuentas). Solo se concede tras un pago verificado.
- **Bilingüe EN/ES** con cambio instantáneo.
- **Diseño 3D** (three.js) + animaciones (Framer Motion), responsive para móvil y escritorio.

---

## ⚙️ Variables de entorno (`.env.local`)

| Variable | Descripción | Demo |
|---|---|---|
| `ADMIN_CODE` | Código de acceso al panel admin (**requerido en producción**) | `met-admin-2026` |
| `ACCESS_SECRET` | Secreto para firmar el pase de acceso (genera uno propio) | (incluido) |
| `NEXT_PUBLIC_BASE_URL` | URL base de la app (para redirecciones de pago) | `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (`sk_test_...` o `sk_live_...`). **Requerida**: sin ella no hay acceso | *(vacío)* |
| `PAY_AMOUNT` | Monto del acceso | `15` |
| `PAY_CURRENCY` | Moneda (ej. `USD`, `PEN`) | `USD` |
| `LANGUAGETOOL_API` | Endpoint de LanguageTool | API pública |

Genera un `ACCESS_SECRET` propio:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 💳 Configurar el pago con Stripe (tarjeta o Link)

1. Crea/entra a tu cuenta en [Stripe](https://dashboard.stripe.com).
2. Copia tu **Secret key** (Developers → API keys). Usa `sk_test_...` para pruebas o `sk_live_...` para cobrar de verdad.
3. Pégala en `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxxxxx...
   PAY_AMOUNT=15
   PAY_CURRENCY=usd
   ```
4. Reinicia `npm run dev`. El botón abre el Checkout de Stripe (tarjeta y **Link**); al confirmarse el pago, emite el pase de acceso.

> El pago se verifica en el servidor (`/api/pay/confirm` consulta la sesión de Stripe y exige `payment_status === "paid"`). **Sin pago confirmado no se entra.** Habilita "Link" en tu cuenta de Stripe (Settings → Payment methods) para que aparezca esa opción.

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

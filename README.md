# ExamBridge MET — Simulador de Writing

Simulador del examen de **Writing del Michigan English Test (MET)**: 4 tareas con temporizador, corrección automática (gramática, ortografía, estilo y extensión) vía **LanguageTool**, consejos de mejora, panel de administración con analíticas, idiomas **Español / Inglés** y un diseño con fondo 3D animado.

No usa cuentas de usuario: el alumno entra, **paga el acceso** (Mercado Pago) y rinde el examen. El administrador entra con un **código** para gestionar las preguntas y ver analíticas.

---

## 🚀 Cómo arrancar (rápido)

Requisitos: **Node.js 20+** (probado en Node 22) y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
#    (copia .env.example a .env.local; ya trae valores de demo)
copy .env.example .env.local      # Windows
# cp .env.example .env.local       # Mac/Linux

# 3. Arrancar en desarrollo
npm run dev
```

Abre **http://localhost:3000**.

> En **modo demo** (sin claves reales) el pago es **simulado**: el botón de Mercado Pago entrega el acceso sin cobrar nada. Así puedes probar todo el flujo de inmediato.

---

## 🔑 Accesos de prueba

- **Examen**: en la landing pulsa *Comenzar el simulacro* → *Pagar con Mercado Pago* (simulado) → entras al examen.
- **Panel admin**: ve a `/admin` e ingresa el código **`met-admin-2026`** (configurable en `.env.local` con `ADMIN_CODE`).

---

## ✨ Funciones

- **Simulacro de 4 tareas** con temporizador de 45 min que **no se reinicia al refrescar** (guarda el tiempo y las respuestas en el navegador).
- **Corrección automática** con LanguageTool: cuenta de palabras vs. mínimo, errores de gramática/ortografía/estilo y **consejos de mejora** por área.
- **Página de resultados** con puntaje general (gauge), puntaje por tarea, lista de problemas con sugerencias y tips.
- **Panel admin** protegido por código:
  - **Subir PDF** con plantilla fija → carga automática de preguntas y su retroalimentación.
  - **Analíticas**: total de exámenes, puntaje promedio, distribución de puntajes, errores más comunes, promedio por tarea y exámenes recientes.
- **Pago de acceso** con Mercado Pago (Checkout Pro), con pase válido por 24 h (cookie firmada, sin cuentas).
- **Bilingüe EN/ES** con cambio instantáneo.
- **Diseño 3D** (three.js) + animaciones (Framer Motion), responsive para móvil y escritorio.

---

## ⚙️ Variables de entorno (`.env.local`)

| Variable | Descripción | Demo |
|---|---|---|
| `ADMIN_CODE` | Código de acceso al panel admin | `met-admin-2026` |
| `ACCESS_SECRET` | Secreto para firmar el pase de acceso (genera uno propio) | (incluido) |
| `NEXT_PUBLIC_BASE_URL` | URL base de la app (para redirecciones de pago) | `http://localhost:3000` |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token de Mercado Pago. **Vacío = modo demo** | *(vacío)* |
| `PAY_AMOUNT` | Monto del acceso | `15` |
| `PAY_CURRENCY` | Moneda (ej. `USD`, `PEN`) | `USD` |
| `LANGUAGETOOL_API` | Endpoint de LanguageTool | API pública |

Genera un `ACCESS_SECRET` propio:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 💳 Activar el cobro real con Mercado Pago

1. Crea tu cuenta en [Mercado Pago Developers](https://www.mercadopago.com/developers).
2. Copia tu **Access Token** (producción o sandbox).
3. Pégalo en `.env.local`:
   ```
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx...
   PAY_CURRENCY=PEN   # o USD según tu cuenta
   ```
4. Reinicia `npm run dev`. El botón ahora redirige al Checkout real y, al aprobarse el pago, emite el pase de acceso.

> La verificación del pago se hace consultando el pago en la API de Mercado Pago (`/v1/payments/{id}`).

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
- Si cambias el monto a soles, ajusta `PAY_AMOUNT`, `PAY_CURRENCY=PEN` y el texto del precio en `src/lib/i18n/dictionaries.ts` (`pay.price`).

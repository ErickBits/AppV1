# 06 · Manual de Branding — BiblioPop

**Concepto:** *una biblioteca con actitud pop.* El estilo **Memphis** (años 80) se resume en colores planos y saturados, contornos negros gruesos, sombras duras sin difuminar y confeti geométrico. La idea es que pedir un libro se sienta como algo divertido y no como un trámite.

**Fuente de verdad:** los valores de este manual salen del código y deben cambiarse **solo ahí**:
`frontend/src/index.css` (bloque `@theme`) y `frontend/src/lib/memphis.js` (`TONES`).

---

## 1. Nombre y logotipo

| Elemento | Especificación |
|---|---|
| **Nombre** | **BiblioPop**, en una sola palabra con la B y la P mayúsculas. Nunca "Biblio Pop" ni "BIBLIOPOP" en texto corrido. |
| **Wordmark** | "Biblio" en Ink y "Pop" en Purple (`#8338EC`) sobre fondos claros. Sobre fondo Ink, "Pop" va en Pink (`#FF5FA2`). Tipografía Archivo Black. |
| **Isotipo** | Cuadrado redondeado (radio 12 px) en Pink, contorno Ink de 3 px, una **"B"** en Archivo Black y un círculo Yellow (`#FFD23F`) que sale de la esquina superior derecha. Lleva sombra dura de 3 px. |
| **Favicon** | `frontend/public/favicon.svg` |
| **Nombre técnico** | En documentos técnicos el sistema se llama "Biblioteca Virtual" y la marca de cara al usuario es "BiblioPop". |
| **Interacción** | Al pasar el cursor, el isotipo rota 6°. |

**No se debe:** estirar el logo, ponerle degradados, quitarle el contorno o cambiar el color de "Pop" por uno fuera de la paleta.

## 2. Paleta de colores

### 2.1 Colores base

| Token | HEX | Muestra | Uso |
|---|---|---|---|
| `ink` | `#151515` | ⬛ | Texto, contornos, sombras duras, pie de página |
| `paper` | `#FFF7E8` | 🟫 crema | Fondo general (con una retícula de puntos al 12 % de Ink) |
| `white` | `#FFFFFF` | ⬜ | Fondo de tarjetas, campos y botón fantasma |
| `muted` | `#4A4A4A` | — | Texto secundario (autores, ayudas) |

### 2.2 Colores de acento ("tones")

| Token | HEX | Texto encima | Uso principal |
|---|---|---|---|
| `pink` | `#FF5FA2` | Ink | **Acción principal** (`btn-primary`), errores, "Eliminar", isotipo |
| `yellow` | `#FFD23F` | Ink | **Acción secundaria** (`btn-secondary`), selección de texto, navegación activa, estado *En espera* |
| `teal` | `#2EC4B6` | Ink | Estado *En préstamo*, "Editar", cabecera del Catálogo |
| `blue` | `#3A86FF` | White* | Contorno de foco (accesibilidad), acentos decorativos |
| `purple` | `#8338EC` | White | "Pop" del wordmark, cabecera de Administración |
| `orange` | `#FF7F3F` | Ink | Cabecera de Mi cuenta, confeti |
| `mint` | `#B8F2E6` | Ink | Confirmaciones (✓) y recuadro "hay copias disponibles" |

Los seis tonos `pink → orange` (en el orden de `TONES`) se asignan a cada **género** con un hash del nombre. Así cada sección tiene siempre el mismo color en cualquier dispositivo.

### 2.3 Colores con significado (consistencia con los documentos técnicos)

Estos colores dicen algo concreto. **No se reutilizan para otra cosa.**

| Concepto técnico | Valor en BD / API | Texto en UI | Color |
|---|---|---|---|
| Reserva en préstamo | `reservations.status = 'active'` | En préstamo | Teal `#2EC4B6` |
| Reserva en espera | `reservations.status = 'waiting'` | En espera · #n en la fila | Yellow `#FFD23F` (chip de posición en Pink) |
| Reserva devuelta | `'returned'` | Devuelto | White |
| Reserva cancelada | `'cancelled'` | Cancelado | White |
| Copia libre | `books.available_copies` | Punto de color | Pink, Yellow, Teal, Blue, Purple (en ese orden, hasta 5) |
| Copia prestada | `total_copies − available_copies` | Punto vacío | White con contorno Ink |
| Sin copias | `available_copies = 0` | LISTA DE ESPERA | Etiqueta Ink con texto Yellow |
| Error de la API | HTTP 4xx/5xx `detail` | ✕ mensaje | Pink |
| Confirmación | HTTP 2xx | ✓ mensaje | Mint |

### 2.4 Contraste (WCAG 2.1)

| Combinación | Contraste | AA texto normal (≥ 4.5) |
|---|---|---|
| Ink sobre Paper | 17.2 : 1 | ✅ |
| Ink sobre Yellow | 12.7 : 1 | ✅ |
| Ink sobre Mint | 14.7 : 1 | ✅ |
| Ink sobre Teal | 8.4 : 1 | ✅ |
| Ink sobre Orange | 7.3 : 1 | ✅ |
| Ink sobre Pink | 6.4 : 1 | ✅ |
| Muted sobre Paper | 8.3 : 1 | ✅ |
| White sobre Purple | 5.6 : 1 | ✅ |
| **White sobre Blue** | **3.5 : 1** | ⚠️ solo texto grande (≥ 18.66 px en negrita) |
| Ink sobre Purple | 3.3 : 1 | ❌ no usar |

\* **Recomendación:** hoy `TONES` pone texto blanco sobre Blue en chips pequeños de género. Para cumplir AA convendría cambiarlo a texto Ink (5.3 : 1). Es un cambio de una línea en `memphis.js`.

## 3. Tipografía

| Rol | Fuente | Pesos | Respaldo | Uso |
|---|---|---|---|---|
| **Display** | **Archivo Black** | 400 (ya es black) | Arial Black, Impact, sans-serif | `h1` a `h4`, botones, logotipo, títulos de tarjeta |
| **Texto** | **Space Grotesk** | 400, 500, 700 | ui-sans-serif, system-ui, sans-serif | Párrafos, formularios, etiquetas, tablas |

Ambas se sirven desde el propio frontend con `@fontsource` (no se usa un CDN externo).

### 3.1 Escala y estilo

| Elemento | Estilo |
|---|---|
| Título de página (H1) | Archivo Black, 48–60 px, interlineado 0.95, `tracking-tight` |
| Subtítulo (H2) | Archivo Black, 24–30 px |
| Botón | Archivo Black, 14 px, MAYÚSCULAS, `tracking-wide` |
| Etiqueta de campo / chip | Space Grotesk 700, 12 px, MAYÚSCULAS, `tracking-widest` |
| Texto | Space Grotesk 500, 16–18 px, interlineado relajado |
| Datos numéricos (copias) | Space Grotesk 700 con `tabular-nums` |

## 4. Sistema visual

| Elemento | Regla |
|---|---|
| **Contorno** | 3 px sólido Ink en tarjetas, botones y campos. 2 px en chips y puntos. |
| **Sombra dura** | Sin difuminado, desplazada hacia abajo a la derecha: `sm` 3 px · normal 6 px · `lg` 10 px, siempre en Ink. |
| **Radios** | Tarjetas 16 px · campos 12 px · botones y chips totalmente redondos. |
| **Hover** | El elemento "se levanta": se mueve −1 px en X e Y y crece la sombra. Al presionar, se hunde y la sombra desaparece. |
| **Formas decorativas** | Triángulo, anillo, garabato (squiggle), cruz, círculo, zigzag y rayas diagonales. Solo decoran, llevan `aria-hidden` y en la página general solo aparecen en pantallas de 1536 px o más. |
| **Inclinación** | Las portadas y los chips activos se inclinan 2° para dar un aire juguetón. |
| **Movimiento** | `float`, `wiggle`, `bob`, `spin-slow` y `pop` (entrada con rebote). **Todo se desactiva con `prefers-reduced-motion`.** |
| **Foco** | Contorno Blue de 3 px con separación de 2 px. No se quita nunca. |

### 4.1 Portadas generadas

Cuando un libro no tiene `cover_url`, la portada se genera con el **título** como semilla (`hashString`). El color y las formas salen siempre iguales para el mismo libro. Si se cambia la paleta, cambian todas las portadas generadas.

## 5. Tono de voz

**Personalidad:** como un bibliotecario joven y simpático. Cercano, con humor ligero y siempre claro.

| Principio | Sí ✅ | No ❌ |
|---|---|---|
| **Tutear siempre** | "Únete gratis", "Tus reservas" | "Regístrese", "Sus reservas" |
| **Frases cortas y en positivo** | "Préstamo inmediato por 14 días." | "El sistema procederá a registrar el préstamo con vigencia de catorce días naturales." |
| **Celebrar los logros** | "¡Es tuyo! Devuélvelo antes del 7/11/2026." | "Reserva creada con éxito (ID 42)." |
| **Humor solo donde no estorba** | 404: "Esta página se fue de préstamo y nunca volvió." | Bromas en mensajes de error que bloquean al usuario |
| **Errores: qué pasó y qué hacer** | "Hay 2 copias prestadas; no se puede bajar el total a 1." | "Error 409" o "Operación inválida" |
| **Vocabulario de biblioteca** | préstamo, fila, devolver, sección, copia | ticket, slot, item, recurso |
| **Español neutro** | "Correo electrónico", "Contraseña" | Anglicismos innecesarios ("mail", "password") |

### 5.1 Glosario de marca ↔ término técnico

Para que la interfaz, el manual de usuario y los documentos técnicos digan lo mismo:

| Término técnico (BD/API) | En la interfaz se dice |
|---|---|
| `users` | cuenta, lector |
| `role = 'admin'` | Administrador, Panel de control |
| `books` | libro, título |
| `books.genre` | sección, género |
| `total_copies` / `available_copies` | copias / disponibles, libres |
| `reservations` | reserva |
| `status = 'active'` | préstamo, "En préstamo" |
| `status = 'waiting'` + `waitlist:{book_id}` | lista de espera, fila, "En espera" |
| promoción (`waiting → active`) | "pasa directo al primero de la fila" |
| `due_at` | "vence", "devuélvelo antes del" |

### 5.2 Taglines aprobadas

- "Todo lo de una biblioteca, sin la fila."
- "¿Se agotó? Te guardamos el lugar."
- "Tres pasos. Cero complicaciones."
- "Explora, reserva y haz fila desde cualquier lugar." (meta description)

## 6. Aplicación en los documentos técnicos

- Los diagramas Mermaid de los documentos 01 y 02 usan los **nombres técnicos** (`active`, `waiting`). Las tablas de equivalencia de este manual (§2.3 y §5.1) los traducen a la UI.
- Si se agrega un estado de reserva, hay que actualizar a la vez: el `CHECK` de `reservations.status`, `STATUS` en `Profile.jsx`, §2.3 de este manual, el diagrama de estados del documento 02 y la tabla del manual de usuario §6.1.

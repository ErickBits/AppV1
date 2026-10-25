# 05 · Manual de Usuario — BiblioPop

> *Todo lo de una biblioteca, sin la fila.*

Este manual explica cómo usar BiblioPop desde el navegador. Los textos entre comillas (**"Reservar ahora"**) son exactamente lo que verás en pantalla.

| Si eres… | Lee |
|---|---|
| Lector | Secciones 1 a 6 |
| Administrador | Sección 7 |
| Alguien con un error | Sección 8 |

---

## 1. Entrar a BiblioPop

1. Abre la dirección que te dieron (en local: `http://localhost:8080`).
2. Arriba está la barra de navegación: **Inicio**, **Catálogo**, **Entrar** y el botón rosa **"Únete gratis"**.
3. En el celular, esas opciones están dentro del botón **"Menú"**.

Puedes ver el catálogo sin cuenta. **Para reservar sí necesitas una.**

## 2. Crear una cuenta

1. Haz clic en **"Únete gratis"**.
2. Llena el formulario:
   - **Nombre completo:** al menos 2 letras.
   - **Correo electrónico:** será tu usuario.
   - **Contraseña (mín. 8 caracteres)**.
3. Pulsa **"Crear mi cuenta →"**.
4. Entras automáticamente y llegas al **Catálogo**.

> Si el correo ya tiene una cuenta, verás *"✕ El email ya está registrado"*. En ese caso usa **"Entra aquí"**.

## 3. Iniciar y cerrar sesión

**Iniciar sesión**

1. Haz clic en **Entrar**.
2. Escribe tu correo y tu contraseña y confirma.
3. Vuelves a la página donde estabas. Si llegaste directo, vas al Catálogo.

**Cerrar sesión:** pulsa **"Salir"** en la barra.

> La sesión dura **8 horas**. Después el sistema te pedirá que entres de nuevo.

## 4. Buscar un libro

1. Ve a **Catálogo**. Arriba verás cuántos títulos hay.
2. **Buscar:** escribe parte del título o del autor en *"Busca por título o autor…"* y pulsa **"Buscar"**. No importa si usas mayúsculas o minúsculas.
3. **Filtrar por sección:** pulsa una de las etiquetas de colores (cada género tiene su color). **"Todas"** quita el filtro.
4. **Cambiar de página:** usa la paginación del final. Se muestran 24 libros por página.
5. Si no hay resultados, aparece *"Nada por aquí…"*. Prueba con otra palabra o con otra sección.

> La búsqueda queda en la dirección de la página (`?q=…&genero=…&pagina=…`), así que puedes copiar el enlace y compartirlo.

### Cómo leer la disponibilidad

Cada libro muestra una fila de **puntos**, uno por copia (de 1 a 5):

| Lo que ves | Significado |
|---|---|
| ●●○ **2/3 disponibles** | Hay 3 copias y 2 están libres. Los puntos de color son copias libres y los blancos, prestadas. |
| ○○○ **LISTA DE ESPERA** (etiqueta negra) | Todas las copias están prestadas. Puedes hacer fila. |

## 5. Reservar un libro

1. Haz clic en la portada o el título para abrir el **detalle del libro**.
2. En el recuadro de disponibilidad aparece uno de estos dos botones:

### 5.a Hay copias: **"Reservar ahora"** (recuadro verde menta)

- Pulsa el botón y el libro es tuyo **por 14 días**.
- Verás: *"✓ ¡Es tuyo! Devuélvelo antes del dd/mm/aaaa."*

### 5.b No hay copias: **"Unirme a la lista de espera"** (recuadro amarillo)

- Pulsa el botón y entras a la fila.
- Verás: *"✓ No quedan copias: estás en la posición #n de la lista de espera."*
- **No tienes que hacer nada más.** Cuando alguien devuelva el libro, la copia **pasa directo al primero de la fila** y tu reserva se vuelve un préstamo de 14 días. Lo verás en **Mi cuenta**.

> **Solo puedes tener una reserva abierta por libro.** Si lo intentas dos veces verás *"✕ Ya tienes una reserva activa o en espera para este libro"*.

## 6. Mi cuenta

Pulsa **"Mi cuenta"** en la barra. La página saluda con *"¡Hola, [tu nombre]!"* y tiene dos partes.

### 6.1 Tus reservas

Cada reserva lleva una etiqueta de estado:

| Etiqueta | Qué significa | Qué puedes hacer |
|---|---|---|
| 🟩 **En préstamo** + *"vence dd/mm/aaaa"* | Tienes el libro | **"Devolver"** |
| 🟨 **En espera** + *"#n en la fila"* | Estás en la fila. *n* es tu lugar. | **"Salir de la fila"** |
| ⬜ **Devuelto** | Ya lo devolviste | Solo es historial |
| ⬜ **Cancelado** | Saliste de la fila | Solo es historial |

**Devolver un libro**

1. Busca la reserva **En préstamo**.
2. Pulsa **"Devolver"**.
3. Pasa a **Devuelto**. Si alguien estaba en la fila, le llega la copia a esa persona.

**Salir de la fila**

1. Busca la reserva **En espera**.
2. Pulsa **"Salir de la fila"**.
3. Pasa a **Cancelado** y quien estaba detrás de ti avanza un lugar.

> Un préstamo no se puede "cancelar": hay que devolverlo. Una espera no se puede "devolver": hay que salir de la fila.

### 6.2 Tus datos

1. Puedes cambiar el **Nombre** y el **Correo**.
2. Para cambiar la contraseña, llena el recuadro **"Cambiar contraseña (opcional)"**:
   - **Contraseña actual** (obligatoria si vas a cambiarla).
   - **Nueva contraseña** (mínimo 8 caracteres).
3. Pulsa **"Guardar cambios"**. Si todo sale bien, verás *"✓ Datos actualizados."*

---

## 7. Guía del administrador

La cuenta de administrador se crea al instalar el sistema (en local: `admin@biblioteca.dev`). Con esa cuenta aparece **"Admin"** en la barra.

### 7.1 Panel de control

En **Admin** verás una tabla con **Título, Autor, Género** y **Copias** (`libres/totales`, por ejemplo `2/3`). El campo *"Filtrar por título o autor…"* reduce la lista. Se muestran hasta 100 libros. Si hay más, usa el filtro.

### 7.2 Agregar un libro

1. Pulsa **"+ Nuevo libro"**.
2. Llena el formulario:
   - **Título** y **Autor** (obligatorios). No puede haber dos libros con el mismo título y autor.
   - **Año**, **Género** y **Descripción** (opcionales). El género se convierte en una "sección" del catálogo.
   - **URL de portada (opcional):** si la dejas vacía, se genera una portada automática.
   - **Copias totales (1–5)**.
3. A la derecha verás la **Vista previa** de la portada.
4. Pulsa **"Publicar"**. Las copias empiezan todas disponibles.

### 7.3 Editar un libro

1. En la fila del libro, pulsa **"Editar"** (etiqueta teal).
2. Cambia lo que necesites y pulsa **"Guardar"**.

**Regla de copias:** si bajas las copias totales, las disponibles bajan lo mismo. **No puedes bajar el total por debajo de las copias que están prestadas.** Si lo intentas, verás *"✕ Hay n copias prestadas; no se puede bajar el total a m"*.

> Si **subes** las copias de un libro que tiene fila, las copias nuevas quedan disponibles para el próximo que reserve. **No** se asignan a la fila (es una limitación conocida).

### 7.4 Eliminar un libro

1. Pulsa **"Eliminar"** (etiqueta rosa).
2. Confirma en el aviso del navegador: *"¿Eliminar «…»? Esta acción no se puede deshacer."*
3. Solo se puede eliminar un libro que **no tiene copias prestadas**. Si tiene, verás *"✕ El libro tiene copias prestadas; espera a que se devuelvan"*.

> Al eliminar un libro también se borra su historial de reservas.

---

## 8. Mensajes y soluciones

Los mensajes de error aparecen en un recuadro **rosa con ✕**. Las confirmaciones, en un recuadro **verde menta con ✓**.

| Mensaje | Causa | Qué hacer |
|---|---|---|
| Credenciales inválidas | El correo o la contraseña no coinciden | Revisa que no tengas activadas las mayúsculas. |
| El email ya está registrado | Ya existe una cuenta con ese correo | Entra con esa cuenta o usa otro correo. |
| La contraseña debe tener al menos 8 caracteres | La contraseña es muy corta | Usa 8 caracteres o más. |
| Contraseña actual incorrecta | Al cambiar la contraseña, la actual no coincide | Escribe bien tu contraseña actual. |
| Invalid or expired token / Missing bearer token | La sesión expiró (más de 8 h) | Recarga la página (la sesión vencida se cierra sola) y vuelve a entrar. |
| Ya tienes una reserva activa o en espera para este libro | Ya tienes ese libro o ya estás en su fila | Revísalo en **Mi cuenta**. |
| Solo se pueden devolver reservas activas | La reserva ya no está en préstamo | Recarga **Mi cuenta**. |
| Solo se pueden cancelar reservas en espera | La reserva ya pasó a préstamo | Recarga la página: ¡te llegó el libro! |
| Libro no encontrado / 404 *"Esta página se fue de préstamo y nunca volvió."* | El libro fue eliminado o la dirección está mal | Vuelve al **Catálogo**. |

## 9. Preguntas frecuentes

**¿Me avisan por correo cuando me llega un libro de la fila?**
Todavía no. Revisa **Mi cuenta**: tu reserva cambia de *En espera* a *En préstamo*.

**¿Qué pasa si no devuelvo a tiempo?**
La fecha de vencimiento es informativa. El sistema no cobra multas ni bloquea la cuenta.

**¿Puedo reservar varios libros a la vez?**
Sí, todos los que quieras. Solo hay un límite de una reserva abierta por cada libro.

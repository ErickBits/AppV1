# AppV1_Documentation — Biblioteca Virtual (BiblioPop)

Documentación integral del proyecto. Todo el contenido sale del código del repositorio (rama `main`, 2026-10-24).

| # | Documento | Contenido |
|---|---|---|
| 01 | [Modelado de Datos](01_Modelado_de_Datos.md) | ER conceptual, diagrama relacional (PK, FK y tipos de PostgreSQL), diccionario de datos, índices y claves de Redis |
| 02 | [Arquitectura de Procesos](02_Arquitectura_de_Procesos.md) | Componentes, flujo del proceso principal (reservar, esperar, devolver), estados de una reserva y flujo de administración |
| 03 | [Matriz de Requerimientos](03_Matriz_de_Requerimientos.md) | ID, requisito, prioridad, tipo, tabla, endpoint y estado. Trazabilidad con tablas y con pruebas |
| 04 | [Especificación IEEE 830](04_Especificacion_Requisitos_IEEE830.md) | SRS completa con los requisitos funcionales y no funcionales |
| 05 | [Manual de Usuario](05_Manual_de_Usuario.md) | Guía paso a paso para lectores y administradores |
| 06 | [Manual de Branding](06_Manual_de_Branding.md) | Logotipo, paleta HEX, contraste, tipografía, sistema visual y tono de voz |

**Convenciones comunes**

- Tablas: `users`, `books`, `reservations` (PostgreSQL 17). Colas en Redis: `waitlist:{book_id}`.
- Estados de reserva: `active`, `waiting`, `returned`, `cancelled`.
- Requisitos: `RF-xx` (funcionales) y `RNF-xx` (no funcionales). Se usan los mismos ID en los documentos 02, 03 y 04.
- Los diagramas están en Mermaid. Se ven directo en GitHub, GitLab y VS Code (con la extensión *Markdown Preview Mermaid Support*).

Documentación técnica complementaria en `../docs/`: `ARCHITECTURE.md`, `K8S.md`, `TLS.md`.

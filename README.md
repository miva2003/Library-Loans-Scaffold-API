# Library Loans API — Parcial ISIS 3710

Sistema de gestión de préstamos de biblioteca implementado con **NestJS 10**, **TypeORM 0.3** y **PostgreSQL 16**.

## Arranque rápido

```bash
# Paso 1: Copiar variables de entorno
cp .env.example .env

# Paso 2: Levantar base de datos (PostgreSQL en puerto 5433)
docker compose up -d

# Paso 3: Instalar dependencias
npm install

# Paso 4: Correr migraciones
npm run migration:run

# Paso 5: Arrancar aplicación en modo desarrollo
npm run start:dev
```

Swagger UI disponible en: **http://localhost:3000/api/docs**

---

## Credenciales de prueba

Crea un usuario con `POST /api/auth/register`:

```json
{
  "email": "admin@library.com",
  "password": "Admin1234!",
  "firstName": "Admin",
  "lastName": "Library"
}
```

> El usuario se crea con rol `member` por defecto. Para probar endpoints de admin/librarian, actualiza el rol directamente en la BD.

Luego autentícate con `POST /api/auth/login` y usa el `access_token` en el header `Authorization: Bearer <token>`.

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run start:dev` | Arrancar con hot reload |
| `npm run start:prod` | Arrancar build de producción |
| `npm run build` | Compilar TypeScript → `dist/` |
| `npm test` | Tests unitarios |
| `npm run test:cov` | Tests con cobertura |
| `npm run lint` | ESLint con autofix |
| `npm run migration:generate src/database/migrations/NombreMigracion` | Generar migración desde diff de entidades |
| `npm run migration:run` | Aplicar migraciones pendientes |
| `npm run migration:revert` | Revertir última migración |

---

## Resetear base de datos y generar migración limpia

```bash
# Detener contenedor y eliminar volumen
docker compose down -v

# Volver a levantar BD limpia
docker compose up -d

# Generar migración desde cero (refleja estado actual de entidades)
npm run migration:generate src/database/migrations/InitialSchema

# Aplicar migración
npm run migration:run
```

---

## Decisión sobre transición a 'overdue'

**Implementación elegida:** Actualización automática al consultar `GET /loans`

Cuando se llama a `findAll()`, el servicio ejecuta primero un `UPDATE` bulk antes de devolver resultados:

```sql
UPDATE loans
SET status = 'overdue'
WHERE status = 'active'
  AND "dueAt" < NOW()
  AND "returnedAt" IS NULL;
```

**Razones:**
- No requiere cron job ni worker separado — menor complejidad operacional.
- Garantiza consistencia inmediata: el consumidor de la API siempre ve estados actualizados.
- Una sola query bulk es eficiente (no carga entidades en memoria).

**Alternativa considerada:** filtrar dinámicamente (`WHERE dueAt < NOW() → mostrar como overdue`) sin escribir en BD. No implementada porque no actualiza el estado persistente y un `GET /loans/:id` individual devolvería `active` aunque ya estuviera vencido.

---

## Reglas de negocio implementadas

| Regla | Descripción | HTTP |
|---|---|---|
| **R1** | `dueAt` debe ser fecha futura y el período no puede superar `MAX_LOAN_DAYS` | 400 |
| **R2** | Un ítem solo puede tener un préstamo `active` u `overdue` a la vez | 409 |
| **R3** | Un usuario no puede tener ≥ `MAX_ACTIVE_LOANS` préstamos `active`/`overdue` | 409 |
| **R4** | Multa = `Math.ceil(díasVencidos) × DAILY_FINE_RATE`; status siempre `returned` al devolver | — |
| **R5** | FSM: no se puede devolver un préstamo `returned`/`lost`; solo `active`/`overdue` se pueden marcar como `lost` | 400 |

---

## 🎁 Bonos implementados

- [ ] **B1:** Cola FIFO de reservas (+8%)
- [ ] **B2:** Refresh tokens stateful (+5%)
- [ ] **B3:** Pipeline GitHub Actions (+4%)
- [ ] **B4:** Tests e2e + matriz FSM (+3%)

_Esta lista se actualizará según los bonos implementados._

---

## Estructura del proyecto

```
src/
├── main.ts                        # Bootstrap: ValidationPipe + Swagger + prefix /api
├── app.module.ts                  # ConfigModule + TypeOrmModule + todos los módulos
├── config/
│   ├── configuration.ts           # AppConfig factory
│   └── validation.schema.ts       # Joi: valida env vars al arranque
├── database/
│   ├── data-source.ts             # DataSource para CLI TypeORM
│   └── migrations/                # Migraciones generadas
├── common/
│   ├── decorators/public.decorator.ts
│   ├── filters/http-exception.filter.ts
│   └── interceptors/logging.interceptor.ts
└── modules/
    ├── auth/                      # JWT + register/login
    ├── users/                     # Entidad User
    ├── items/                     # Entidad Item (code, title, type)
    ├── loans/                     # Entidad Loan (ManyToOne item, FSM status)
    └── health/                    # /api/health/live y /ready
```

---

María Inés Velásquez — 202224325

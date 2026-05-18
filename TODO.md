# TODO - Corrección de errores TypeScript detectados

- [x] Corregir firma del handler `GET` en `src/app/api/companies/[id]/documents/route.ts` para el formato de Next.js (params asíncronos).
- [x] Corregir referencias de `logoPath` a `logoData` en `src/app/api/company/route.ts` para alinear con `prisma/schema.prisma`.
- [ ] Ejecutar `npx tsc --noEmit` para validar que no queden errores de tipado.

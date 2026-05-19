# TODO - Implementación Chile Compliance (ISO 45001 / HSEC Chile)

- [x] 1. Crear módulo `src/lib/chile-compliance.ts`
  - [x] 1.1 Definir marco normativo base Chile (Ley 16.744, DS 40, DS 54, DS 594, DS 44, Código del Trabajo)
  - [x] 1.2 Definir modelo de obligaciones y evidencias auditables
  - [x] 1.3 Exponer helpers para trazabilidad por documento

- [x] 2. Reforzar `src/lib/chile-sst-prompt.ts`
  - [x] 2.1 Exigir versión normativa y vigencia
  - [x] 2.2 Exigir sección de trazabilidad legal y evidencia auditable

- [x] 3. Enriquecer `src/lib/sst-documents.ts`
  - [x] 3.1 Agregar metadata de auditoría/evidencia por documento
  - [x] 3.2 Vincular referencias legales críticas por documento

- [x] 4. Integrar validación mínima en backend de generación
  - [x] 4.1 Identificar endpoint principal de generación
  - [x] 4.2 Rechazar/advertir respuestas sin trazabilidad legal mínima

- [x] 5. Testing ruta crítica
  - [x] 5.1 Probar generación documental con trazabilidad
  - [x] 5.2 Verificar que referencias normativas y evidencia se incluyan

- [ ] 6. Etapa siguiente: UI compliance + flujo aprobación
  - [x] 6.1 Integrar panel de trazabilidad legal en `DocumentDetailView`
  - [x] 6.2 Mostrar evidencia exigible en `DocumentAuditChecklist`
  - [x] 6.3 Exponer resumen legal en `DashboardWorkflowSummary`
  - [ ] 6.4 Bloquear aprobación final si faltan evidencias críticas
  - [ ] 6.5 Testing ruta crítica UI/flujo

- [ ] 7. Etapa multiagente compliance legal
  - [x] 7.1 Crear agente `document-compliance-reviewer`
  - [x] 7.2 Integrar en `document-orchestrator.ts` (score/aprobación)
  - [x] 7.3 Extender `AgentRole` en `src/lib/agents/types.ts`
  - [x] 7.4 Crear endpoint `/api/agents/document-compliance-review`
  - [x] 7.5 Reflejar paso en logs UI de pipeline
  - [ ] 7.6 Testing ruta crítica multiagente

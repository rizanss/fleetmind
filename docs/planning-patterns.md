# Planning Patterns

---

## Workflow Preferences

### Phase 0 Contracts Always First
In any full-stack project with shared data contracts (TypeScript interfaces + backend schemas), always create a dedicated "Phase 0" task that defines all shared types before any backend or frontend work begins. This is a hard blocker — no other tasks should start until Phase 0 is committed.

- **When to apply:** Any project with frontend/backend type contract parity (TypeScript + Pydantic, TypeScript + Go structs, etc.)
- **Source:** User preference, captured 2026-04-25

### Confirm with User After Each Ticket
After completing each Linear ticket (branch pushed, PR open, Linear status updated), always pause and confirm with the user before starting the next ticket. This gives the user visibility and control over the pace of execution.

- **When to apply:** All Linear ticket implementation workflows in this project
- **Source:** User preference, captured 2026-04-25

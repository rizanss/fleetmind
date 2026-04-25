# Project: Fleetmind

## Tech Stack
- Frontend: Next.js 16+ (App Router), TypeScript, Tailwind CSS, Leaflet/Mapbox
- Backend: Python, FastAPI, Google OR-Tools (TSP Engine)
- Agentic: Claude Code, Linear MCP
- Deployment: Vercel (frontend), Railway/Render (backend)

## Linear Workflow
Ketika mengerjakan tiket dari Linear:
1. Baca detail tiket (description, acceptance criteria) dari Linear
2. Buat branch baru dari `main` dengan format: `feature/[LINEAR-ID]-[short-desc]`
3. Kerjakan sesuai acceptance criteria di tiket
4. Setelah selesai, update status tiket di Linear ke "Done"
5. Add comment di tiket Linear tentang apa yang sudah dikerjakan
6. Commit semua perubahan ke branch tersebut

## GitHub Workflow
Setelah mengerjakan tiket:
1. Push branch ke remote: `git push origin feature/[LINEAR-ID]-[short-desc]`
2. Buat Pull Request ke branch `main`
3. PR title format: `[LINEAR-ID] Short description of changes`
4. PR body harus include:
   - Link ke tiket Linear
   - Summary of changes
   - Testing yang sudah dilakukan
5. JANGAN merge PR sendiri — tunggu review

## Code Conventions
- Gunakan TypeScript strict mode di semua file frontend
- Semua component harus ada error handling dan loading state
- Semua API endpoint harus ada response schema yang jelas
- Naming: camelCase untuk variable/function, PascalCase untuk component/class
- Setiap fungsi TSP/routing harus ada inline comment penjelasan logic-nya

## File Structure
fleetmind/
├── frontend/          # Next.js App
│   ├── app/
│   ├── components/
│   └── lib/
├── backend/           # FastAPI
│   ├── main.py
│   ├── routers/
│   └── services/
├── _bmad-output/      # PRD, Architecture, Epics (generated later)
├── CLAUDE.md
└── README.md
# App (Vue) - Phase 4: Dashboard & Features

## Modified: 2026-01-24

### Completed
- [x] Create learner dashboard layout (Done: 2026-01-20)
- [x] Implement course listing component (Done: 2026-01-20)
- [x] Create course detail page (Done: 2026-01-20)
- [x] Create QuizzEngine component (Done: 2026-01-20)
- [x] Implement VideoPlayer component (Done: 2026-01-20)
- [x] Add skeleton loading states (Done: 2026-01-20)
- [x] Implement progress tracking UI (Done: 2026-01-20)
- [x] Create badge display component (Done: 2026-01-20)
- [x] Integrate DiceBear for user avatars (Done: 2026-01-20)
- [x] Create analytics charts with Chart.js (Done: 2026-01-20)
- [x] Build tenant admin dashboard (Done: 2026-01-21)
- [x] Implement team management views (Done: 2026-01-21)
- [x] Implement member invitation system (Done: 2026-01-21)
- [x] Implement seat management UI (Done: 2026-01-21)
- [x] Create discussion/comment system (Done: 2026-01-22)
- [x] Create personal notes system with markdown & PDF export (Done: 2026-01-22)
- [x] Add internationalization (i18n) EN/FR (Done: 2026-01-22)
- [x] Implement dark mode toggle + persistence (Done: 2026-01-24)
- [x] Fix DiceBear avatars not displaying (Done: 2026-01-24)
- [x] Create profile page with avatar selector component (Done: 2026-01-24)

### Pending - UX Improvements
- [ ] Implement lazy loading for videos

### Pending - API Integration
- [ ] Integrate real API (replace mock data in composables)
- [ ] Add error boundaries for API failures
- [ ] Implement optimistic updates

### Pending - Content Creation (Critical)
- [ ] Course creator/editor page
- [ ] Chapter management UI (drag & drop)
- [ ] Lesson editor (video, quiz, document)
- [ ] Quiz question builder
- [ ] Media upload components (video, images, docs)

### Recently Completed
- [x] Discussion & Notes system merged to dev (Done: 2026-01-22)

---

## Notes
- VideoPlayer must support multiple formats (1080p, 720p, 480p)
- QuizzEngine uses Zod schemas from @shared/schemas
- Dashboard views differ for Learner vs Tenant Admin
- Dark mode should use Tailwind's dark: variant with system preference detection

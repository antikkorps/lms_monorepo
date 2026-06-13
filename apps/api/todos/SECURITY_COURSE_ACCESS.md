# Plan — Fix paid-course access bypass (secure-by-default)

> Branch: `fix/course-access-security` (from `dev`). Created 2026-06-12, for next session.
> Source: security audit 2026-06-12 (BACKLOG.md "🔴🔒 Security audit"). **Go-live blocker** — must land before re-enabling registrations (#4).

## Threat
Authenticated/anonymous users can obtain paid course content without paying. Root cause is **enforcement, not logic**: the access brain (`apps/api/src/utils/course-access.ts` → `checkCourseAccess` / `checkCourseAccessFromLesson`) is correct and complete (admin / instructor / `isFree` / B2B license / B2C purchase), but the content-serving endpoints never call it. Two guard middlewares exist (`apps/api/src/middlewares/course-access.middleware.ts`) but are **dead code**. `videoPlaybackUrl` is the **unsigned** Cloudflare HLS manifest (`services/transcoding/providers/cloudflare-stream.provider.ts:92` → `result.playback.hls`), so a leaked URL plays directly.

## Confirmed findings (verified against code)
1. **CRITICAL** `getLesson` — `courses/controller.ts:725`, route `courses/routes.ts:211` (`optionalAuthenticate`). Returns `videoUrl/videoId/videoPlaybackUrl/transcript/description` after only a PUBLISHED check (controller.ts:785-791).
2. **CRITICAL** `listLessons` — `courses/controller.ts:~686` (mapping 699-715), route `courses/routes.ts:189` (`optionalAuthenticate`). Same media fields for every lesson in the chapter.
3. **CRITICAL** `getCourse` — `courses/controller.ts:174` (lesson mapping 242-260), route `courses/routes.ts:116` (`optionalAuthenticate`). Embeds media URLs for all lessons; also the lesson-ID enumeration source.
4. **CRITICAL** `getFileInfo` IDOR — `uploads/controller.ts:253`, route `uploads/index.ts` `GET /*key` (`authenticate` only). Discards the user, signs a URL for any key. Also audit `DELETE /*key` (`deleteFile`).
5. **HIGH** lesson-content GET handlers — `lesson-content/controller.ts` `getLessonContentByLang`/`listLessonContents`, routes `lesson-content/routes.ts:25,35`. Role-gated (`requireRole(INSTRUCTOR,…)`) but no ownership check (mutating handlers use `canManageLessonContent`).

## Design — secure-by-default

**Principle:** the lesson serializer must emit playable media ONLY when explicitly told the viewer is entitled. Default output = metadata only. An accidental omission then leaks nothing.

### Layer 1 — media-gating serializer (the core)
New helper in `apps/api/src/utils/course-access.ts` (or a `courses/serializers.ts`):

```ts
// The fields that must never leak to non-entitled viewers:
const GATED_LESSON_FIELDS = ['videoUrl','videoId','videoPlaybackUrl','transcript','videoSourceKey'] as const;

interface LessonView { /* metadata always safe */ id; title; type; duration; position; isFree;
  requiresPrevious?; videoThumbnailUrl?; transcodingStatus?; description?; /* gated fields optional */ }

/** Returns the safe view; includes gated media only when entitled. */
export function gateLessonMedia(localized, lesson, opts: { hasAccess: boolean }): LessonView {
  const base = { id, title, type, duration, position, isFree, videoThumbnailUrl, transcodingStatus, ... };
  const entitled = opts.hasAccess || lesson.isFree;
  if (!entitled) return base;                 // metadata only
  return { ...base, videoUrl, videoId, videoPlaybackUrl, transcript, description };
}
```
Notes:
- Decide whether `description` is gated (probably NOT — keep it as marketing copy; confirm with the existing UX). Keep `videoThumbnailUrl` ungated (poster image is fine).
- Compute `hasAccess` ONCE per request via `checkCourseAccess(user, courseId)` and pass the boolean down to every lesson of that course (don't call per-lesson).

### Layer 2 — wire it into the 3 endpoints
- `getCourse` (controller.ts:242-260): compute `const { hasAccess } = await checkCourseAccess(user, course.id)` once, map lessons through `gateLessonMedia(localized, lesson, { hasAccess })`.
- `listLessons` (699-715): compute access for the parent `courseId` once, map through the helper.
- `getLesson` (785-791): use `checkCourseAccessFromLesson(user, id)` (handles `isFree` + resolves courseId), then `gateLessonMedia`.
- These stay **partial responses** (structure visible, media hidden) — NOT a 403 — so non-buyers still see the course to convert. Do NOT use the blocking middleware here.

### Layer 3 — blocking guards where it's all-or-nothing
- `GET /uploads/*key` (`getFileInfo`): resolve key → entitlement. Approach: look up `LessonContent` where `videoSourceKey = key` (or document key) → lesson → chapter → course → `checkCourseAccess`. If no owning resource found, restrict to uploader/instructor/admin (reuse the `canUpload` role check). Deny otherwise.
- `DELETE /uploads/*key` (`deleteFile`): must be uploader/instructor/admin only — verify and lock down.
- lesson-content GET handlers (#5): apply the existing `canManageLessonContent(user, lessonId)` ownership check that the create/update/delete handlers already use.

## Execution order
1. `gateLessonMedia` helper + unit tests (entitled → full; not entitled + paid → metadata only; `isFree` → full). 
2. Wire into `getCourse`, `listLessons`, `getLesson`. Add controller tests: anonymous/non-purchaser gets NO `videoPlaybackUrl`; purchaser/instructor/admin/`isFree` DOES.
3. Lock `GET /uploads/*key` + audit `DELETE /*key` + tests (non-owner learner denied; owner/instructor allowed).
4. Ownership check on lesson-content GET handlers + test.
5. (Optional, same PR or follow-up) wire `requireLessonAccessMiddleware`/`requireCourseAccessMiddleware` onto any dedicated content/streaming endpoints that SHOULD 403 (not the browse endpoints).

## Defense-in-depth (separate backlog item, not blocking)
Enable Cloudflare Stream **signed URLs** (`requireSignedURLs: true` on upload + sign a short-lived token when serving `videoPlaybackUrl`). Then a leaked URL expires. Bigger change (signing on serve) — track separately.

## Verification
- `rtk proxy npx vitest run --reporter=dot` (raw output — RTK masks suite-level failures).
- `npx nx typecheck api` + `npx nx test api`.
- Manual: as a fresh LEARNER with no purchase, `GET /api/v1/courses/<id>`, `/lessons/<id>`, `/uploads/<videoSourceKey>` → confirm no playable URL / signed URL returned.

## Watch out
- Don't break the demo: it has real seeded `Purchase` rows → `checkCourseAccess` returns true → media included. Verify a demo session still sees videos.
- Don't break instructor preview / course builder (they need media): instructor ownership + admin already return `hasAccess`.
- `getCourse` is hot (course detail page) — compute access once, avoid N+1 (single `checkCourseAccess`, not per-lesson).

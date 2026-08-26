# Project Rules & Communication Guidelines

## Mandatory Response & Summary Protocol
1. **Always Swedish:** All communications, status updates, and session recaps must be in Swedish.
2. **Raw Markdown Block Requirement for Recaps:** Whenever a recap, summary, list of outstanding tasks, or review of new ideas is requested, it MUST be wrapped inside a single copyable ` ```markdown ... ``` ` block without raw file URL links (`file:///...`), focusing solely on the actual site changes, functionality, and outstanding items (no git/terminal command boilerplate). Never format the recap as loose rendered HTML/chat text that loses its Markdown syntax on copy-paste.
3. **New Ideas Policy:** New ideas must always be presented in a dedicated section and explicitly require user approval ("OK") before being added to `band-website-spec_1.md`.
4. **Continuous Help Page Synchronization:** Whenever functionality, admin routes, settings, or workflows are added, modified, moved, or removed, the band manual on the help page ([app/pages/admin/help.vue](file:///c:/Vue%20projects/DetSjundeGunget/app/pages/admin/help.vue)) MUST always be updated in the same step.
5. **Explicit Git Push Only:** NEVER commit or push to git automatically. Only execute `git commit` or `git push` when the user explicitly requests it (e.g. "pusha till git", "push it").

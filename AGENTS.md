<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Totem Burger

## Rules

- Menu content (categories, dishes, prices, photos) lives in the database and is edited through the PIN-gated `/menu` panel. Never hardcode menu items in app code, and never re-add a static product list.
- The staff access cookie's `secure`/`sameSite`/`partitioned` flags must be decided from browser-side signals (secure context, top-level vs iframe) and passed to the server when the session is written. The app runs both inside the preview iframe (https) and standalone on a tablet (often plain http), so fixed flags break the PIN unlock.
- Writes to orders and menu go through server functions that re-check the staff session; public pages may only read. Route photo uploads through the privileged storage helper so the photo bucket can stay private.
- Keep the kiosk, kitchen and customer display on the same live menu/orders queries (TanStack Query + realtime) so edits show up without reloading.
- Test the app by clicking the real UI only after the page is interactive: clicks issued before hydration are silently dropped, which looks like a broken button but isn't.

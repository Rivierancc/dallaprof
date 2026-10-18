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
- Kiosk orders are created as `awaiting_payment` and only reach the kitchen after staff confirm cash/card payment on `/cassa`; why: unpaid orders must never be cooked.
- Customer browser preferences and fullscreen are shared through the root CustomerProvider; why: language and order type must survive navigation without SSR storage reads.
- Order confirmation reads actual payment status and starts its reset countdown only after staff confirmation; why: choosing a payment method is not proof of payment.
- Kiosk exit code is only a local fullscreen control and never authorizes staff data operations; why: fullscreen is not a security boundary.
- Epson printing is done from the till/kitchen browser on the local network (ePOS-Print), config stored per device; why: the printer is not reachable from the server.

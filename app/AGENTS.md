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

Use a manifest-only installable home-screen setup with the uploaded GLOWGURU artwork in public/ and head links in the root route; no app-shell service worker is needed because offline use was not requested.
- Рабочее место (раздел, клиентка, вкладка, фильтры, открытая карточка, прокрутка) хранится через src/lib/ui-state.ts в localStorage (только ID) — iOS выгружает вкладки; повторные события входа того же пользователя игнорируются, чтобы не сбрасывать экраны.
- Черновики карточек косметики хранятся отдельно от рабочего места: текст локально по ID пользователя, фотографии в IndexedDB; так изображения не исчерпывают квоту localStorage на iPhone.
- Незавершённые настройки этапов редактора ухода сохраняются локально по ID шага; это позволяет продолжить после выгрузки Safari без публикации незавершённой схемы.

# AutoScreenShareControl (Vencord UserPlugin)

Плагин для **Vencord**, который:

- автоматически выключает демонстрацию экрана, если в ваш текущий voice-канал заходит пользователь **не из whitelist**;
- автоматически включает демонстрацию обратно, когда все не-whitelist пользователи выходят (если плагин выключал её сам).

## Где лежит код

- `src/userplugins/autoScreenShareControl/index.ts`

## Как включить в Vencord

1. Откройте ваш локальный репозиторий Vencord.
2. Скопируйте папку `src/userplugins/autoScreenShareControl` в `src/userplugins/` вашего Vencord.
3. Соберите Vencord (обычно `pnpm build` или ваш стандартный скрипт сборки).
4. Перезапустите Discord/Vesktop с вашей сборкой Vencord.
5. Откройте настройки Vencord → Plugins → `AutoScreenShareControl` и включите плагин.
6. В настройке `Whitelist User ID через запятую` добавьте ID пользователей, которым можно заходить в канал без авто-отключения демонстрации.

## Важно

Vencord и Discord могут менять внутренние модули; при крупных обновлениях может потребоваться адаптация плагина.

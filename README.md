# Night Arcade

### Full-stack Telegram Mini App · React · Fastify · PostgreSQL

Мобильная аркада с внутренними игровыми очками: вход через Telegram, игровые раунды,
ежедневные награды и история операций. Репозиторий показывает полный путь от React-интерфейса
до серверных правил, транзакций базы данных и проверки результата в браузере.

[Инженерный разбор](docs/CASE_STUDY.md) · [Запуск](#локальный-запуск) · [Проверки](#проверки) · [Границы версии](#границы-текущей-версии)

**Статус:** функциональный прототип. `STARS` здесь — внутренняя единица учёта игровых очков,
а не платёжная интеграция Telegram Stars. Покупки, депозиты, вывод средств и криптопереводы
в проекте не реализованы.

## Что реализовано

| Сценарий                | Реализация                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Вход через Telegram     | Серверная проверка HMAC-подписи и срока действия `initData`, создание пользователя и стартового баланса |
| Баланс и история        | PostgreSQL, Prisma, транзакционный снимок баланса и append-only журнал операций                         |
| Coin Flip и Pocket Pool | Серверный расчёт результата, атомарное списание и начисление, идемпотентный повтор запроса              |
| Daily Freebie           | Одна награда на пользователя за UTC-день, состояния `LOCKED` / `AVAILABLE` / `CLAIMED`                  |
| Проверка раунда         | SHA-256 commitment, HMAC-SHA256 и локальный пересчёт результата через Web Crypto                        |
| Мобильный интерфейс     | Telegram theme / safe-area, переходы между экранами, учёт reduced motion, Canvas/Matter.js-анимация     |
| PvP-раздел              | Демонстрационный матч против Arcade Bot и история матчей                                                |

## Архитектура

```text
Telegram WebView
    │  React / Vite / TanStack Query / Zustand
    │  Authorization: tma <initData>
    ▼
Fastify API
    ├── Проверка Telegram-подписи и Zod-контрактов
    ├── Users / Wallet / Games / Daily Reward / Fairness / PvP demo
    └── Prisma → PostgreSQL
                    ├── Wallet: текущий баланс
                    ├── LedgerEntry: история операций
                    └── GameRound / DailyReward / ProvablyFairSeed / PvpRoom

packages/shared: общие TypeScript-типы и Zod-схемы клиента и API
Redis: клиент и конфигурация подготовлены для дальнейшего развития
```

### Решения, которые стоит посмотреть в коде

- **Идентичность на сервере.** API получает пользователя из подписанного Telegram payload.
  [Проверка подписи](apps/api/src/modules/auth/telegram-init-data.ts) использует `timingSafeEqual`
  и проверяет свежесть `auth_date`.
- **Целостность баланса.** [Игровой сервис](apps/api/src/modules/games/games.service.ts)
  объединяет списание, результат, начисление и журнал в serializable-транзакцию.
  Для конфликтов сериализации предусмотрено до трёх попыток.
- **Повторяемые запросы.** Уникальный `Idempotency-Key` связывает запрос с сохранённым результатом.
  [API-клиент](apps/web/src/lib/api-client.ts) выполняет один сетевой повтор для GET и запросов
  с таким ключом.
- **История на уровне БД.** [Начальная миграция](apps/api/prisma/migrations/20260829000000_foundation/migration.sql)
  задаёт ограничения баланса и триггер, запрещающий `UPDATE` / `DELETE` записей ledger.
- **Проверяемый расчёт.** [Сервер](apps/api/src/modules/fairness/fairness.service.ts)
  раскрывает seed завершённого раунда; [браузерный verifier](apps/web/src/features/fairness/verify-fairness.ts)
  пересчитывает hash, HMAC, числовое значение и исход. Границы этой проверки описаны в кейсе.

## Структура

```text
apps/web/          React-клиент, игровые экраны, визуализация, browser verifier
apps/api/          Fastify API, доменные сервисы, Prisma schema и миграции
packages/shared/   DTO, TypeScript-типы и Zod-контракты
docs/              Инженерный кейс и границы реализации
docker-compose.yml Конфигурация PostgreSQL, Redis, API и web
```

## Локальный запуск

Основной сценарий ниже рассчитан на Windows x64: этот target указан в
`pnpm-workspace.yaml`. Для Linux/macOS потребуется отдельно проверить настройки платформы
и нативные зависимости; наличие Dockerfile само по себе такую проверку не заменяет.

Проверенное окружение: Node.js **22.17.0**, **pnpm 11.19.0** из поля `packageManager` и Git.
Для локальных PostgreSQL / Redis нужен доступный Docker Desktop.

```powershell
git clone https://github.com/arar228/potato.git
cd potato
pnpm --version
pnpm install --frozen-lockfile
Copy-Item .env.example .env
```

Заполните `.env` локально. Для настоящего входа понадобится токен собственного тестового
бота из BotFather; храните его только на серверной стороне. Содержимое `.env` исключено из Git.

```powershell
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Web: `http://localhost:5173`; API: `http://localhost:3000`; базовая проверка процесса:
`GET http://localhost:3000/health`. Seed создаёт конфигурации двух игр и демонстрационных
пользователей. Миграции и seed выполняйте в отдельной локальной БД.

Для входа из Telegram опубликуйте web и API по HTTPS, настройте Mini App / Menu Button
в BotFather и задайте точный `WEB_APP_URL` для CORS. Браузер без Telegram может показать
интерфейс, но защищённым API-маршрутам требуется корректно подписанный `initData`.

### Переменные окружения

| Переменная                      | Назначение                                                       |
| ------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`                  | Строка подключения PostgreSQL                                    |
| `REDIS_URL`                     | Адрес Redis-клиента; текущие доменные сценарии его не используют |
| `TELEGRAM_BOT_TOKEN`            | Серверный токен для проверки Telegram `initData`                 |
| `TELEGRAM_AUTH_MAX_AGE_SECONDS` | Допустимый возраст авторизации                                   |
| `WEB_APP_URL`                   | Разрешённый web-origin для CORS                                  |
| `API_URL`                       | Адрес API в конфигурации окружения и Docker build                |
| `VITE_API_URL`                  | Публичный адрес API для сборки web-клиента                       |
| `INITIAL_BALANCE`               | Стартовый баланс внутренних очков; по умолчанию 500              |

Vite читает свои env-файлы из `apps/web`. При локальном запуске текущий Vite proxy
направляет `/api` на порт 3000. Для отдельного API-origin при сборке передайте
`VITE_API_URL` как переменную окружения процесса сборки либо через локальный env-файл
в `apps/web`; файл `.env` в корне прежде всего читает API.

### Просмотр интерфейса с демонстрационными данными

После установки зависимостей можно отдельно запустить клиент:

```powershell
pnpm --filter @night-arcade/web dev
```

В development-сборке некоторые экраны поддерживают query-параметр `?motionPreview`.
Например, `/solo/coin-flip?motionPreview` демонстрирует экран Coin Flip. Это визуальный
preview с демонстрационными данными, а не подтверждение сквозной работы API или Telegram-входа.

## Проверки

Следующие команды запускаются из корня. Генерация Prisma Client создаёт локальные файлы
типов и клиента; подключения к БД для неё и текущих unit-тестов не требуется.

```powershell
pnpm install --frozen-lockfile
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Тесты охватывают Telegram-подпись и срок действия, стартовый баланс, wallet / ledger,
игровые операции, повтор запроса, ежедневную награду и криптографический verifier.
Сервисные тесты используют in-memory подмены Prisma. Они проверяют доменную логику;
изоляция реальных PostgreSQL-транзакций и гонки конкурентных запросов требуют
отдельного интеграционного набора.

Дополнительная проверка форматирования: `pnpm format:check`.
Результаты локальной проверки и её границы зафиксированы в [инженерном кейсе](docs/CASE_STUDY.md#проверка-воспроизводимости).

## API

Все маршруты `/api/v1/*` требуют `Authorization: tma <initData>`.
Изменяющие баланс операции используют заголовок `Idempotency-Key`.

| Метод      | Маршрут                                               | Сценарий                          |
| ---------- | ----------------------------------------------------- | --------------------------------- |
| GET        | `/api/v1/me`                                          | Пользователь и баланс             |
| GET        | `/api/v1/wallet`                                      | Текущий wallet                    |
| GET        | `/api/v1/ledger?limit=30&cursor=<uuid>`               | История с cursor-пагинацией       |
| GET        | `/api/v1/games`                                       | Активные игры и конфигурации      |
| POST       | `/api/v1/games/coinflip/play`                         | Раунд Coin Flip                   |
| POST       | `/api/v1/games/pool/play`                             | Раунд Pocket Pool                 |
| GET / POST | `/api/v1/daily-reward` / `/api/v1/daily-reward/claim` | Статус / получение награды        |
| GET / POST | `/api/v1/pvp/rooms` / `/api/v1/pvp/match/demo`        | История / матч с ботом            |
| GET        | `/api/v1/fairness/commitment/:gameType`               | Commitment для игры               |
| GET        | `/api/v1/fairness/:roundId`                           | Данные для проверки своего раунда |
| GET        | `/health`                                             | Публичный статус процесса         |

Ошибки возвращаются в формате `{ code, message, requestId }`.
На API настроены Helmet, CORS allowlist, Zod-валидация, request IDs и rate limit.

## Границы текущей версии

- **Режим продукта:** прототип с внутренними очками. Нагрузочные показатели,
  эксплуатационные SLO и независимый security-аудит в репозитории не подтверждены.
- **PvP:** текущий соперник — Arcade Bot. Реальный мультиплеер, Socket.IO и распределённая
  state machine ещё не реализованы.
- **Daily Freebie:** в production флаг `DAILY_TASK` остаётся незавершённым. Получение
  награды блокируется до подключения реального провайдера выполнения задания.
- **Fairness:** браузер проверяет согласованность предоставленного proof. Привязка раунда
  к предварительно сохранённому клиентом commitment и полный adversarial-аудит остаются задачами развития.
- **Инфраструктура:** rate limit работает в памяти процесса, Redis подготовлен для будущих
  сценариев. `/health` сообщает статус процесса и не проверяет готовность PostgreSQL / Redis.
- **Проверки:** живые PostgreSQL-конкурентные тесты, mobile E2E и автоматизированный CI
  ещё предстоит добавить. Docker/Linux-сборка требует отдельной валидации текущего workspace.

Ближайший инженерный шаг — интеграционный набор для ledger и конкурентных повторов,
затем воспроизводимый CI и сквозной Telegram smoke-test. Подробнее: [разбор решений и следующего этапа](docs/CASE_STUDY.md).

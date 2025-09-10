Базовая информация 
	•	Базовый URL (dev): http://localhost:3000	•	Формат запросов/ответов: JSON	•	Стандарты ошибок: единый формат
	▪	Пример ошибки:
{
"error": {
"code": "FULL_SESSION",
"message": "Session is full",
"path": "/bookings",
"timestamp": "2025-09-10T12:34:56.000Z"
}
}	•	Статусы:
	▪	2xx — успешно	▪	4xx — ошибка клиента (валидация/права/бизнес-логика)	▪	5xx — внутренняя ошибка	•	CORS:
	▪	В деве разрешён http://localhost:3000 (Next.js)	▪	Включены credentials для работы cookie с refresh	•	Аутентификация:
	▪	Authorization: Bearer <accessToken> для защищённых эндпоинтов	▪	Refresh-токен:
	◦	Web: httpOnly cookie refresh_token (выдаётся/обновляется на /auth/login и /auth/refresh)	◦	Mobile/Desktop/TG: refreshToken также дублируется в теле ответа (можно хранить безопасно на клиенте)
Модели (упрощённо)
	•	User: { id, email, name, role }	•	Coach: { id, name, bio?, avatarUrl? }	•	ClassType: { id, title, description?, durationMinutes, intensity: 'LOW'|'MEDIUM'|'HIGH' }	•	ClassSession: { id, classTypeId, coachId, startsAt, capacity, price, classType, coach }	•	Booking: { id, userId, sessionId, status: 'BOOKED'|'CANCELLED', createdAt, session }	•	WaitlistEntry (если включено): { id, userId, sessionId, status: 'PENDING'|'PROMOTED'|'CANCELLED', position, createdAt }
Индексы/ограничения:
	•	Booking: @@unique([userId, sessionId]) — нельзя дважды забронировать одну сессию	•	ClassSession.capacity — максимальное число активных BOOKED
Аутентификация
	•	POST /auth/register
	▪	Тело: { email, password, name }	▪	Ответ 201: { user: { id, email, name, role, createdAt } }	▪	Валидация: email — валидный, password — минимум 8 символов	▪	Ошибки:
	◦	400 EMAIL_EXISTS — Email already registered	•	POST /auth/login
	▪	Тело: { email, password }	▪	Ответ 200: { accessToken, refreshToken }
	◦	Также в ответе устанавливается httpOnly cookie refresh_token	▪	Ошибки:
	◦	401 INVALID_CREDENTIALS	•	POST /auth/refresh
	▪	Тело: { refreshToken } — для Mobile/Desktop/TG
	◦	Для Web можно положиться на cookie refresh_token и передавать пустое тело, если реализовано чтение из cookie на бэке (по умолчанию ожидаем тело)	▪	Ответ 200: { accessToken, refreshToken }
	◦	Кука refresh_token обновляется	▪	Ошибки:
	◦	401 INVALID_REFRESH_TOKEN	•	POST /auth/logout
	▪	Очищает refresh_cookie	▪	Ответ 200: { ok: true }
Примечания для фронта:
	•	Access храните в памяти и/или хранилище клиента, используйте Bearer для запросов.	•	При 401 на защищённом эндпоинте инициируйте обновление токена через /auth/refresh.	•	Для Web:
	▪	Кросс-доменные запросы с credentials: include, чтобы получались/отправлялись cookie.
Каталоги (публичные)
	•	GET /catalog/class-types
	▪	Ответ 200: ClassType[]	•	GET /catalog/coaches
	▪	Ответ 200: Coach[]
Расписание
	•	GET /sessions
	▪	Параметры query:
	◦	date: YYYY-MM-DD — опционально (фильтр на день, UTC-диапазон 00:00–23:59)	◦	classTypeId?: string	◦	coachId?: string	◦	page?: number (по умолчанию 1)	◦	limit?: number (по умолчанию 20, максимум 100)	▪	Ответ 200:
{
items: Array<{
id, startsAt, capacity, price,
classType: { id, title, durationMinutes, intensity },
coach: { id, name }
}>,
total: number,
page: number,
limit: number
}	•	GET /sessions/:id
	▪	Ответ 200:
{
id, startsAt, capacity, price,
classType: {...},
coach: {...},
bookings: Booking[] // может быть опционально скрыто от пользователя — по требованиям
}	▪	404 NOT_FOUND — если сессия не существует
Примечания для фронта:
	•	Для списка используйте пагинацию по page/limit.	•	Для фильтров применяйте debounce и React Query для кэша.
Бронирования (защищённые, Authorization: Bearer)
	•	GET /bookings/my?page=&limit=
	▪	Ответ 200:
{
items: Array<{
id, status, createdAt,
session: {
id, startsAt, capacity, price,
classType: { id, title, intensity, durationMinutes },
coach: { id, name }
}
}>,
total, page, limit
}	•	POST /bookings
	▪	Тело: { sessionId: string }	▪	Ответ 201: Booking (включая session с вложенными сущностями)	▪	Ошибки:
	◦	400 ALREADY_BOOKED — уже есть активная бронь на эту сессию	◦	400 FULL_SESSION — мест нет (см. Waitlist ниже)	◦	404 NOT_FOUND — сессия не найдена	•	POST /bookings/:id/cancel
	▪	Ответ 200: { ok: true }	▪	Ошибки:
	◦	403 FORBIDDEN — не владелец и не ADMIN	◦	404 NOT_FOUND — если бронь не существует (идемпотентно можно возвращать ok: true)
UX-подсказки:
	•	После успешной брони инвалируйте кэш запросов списка сессий и «моих броней».	•	При FULL_SESSION предложите «Встать в очередь» (см. ниже).
Очередь (если включена)
	•	POST /waitlist
	▪	Тело: { sessionId: string }	▪	Ответ 200: WaitlistEntry	▪	Ошибки:
	◦	400 ALREADY_BOOKED — если уже есть активная бронь	◦	200 (идемпотентно) — если уже стоите в очереди	•	GET /waitlist/my
	▪	Ответ 200: Array<WaitlistEntry> (обычно только PENDING интересны)	•	POST /waitlist/:id/cancel
	▪	Ответ 200: { ok: true }
Автоматическое продвижение:
	•	После отмены чьей-то брони или увеличения capacity бэкенд в транзакции:
	▪	Проверит свободное место	▪	Выберет следующего PENDING из очереди (минимальный position/createdAt)	▪	Создаст Booking и обновит WaitlistEntry → PROMOTED
Примечания:
	•	Если пользователь уже успел забронировать самостоятельно, запись в очереди будет отменена, и продвинется следующий.
Конвенции по ошибкам и коды для фронта
Чаще всего фронт должен различать:
	•	INVALID_CREDENTIALS — неверный email/пароль на /auth/login	•	INVALID_REFRESH_TOKEN — /auth/refresh	•	EMAIL_EXISTS — повторная регистрация	•	NOT_FOUND — ресурс не найден (сессия/бронь)	•	FORBIDDEN — доступ запрещён	•	FULL_SESSION — нет мест на сессию	•	ALREADY_BOOKED — повторная попытка брони той же сессии
Фронт может ориентироваться на поле error.code и показывать соответствующие сообщения/диалоги.
Формат цен и времени
	•	Цена: поле price — Decimal (на стороне клиента рекомендуется хранить/форматировать локально)	•	Время: startsAt — ISO-строка в UTC. В клиенте отображайте с учётом локали/часового пояса.
Аутентификация для разных клиентов
	•	Web:
	▪	accessToken хранить в памяти; refresh — httpOnly cookie (credentials: 'include' на запросах /auth/login, /auth/refresh, /auth/logout)	▪	при 401 повторять запрос после успешного refresh	•	React Native / Electron:
	▪	использовать refreshToken из тела ответа, хранить в безопасном хранилище	•	Telegram Mini App:
	▪	верифицировать initData на бэке и обменивать на JWT (в отдельном эндпоинте /auth/telegram — опционально)	▪	после обмена использовать JWT как Web/Mobile
Примеры запросов (curl)
	•	Регистрация:
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"email":"u@test.com","password":"Passw0rd!","name":"User"}'	•	Логин:
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"u@test.com","password":"Passw0rd!"}' -c cookies.txt	•	Список типов:
curl http://localhost:3000/catalog/class-types	•	Сессии:
curl "http://localhost:3000/sessions?date=2025-09-10&page=1&limit=20"	•	Бронь:
curl -X POST http://localhost:3000/bookings -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"sessionId":"<id>"}'	•	Мои брони:
curl http://localhost:3000/bookings/my -H "Authorization: Bearer <accessToken>"	•	Отмена:
curl -X POST http://localhost:3000/bookings/<bookingId>/cancel -H "Authorization: Bearer <accessToken>"
Переменные окружения (dev)
	•	DATABASE_URL=postgresql://app:app@localhost:5432/fitness?schema=public	•	JWT_SECRET=<генерируйте случайную длинную строку>	•	ACCESS_TOKEN_TTL=15m	•	REFRESH_TOKEN_TTL=30d	•	COOKIE_DOMAIN=localhost	•	PORT=3000
Локальный запуск (кратко)
	•	Docker (Postgres):
	▪	docker compose up -d	•	Миграции и сиды:
	▪	npx prisma generate	▪	npx prisma migrate dev --name init	▪	npx prisma db seed	•	Запуск API:
	▪	npm run start:dev	•	Документация:
	▪	http://localhost:3000/docs	•	Просмотр БД:
	▪	npx prisma studio

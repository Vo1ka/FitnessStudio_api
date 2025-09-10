Базовая информация
•	Базовый URL (dev): http://localhost:3000 	<br/>
•	Формат запросов/ответов: JSON 	 <br/>
•	Стандарты ошибок (единый формат): <br/>
- Пример:<br/>
 {<br/>
    "error": {<br/>
        "code": "FULL_SESSION",<br/>
        "message": "Session is full",<br/>
        "path": "/bookings",<br/>
        "timestamp": "2025-09-10T12:34:56.000Z"<br/>
    }<br/>
}<br/>
  	•	Статусы:<br/>
- 2xx — успех<br/>
- 4xx — ошибка клиента (валидация/права/бизнес-логика)<br/>
- 5xx — внутренняя ошибка 	<br/>
<br/>
•	CORS:<br/>
- В деве разрешён http://localhost:3000 (Next.js)<br/>
- credentials: true для работы httpOnly cookie (refresh) <br/>
<br/>
•	Аутентификация:<br/>
- Authorization: Bearer <accessToken> для защищённых эндпоинтов<br/>
- Refresh-токен:<br/>
	▪	Web: httpOnly cookie refresh_token (выдаётся/обновляется на /auth/login и /auth/refresh)<br/>
	▪	Mobile/Desktop/TG: refreshToken дублируется в теле ответа (хранить безопасно на клиенте)<br/>
 <br/>
Модели (упрощённо)<br/>
	•	User: { id, email, name, role }<br/>
•	Coach: { id, name, bio?, avatarUrl? } 	<br/>
•	ClassType: { id, title, description?, durationMinutes, intensity: 'LOW'|'MEDIUM'|'HIGH' }<br/>
 	•	ClassSession: { id, classTypeId, coachId, startsAt, capacity, price, classType, coach }<br/>
  •	Booking: { id, userId, sessionId, status: 'BOOKED'|'CANCELLED', createdAt, session } <br/>
  •	WaitlistEntry (если включено): { id, userId, sessionId, status: 'PENDING'|'PROMOTED'|'CANCELLED', position, createdAt }<br/>
  <br/>
Индексы/ограничения:<br/>
	•	Booking: @@unique([userId, sessionId]) — нельзя дважды забронировать одну сессию 	<br/>
 •	ClassSession.capacity — максимальное число активных BOOKED<br/>
 <br/>
Аутентификация<br/>
	•	POST /auth/register<br/>
- Тело: { email, password, name }<br/>
<br/>
- 201:<br/>
 { "user": { "id": "...", "email": "...", "name": "...", "role": "USER", "createdAt": "..." } }
<br/>
 <br/>
 - Ошибки:<br/>
    - 400 EMAIL_EXISTS — Email already registered<br/>
 	•	POST /auth/login<br/>
- Тело: { email, password }<br/>
- 200:<br/>
 { "accessToken": "...", "refreshToken": "..." }<br/>
 Также устанавливается httpOnly cookie refresh_token<br/>
- Ошибки:<br/>
	▪	401 INVALID_CREDENTIALS 	<br/>
 •	POST /auth/refresh<br/>
 <br/>
- Тело: { refreshToken } — для Mobile/Desktop/TG<br/>
	▪	Для Web можно полагаться на cookie refresh_token (по желанию реализуется чтение из cookie на бэке)<br/>
- 200:<br/>
 { "accessToken": "...", "refreshToken": "..." }<br/>
 Кука refresh_token обновляется<br/>
- Ошибки:<br/>
	▪	401 INVALID_REFRESH_TOKEN
<br/>•	POST /auth/logout<br/>
- Очищает refresh_cookie<br/>
- 200: ⁠{ "ok": true }<br/>
<br/>
Подсказки фронту:<br/>
	•	Access хранить в памяти/secure storage; использовать Bearer для запросов. 	<br/>
 •	При 401 на защищённых ручках — рефрешить токен и повторить запрос. <br/>
 •	Web: fetch с credentials: 'include' для /auth/login, /auth/refresh, /auth/logout.<br/>
 <br/>
Каталоги (публичные)
<br/>
	•	GET /catalog/class-types<br/>
 
- 200: ⁠ClassType[]<br/>
- 	•	GET /catalog/coaches<br/>
- 200: ⁠Coach[]<br/>
<br/>
Расписание<br/>
	•	GET /sessions<br/>
- Query:
	▪	date: YYYY-MM-DD (опционально, UTC 00:00–23:59) 	<br/>
 ▪	classTypeId?: string<br/>
▪	coachId?: string<br/>
▪	page?: number (по умолчанию 1)<br/>
	▪	limit?: number (по умолчанию 20, максимум 100)<br/>
- 200:<br/>
 {<br/>
    "items": [<br/>
        {<br/>
            "id": "...",<br/>
            "startsAt": "...",<br/>
            "capacity": 12,<br/>
            "price": 12.5,<br/>
            "classType": { "id":"...","title":"...","durationMinutes":60,"intensity":"LOW" },<br/>
            "coach": { "id":"...","name":"..." }<br/>
        }<br/>
    ],<br/>
    "total": 42,<br/>
    "page": 1,<br/>
    "limit": 20<br/>
}<br/>
  	•	GET /sessions/:id<br/>
- 200:<br/>
 {<br/>
    "id":"...","startsAt":"...","capacity":12,"price":12.5,<br/>
    "classType":{...},"coach":{...},"bookings":[ ... ] // по требованиям<br/>
}<br/>
 <br/>
 - 404 NOT_FOUND — если сессия не существует<br/>
 Бронирования (защищённые)<br/>
	•	GET /bookings/my?page=&limit=<br/>
- 200:<br/>
 {<br/>
    "items": [<br/>
        {<br/>
            "id":"...","status":"BOOKED","createdAt":"...",<br/>
            "session":{<br/>
                "id":"...","startsAt":"...","capacity":12,"price":12.5,<br/>
                "classType":{"id":"...","title":"...","intensity":"LOW","durationMinutes":60},<br/>
                "coach":{"id":"...","name":"..."}<br/>
            }<br/>
        }<br/>
    ],<br/>
    "total": 3,<br/>
    "page": 1,<br/>
    "limit": 20<br/>
}<br/>
  	•	POST /bookings<br/>
- Тело: { sessionId: string }<br/>
- 201: ⁠Booking (включая session)<br/>
- Ошибки:<br/>
	▪	400 ALREADY_BOOKED — уже есть активная бронь на эту сессию<br/>
▪	400 FULL_SESSION — мест нет (см. Waitlist)<br/>
▪	404 NOT_FOUND — сессия не найдена<br/>
	•	POST /bookings/:id/cancel<br/>
- 200: ⁠{ "ok": true }<br/>
- Ошибки:<br/>
	▪	403 FORBIDDEN — не владелец и не ADMIN<br/>
 ▪	404 NOT_FOUND — идемпотентно можно возвращать ⁠{ "ok": true }<br/>
 <br/>
UX-подсказки:
	•	После успешной брони/отмены — инвалидуйте кэш списков сессий и «моих броней».<br/>
	•	При FULL_SESSION — предложите «Join waitlist».<br/>
Очередь (если включена)<br/>
	•	POST /waitlist<br/>
- Тело: { sessionId: string }<br/>
- 200: ⁠WaitlistEntry<br/>
- Ошибки:<br/>
	▪	400 ALREADY_BOOKED — если уже есть активная бронь<br/>
▪	Идемпотентно — если уже в очереди, вернёт текущую запись 	<br/>
•	GET /waitlist/my<br/>
- 200: ⁠WaitlistEntry[] (обычно интересны PENDING)<br/>
- •	POST /waitlist/:id/cancel<br/>
- 200: ⁠{ "ok": true }<br/>
Автопродвижение:<br/>
<br/>
	•	При отмене чьей-то брони или увеличении capacity бэкенд в транзакции:<br/>
- Проверяет свободное место<br/>
- Берёт следующего PENDING (минимальный position/createdAt)<br/>
- Создаёт Booking и помечает WaitlistEntry → PROMOTED<br/>
Коды ошибок для фронта<br/>
	•	INVALID_CREDENTIALS — неверный email/пароль
<br/>•	INVALID_REFRESH_TOKEN — некорректный/просроченный refresh 	<br/>
•	EMAIL_EXISTS — повторная регистрация <br/>
•	NOT_FOUND — ресурс не найден (сессия/бронь) 	<br/>
•	FORBIDDEN — нет прав
<br/>•	FULL_SESSION — мест нет 	<br/>
•	ALREADY_BOOKED — повторная попытка брони одной сессии<br/>
Фронт ориентируется на error.code.<br/>
Формат цены и времени<br/>
	•	price — Decimal; форматируйте на клиенте
<br/>•	startsAt — ISO-строка (UTC); отображайте с учётом локали<br/>
<br/>
Аутентификация — рекомендации по клиентам<br/>
	•	Web:
<br/>
- accessToken — в памяти/хранилище<br/>
- refresh — httpOnly cookie (credentials: 'include')<br/>
- при 401 — попытка /auth/refresh, затем повтор запроса
- <br/>	•	React Native / Electron:
- refreshToken из тела ответа, хранить в безопасном хранилище
- <br/>	•	Telegram Mini App:
- верифицировать initData на бэке → обмен на JWT (отдельный /auth/telegram — по желанию)
- <br/>
- далее как Web/Mobile
- <br/>
Примеры запросов (curl)
	•	Регистрация:<br/>
⁠    curl -X POST http://localhost:3000/auth/register \ -H "Content-Type: application/json" \ -d '{"email":"u@test.com","password":"Passw0rd!","name":"User"}'<br/>
•	Логин:<br/>
⁠    curl -X POST http://localhost:3000/auth/login \ -H "Content-Type: application/json" \ -d '{"email":"u@test.com","password":"Passw0rd!"}' \ -c cookies.txt<br/>
•	Список типов:<br/>
⁠    curl http://localhost:3000/catalog/class-types<br/>
 	•	Сессии:<br/>
⁠    curl "http://localhost:3000/sessions?date=2025-09-10&page=1&limit=20"     <br/>
•	Бронь:<br/>
⁠    curl -X POST http://localhost:3000/bookings \ -H "Authorization: Bearer <accessToken>" \ -H "Content-Type: application/json" \ -d '{"sessionId":"<id>"}'<br/>
•	Мои брони:<br/>
⁠    curl http://localhost:3000/bookings/my \ -H "Authorization: Bearer <accessToken>"
•	Отмена:<br/>
⁠    curl -X POST http://localhost:3000/bookings/<bookingId>/cancel \ -H "Authorization: Bearer <accessToken>"<br/>
<br/>
Локальный запуск<br/>
	•	БД (Docker):<br/>
- ⁠docker compose up -d<br/>
- •	Миграции/клиент:<br/>
- ⁠npx prisma generate<br/>
- ⁠npx prisma migrate dev --name init<br/>
- •	Сиды:<br/>
- ⁠npx prisma db seed<br/>
- •	API:<br/>
- ⁠npm run start:dev<br/>
- •	Swagger:<br/>
- http://localhost:3000/docs<br/>
- 	•	Просмотр БД:<br/>
- ⁠npx prisma studio<br/>

## Storage-knex

### findAll(opt)

opt:
* where: `object`: k-v pairs of field / value
* whereOp: `array`: [{ column, op, value }]
* orderBy: `array`: [{ column, order: 'asc/desc' }]

## Access-Simple

Модуль для регистрации простого доступа в системе

API:

* registerLoggedUser (user): зарегистрировать вошедшего в систему пользователя
* unregisterLoggedUser (user): зарегистрировать выход пользователя из системы
* addAdmin(user): добавить пользователя к группе администраторов

## Auth-JWT

Модуль для авторизации посредством JWT

Auth-JWT API:

* encode (sessionId): закодировать идентификатор сессии в JWT, вернуть JWT  
* getTokenFromReq (req): получить из заголовка авторизации структуру { scheme: , token: } 
* check (req, res, next): миддлваре для проверки авторизации - получить токен из запроса, декодировать и проверить его, поместить в req.user.jwt, загрузить сессию в req.user.session, загрузить профиль пользователя в req.user. При ошибке продолжить с ошибкой ServerNotAllowed. 

## Auth-password

Модуль для входа в систему посредством логина и пароля

Auth-password API:

* module.login(req, res): контроллер для роута входа в систему.
* module.logout(req, res): контроллер для маршрута выхода их системы
* module.routes: определенные маршруты (/auth/login, auth/logout)

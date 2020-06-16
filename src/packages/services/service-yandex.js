import { URLSearchParams } from 'url'
import fetch, { Headers, Request } from 'node-fetch'

export const Yandex = (app) => {
  /**
   * Обменять временный код доступа на accessToken/refreshToken
   * @param code код доступа полученный от сервиса авторизации Яндекса
   * @return {Promise<SocialLogin>}
   */
  const authExchangeCodeForToken = (code) => {
    const Errors = app.exModular.services.errors
    const body = new URLSearchParams()
    body.append('grant_type', 'authorization_code')
    body.append('code', code)
    body.append('client_id', process.env.SOCIAL_YANDEX_APP)
    body.append('client_secret', process.env.SOCIAL_YANDEX_SECRET)

    const request = new Request('https://oauth.yandex.ru/token', {
      method: 'POST',
      body: body
      // headers: new Headers({
      //   'Content-Type': 'application/x-www-form-urlencoded'
      // })
    })
    return fetch(request)
      .then(response => {
        if (response.status < 200 || response.status >= 300) {
          throw new Errors.ServerGenericError(response.statusText)
        }
        return response.json()
      })
      .then((_data) => {
        return {
          tokenType: _data.token_type,
          accessToken: _data.access_token,
          expiresIn: _data.expires_in,
          refreshToken: _data.refresh_token
        }
      })
      .catch((e) => { throw e })
  }

  /**
   * Вернуть профиль пользователя от API Паспорта Яндекса
   * @param token тоен доступа Яндекса accessToken
   * @return {Promise<YandexPassportProfile>} зависит от полномочий по токену
   */
  const authGetProfile = (token) => {
    const Errors = app.exModular.services.errors
    return fetch(new Request('https://login.yandex.ru/info?format=json', {
      method: 'GET',
      headers: new Headers({ Authorization: `OAuth ${token}` })
    }))
      .then((_resp) => {
        if (_resp.status < 200 || _resp.status >= 300) {
          throw new Errors.ServerGenericError(_resp.statusText)
        }
        return _resp.json()
      })
      .catch((e) => { throw e })
  }

  return {
    authExchangeCodeForToken,
    authGetProfile
  }
}

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

  /**
   * получить список пользователей из Directory API:
   * @param token
   * @param opt: поддерживаются такие опции (переведены в camelCase):
   *   fields
   *   id
   *   departmentId
   *   recursiveDepartmentId
   *   isDismissed: true | false | ignore
   *   page
   *   perPage
   *   orgId: если есть - добавляется в заголовок
   * @return {Promise<unknown>}
   */
  const ycUsersList = (token, opt) => {
    const Errors = app.exModular.services.errors
    if (!opt) {
      opt = {}
    }

    const fields = opt.fields || 'is_robot,external_id,position,departments,org_id,' +
      'gender,created,name,about,nickname,groups,is_admin,birthday,department_id,email,' +
      'contacts,aliases,id,is_dismissed'

    const headers = new Headers({ Authorization: `OAuth ${token}`, Accept: 'application/json' })
    if (opt.orgId) {
      headers.append('X-Org-ID', opt.orgId.toString())
    }

    const url = 'https://api.directory.yandex.net' +
      '/v6/users' +
      `?fields=${fields}` +
      `${opt.id ? '&id=' + opt.id.toString() : ''}` +
      `${opt.nickname ? '&nickname=' + opt.nickname : ''}` +
      `${opt.departmentId ? '&department_id=' + opt.departmentId.toString() : ''}` +
      `${opt.recursiveDepartmentId ? '&recursive_department_id=' + opt.recursiveDepartmentId.toString() : ''}` +
      `${opt.groupId ? '&group_id=' + opt.groupId : ''}` +
      `${opt.recursiveGroupId ? '&recursive_group_id=' + opt.recursiveGroupId : ''}` +
      `${opt.isDismissed ? '&is_dismissed=' + opt.isDismissed : ''}` +
      `${opt.page ? '&page=' + opt.page : ''}` +
      `${opt.perPage ? '&per_page=' + opt.perPage : ''}`

    // console.log(url)

    return fetch(new Request(url, { method: 'GET', headers }))
      .then((_resp) => {
        if (_resp.status < 200 || _resp.status >= 300) {
          throw new Errors.ServerGenericError(`yandex.directoryUs ersList: ${_resp.statusText}`)
        }
        return _resp.json()
      })
      .then((_json) => {
        // console.log('JSON:')
        // console.log(_json)
        return _json
      })
      .catch((e) => { throw e })
  }

  /*
    Алгоритм импорта данных:
    * создаём объект DirectoryYandex. Нам нужно проверить, что пользователь,
    создающий этот объект - это администратор.
    При создании этого объекта берём авторизацию в яндексе у этого пользователя или у
    указанного при создании записи пользователя. Статус при создании - старт импорта.

    * при импорте получаем полный каталог от Яндекса: пользователи, отделы, группы, домены, организации.
    Сохраняем эти данные в объекты YCUser, YCDepartment, YCGroup, YCDomain YCOrganization.
    Также производим сохранение связей между пользователями, и отделами - в списке YCDepartmentUser,
    YCGroupUser.
  */
  const ycDirectoryImport = (directoryImport) => {
    if (!directoryImport || !directoryImport.id) {
      throw new Error('ycDirectoryImport: directoryImport param invalid - no object or no .id property')
    }

    if (!directoryImport.accessToken || !directoryImport.userId) {
      throw new Error('ycDirectoryImport: directoryImport param invalid - accessToken or user not found')
    }

    const DirectoryYandex = app.exModular.models.DirectoryYandex

    return DirectoryYandex.findById(directoryImport.id)
      .then((_directoryImport) => ycUsersList(directoryImport.accessToken, { isDismissed: 'ignore', perPage: '1000' }))
      .then((_import) => {
        console.log('RAW USERS:')
        console.log(_import)
        directoryImport.rawUsers = JSON.stringify(_import)
        directoryImport.statusMessage = 'Finised loading users'
        directoryImport.status = 'Step completed (users)'
        return DirectoryYandex.update(directoryImport.id, directoryImport)
      })
      .catch(e => { throw e })
  }

  return {
    authExchangeCodeForToken,
    authGetProfile,
    ycUsersList: ycUsersList,
    ycDirectoryImport
  }
}

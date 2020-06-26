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
   * @param token токен для доступа к yandex (accessToken)
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
  const ycUserList = (token, opt) => {
    const Errors = app.exModular.services.errors
    if (!opt) {
      opt = {}
    }
    opt.perPage = opt.perPage || 10000

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
          throw new Errors.ServerGenericError(`yandex.directoryUsersList: ${_resp.statusText}`)
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

  /**
   * Получить список отделов из Yandex Connect
   * @param token токен для доступа к yandex (accessToken)
   * @param opt: поддерживаются такие опции (переведены в camelCase):
   *   page
   *   perPage
   *   orgId: если есть - добавляется в заголовок
   * @return {Promise<unknown>} список департаментов
   */
  const ycDepartmentList = (token, opt) => {
    const Errors = app.exModular.services.errors
    if (!opt) {
      opt = {}
    }
    opt.perPage = opt.perPage || 1000

    const fields = opt.fields || 'id,name,email,external_id,removed,parents,label,' +
      'created,parent,description,members_count,head'

    const headers = new Headers({ Authorization: `OAuth ${token}`, Accept: 'application/json' })
    if (opt.orgId) {
      headers.append('X-Org-ID', opt.orgId.toString())
    }

    const url = 'https://api.directory.yandex.net' +
      '/v6/departments' +
      `?fields=${fields}` +
      `${opt.page ? '&page=' + opt.page : ''}` +
      `${opt.perPage ? '&per_page=' + opt.perPage : ''}`

    let resp = null
    return fetch(new Request(url, { method: 'GET', headers }))
      .then((_resp) => {
        resp = _resp
        return _resp.json()
      })
      .then((_json) => {
        if (resp.status < 200 || resp.status >= 300) {
          throw new Errors.ServerGenericError(`yandex.ycDepartmentList: ${resp.statusText} body: ${JSON.stringify(_json)}`)
        }
        return _json
      })
      .catch((e) => { throw e })
  }

  /**
   *
   * Получить список отделов из Yandex Connect
   * @param token токен для доступа к yandex (accessToken)
   * @param opt: поддерживаются такие опции (переведены в camelCase):
   *   page
   *   perPage
   *   orgId: если есть - добавляется в заголовок
   * @return {Promise<unknown>} список организаций
   */
  const ycOrganizationList = (token, opt) => {
    const Errors = app.exModular.services.errors
    if (!opt) {
      opt = {}
    }
    opt.perPage = opt.perPage || 1000

    const fields = opt.fields || 'id,name,revision,label,domains,admin_uid,email,services,' +
      'disk_limit,subscription_plan,country,language,name,fax,disk_usage,phone_number'

    const headers = new Headers({ Authorization: `OAuth ${token}`, Accept: 'application/json' })
    if (opt.orgId) {
      headers.append('X-Org-ID', opt.orgId.toString())
    }

    const url = 'https://api.directory.yandex.net' +
      '/v6/organizations' +
      `?fields=${fields}` +
      `${opt.page ? '&page=' + opt.page : ''}` +
      `${opt.perPage ? '&per_page=' + opt.perPage : ''}`

    let resp = null
    return fetch(new Request(url, { method: 'GET', headers }))
      .then((_resp) => {
        resp = _resp
        return _resp.json()
      })
      .then((_json) => {
        if (resp.status < 200 || resp.status >= 300) {
          throw new Errors.ServerGenericError(`yandex.ycOrganizationList: ${resp.statusText} body: ${JSON.stringify(_json)}`)
        }
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
    const Serial = app.exModular.services.serial
    const YCUser = app.exModular.models.YCUser
    const YCUserContact = app.exModular.models.YCUserContact
    const YCDepartment = app.exModular.models.YCDepartment
    const YCOrganization = app.exModular.models.YCOrganization
    const YCService = app.exModular.models.YCService

    return DirectoryYandex.findById(directoryImport.id)
      .then((_directoryImport) => ycUserList(directoryImport.accessToken, { isDismissed: 'ignore' }))
      .then((_userList) => {
        // console.log('RAW USERS:')
        // console.log(_import)
        // directoryImport.rawUsers = JSON.stringify(_userList)
        if (Array.isArray(_userList.result)) {
          // import all users:
          return Serial(_userList.result.map((_item) => () => {
            return YCUser.create({
              id: _item.id.toString(),
              directoryId: directoryImport.id,
              isRobot: _item.is_robot,
              externalId: _item.external_id,
              position: _item.position,
              departments: _item.departments.map((department) => { return department.id }),
              orgId: _item.org_id,
              gender: _item.gender,
              created: _item.created,
              nameFirst: _item.name.first,
              nameLast: _item.name.last,
              nameMiddle: _item.name.middle,
              about: _item.about,
              nickname: _item.nickname,
              groups: _item.groups.map((group) => { return group.id }),
              isAdmin: _item.is_admin,
              birthday: _item.birthday,
              departmentId: _item.department_id,
              email: _item.email,
              aliases: _item.aliases.toString(),
              isDismissed: _item.is_dismissed
            })
              .then((ycUser) => {
                if (_item.contacts && Array.isArray(_item.contacts)) {
                  return Serial(_item.contacts.map((contact) => () => {
                    return YCUserContact.create({
                      ycUserId: ycUser.id,
                      value: contact.value,
                      type: contact.type,
                      main: contact.main,
                      alias: contact.alias,
                      synthetic: contact.synthetic
                    })
                  }))
                }
              })
              .catch(e => { throw e })
          }))
        }
      })
      .then(() => {
        directoryImport.statusMessage = 'Finised loading users'
        directoryImport.status = 'Step completed (users)'
        return DirectoryYandex.update(directoryImport.id, directoryImport)
      })
      .then(() => ycDepartmentList(directoryImport.accessToken))
      .then((_departmentList) => {
        if (Array.isArray(_departmentList.result)) {
          return Serial(_departmentList.result.map((_item) => () => {
            return YCDepartment.create({
              id: _item.id,
              name: _item.name,
              externalId: _item.external_id,
              removed: _item.removed,
              parents: _item.parents.map((parent) => { return parent.id }),
              label: _item.label,
              created: _item.created,
              parentId: _item.parent ? _item.parent.id : null,
              description: _item.description,
              membersCount: _item.members_count,
              headId: _item.head
            })
          }))
        }
      })
      .then(() => ycOrganizationList(directoryImport.accessToken))
      .then((_organizationList) => {
        if (Array.isArray(_organizationList.result)) {
          return Serial(_organizationList.result.map((_item) => () => {
            return YCOrganization.create({
              id: _item.id,
              name: _item.name,
              revision: _item.revision,
              label: _item.label,
              domainDisplay: _item.domains ? _item.domains.display : null,
              domainMaster: _item.domains ? _item.domains.master : null,
              allDomains: _item.domains ? JSON.stringify(_item.domains.all) : null,
              adminUserId: _item.admin_uid,
              email: _item.email,
              diskLimit: _item.disk_limit,
              subscriptionPlan: _item.subscription_plan,
              country: _item.country,
              language: _item.language,
              diskUsage: _item.disk_usage,
              phoneNumber: _item.phone_number,
              fax: _item.fax
            })
              .then((ycOrganization) => {
                if (_item.services && Array.isArray(_item.services)) {
                  return Serial(_item.services.map((service) => () => {
                    return YCService.create({
                      ycOrganizationId: ycOrganization.id,
                      slug: service.slug,
                      ready: service.ready
                    })
                  }))
                }
              })
              .catch(e => { throw e })
          }))
        }
      })
      .catch(e => { throw e })
  }

  return {
    authExchangeCodeForToken,
    authGetProfile,
    ycUserList,
    ycDepartmentList,
    ycOrganizationList,
    ycDirectoryImport
  }
}

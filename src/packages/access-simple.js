// import _ from 'lodash'
import * as ACCESS from './const-access'

const packageName = 'Access-simple'

export const AccessSimple = (app) => {
  const Module = {
    moduleName: packageName,
    dependency: [
      'models',
      'models.UserGroup',
      'models.UserGroup.usersAdd',
      'models.UserGroup.usersRemove'
    ],
    module: {}
  }

  app.exModular.modules.Add(Module)

  Module.module.ACCESS_GUEST = {
    id: ACCESS.GUEST_ID,
    name: '(Guest)',
    email: '',
    password: '',
    disabled: false
  }

  /**
   * addAdmin: добавить пользователя в группу администраторов:
   * @param user (User) запись о пользователе, который будет добавлен в группу администраторов, должна содержать id
   * @returns {Promise<User>} возвращает промис, разрешающийся в новое значение объекта Группа пользователей-администраторов
   */
  Module.module.addAdmin = (user) => {
    if (!user || !user.id) {
      throw Error(`${packageName}.addAdmin: invalid param "user" - ${user.toString()}`)
    }

    return app.exModular.models.UserGroup.usersAdd(ACCESS.ADMIN_GROUP_ID, user.id)
      .catch((e) => { throw e })
  }

  /**
   * isAdmin: проверить является ли пользователь администратором - состоит ли он в группе администраторов
   * @param user (User): пользователь, которого нужно проверить на предмет того, числится ли он администратором
   * @returns промис, разрешающийся в булевый тип - администратор ли указанный пользователь, или нет
   */
  Module.module.isAdmin = (user) => {
    if (!user || !user.id) {
      throw Error(`${packageName}.addAdmin: invalid param "user" - ${user.toString()}`)
    }

    return app.exModular.models.UserGroup.findById(ACCESS.ADMIN_GROUP_ID)
      .then((_adminGroup) => {
        if (!_adminGroup) {
          throw Error(`${packageName}.isAdmin: can not find admin group`)
        }
        return _adminGroup.users.indexOf(user.id) !== -1
      })
      .catch((e) => { throw e })
  }

  /**
   * getUserGroups: вернуть все группы, в которых пользователь числится
   * @param user (User): пользователь, для которого требуется вернуть список групп, объект должен содержать свойство id
   * @returns (Promise<UserGroup>): возвращает промис, разрешающийся в массив объектов UserGroup
   */
  Module.module.getUserGroups = (user) => {
    if (!user || !user.id) {
      throw Error(`${packageName}.getUserGroups: invalid param "user" - ${user.toString()}`)
    }

    return app.exModular.models.UserGroup.findAll()
      .then((_userGroups) => {
        const ret = []
        _userGroups.map((userGroup) => {
          const userIndex = userGroup.users.indexOf(user.id)
          if (userIndex !== -1) {
            ret.push(userGroup)
          }
        })
        return ret
      })
      .catch((e) => { throw e })
  }

  /*
  Алгоритм проверки разрешения:
  * идентифицировать пользователя - должен быть в req.user
  * получить список групп пользователя - поместить в req.user.groups
  * уточнить объект и метод, которые проверяются на доступ. Если объект - это группа методов, то
    получить список методов

  Сначала проверить входит ли пользователь в список администраторов. Если да - то разрешить доступ.

  Потом проверить разрешения для всех групп, в которых пользователь зарегистрирован

   */
  /**
   * access: функция, которая вернет middleware для проверки полномочий доступа к объекту
   * @param objectName: имя объекта, к которому будет проверяться доступ
   * @returns middleware которое проверяет наличие доступа к указанному объекту
   */
  Module.module.check = (objectName) => (req, res, next) => {
    Module.module.CheckPermission(req.user, objectName)
      .then((_permission) => {
        if (_permission === undefined) {
          return next(Error('Failed to check permission'))
        }
        if (_permission === ACCESS.UNKNOWN || _permission === ACCESS.DENY) {
          return next(new app.exModular.services.errors.ServerNotAllowed())
        }
        return next()
      })
      .catch((e) => next(e))
  }

  Module.module.CheckPermission = (user, objectName) => {
    if (!user || !user.id) {
      throw Error(`${packageName}.CheckPermission: invalid param "user" - ${user.toString()}`)
    }

    // console.log(`CheckPermission( ${user.id}, ${user.name}: ${objectName})`)

    // check if user is admin
    let accessObject = null
    let userGroups = null
    return Module.module.isAdmin(user)
      .then((_isAdmin) => {
        // console.log(`Check isAdmin(user): ${_isAdmin}`)
        if (_isAdmin) {
          // user is admin, so all permissions granted for all objects:
          // console.log('user is admin, allow')
          return Promise.resolve(ACCESS.ALLOW)
        }

        // find access object
        return app.exModular.models.AccessObject.findOne({ where: { objectName } })
          .then((_accessObject) => {
            if (!_accessObject) {
              // console.log('object not defined, DENY')
              return Promise.resolve(ACCESS.DENY) // no object defined, DENY
            }
            accessObject = _accessObject

            // ok, now we have object, start checking permissions:
            // first, check individual user specific permissions for that object:
            return app.exModular.models.PermissionUser.findOne({ where: { userId: user.id, accessObjectId: accessObject.id } })
              .then((_permissionUser) => {
                if (!_permissionUser) {
                  // no specific permissions for that object / user defined, so continue with groups:
                  // first - we should get all groups defined for user:
                  // console.log('no specific permissions for user')
                  return Module.module.getUserGroups(user)
                    .then((_userGroups) => {
                      if (!_userGroups) {
                        // failed to get user groups, so no permissions are defined, return DENY:
                        // console.log('Object not defined, DENY')
                        return Promise.resolve(ACCESS.DENY) // no object defined, DENY
                      }
                      userGroups = _userGroups
                      // console.log('User groups:')
                      // console.log(_userGroups)

                      // for each user's group we should get specific permission:
                      return app.exModular.services.serial(userGroups.map((userGroup) => () => {
                        // console.log(`UserGroup ${userGroup.name}`)
                        return app.exModular.models.PermissionUserGroup.findOne(
                          { where: { userGroupId: userGroup.id, accessObjectId: accessObject.id } })
                          .then((_permissionGroup) => {
                            // if permisison is not defined - return UNKNOWN
                            if (!_permissionGroup) {
                              // console.log('Not found')
                              return ACCESS.ACCESS_UNKNOW
                            }
                            // otherwise - return specific permission
                            // console.log('Found')
                            // console.log(_permissionGroup.value)
                            return _permissionGroup.value
                          })
                      }))
                        .then((_groupResult) => {
                          // process result from all user's groups:
                          if (!_groupResult) {
                            // strange: no result or error
                            throw Error(`${packageName}.CheckPermission: failed to process result for user's groups`)
                          }

                          // by default - group result will be DENY
                          let groupRes = ACCESS.DENY
                          _groupResult.map((res) => {
                            // if any group have ALLOW, group result will be ALLOW
                            if (res === ACCESS.ALLOW) {
                              groupRes = ACCESS.ALLOW
                            }
                          })
                          return Promise.resolve(groupRes)
                        })
                    })
                }

                // we have specific permission and should return it
                return Promise.resolve(_permissionUser.permission)
              })
          })
          .catch((err) => { throw err })
      })
      .catch((err) => { throw err })
  }

  return Module.module
}

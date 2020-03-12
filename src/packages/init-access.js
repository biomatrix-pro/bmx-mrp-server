import * as ACCESS from './const-access'
import { AccessObjectType } from './model-access-object'

export const InitAccess = (app) => () => {
  const User = app.exModular.models.User
  const UserGroup = app.exModular.models.UserGroup
  const AccessObject = app.exModular.models.AccessObject

  const Serial = app.exModular.services.serial

  return Promise.resolve()
    .then(() => UserGroup.findById(ACCESS.ACCESS_ADMIN_GROUP_ID))
    .then((item) => {
      if (!item) {
        return UserGroup.create({
          id: ACCESS.ACCESS_ADMIN_GROUP_ID,
          name: ACCESS.AccessSystemType.Admin.caption,
          systemType: ACCESS.AccessSystemType.Admin.value,
          users: []
        })
      }
      return item
    })
    .then(() => User.findById(ACCESS.ACCESS_GUEST_ID))
    .then((item) => {
      if (!item) {
        return User.create({
          id: ACCESS.ACCESS_GUEST_ID,
          name: '(GUEST)',
          disabled: true
        })
      }
      return item
    })
    .then((item) => {
      app.exModular.access.ACCESS_GUEST = item
      return {}
    })
    .then(() => {
      return Serial(app.exModular.routes.map((route) => () => {
        return AccessObject.findOne({ where: { objectName: route.name } })
          .then((_item) => {
            if (!_item) {
              return AccessObject.create({
                id: route.name,
                objectName: route.name,
                type: AccessObjectType.Controller.value
              })
            }
            return _item
          })
          .catch((e) => { throw e })
      }))
    })
    .catch((e) => { throw e })
}

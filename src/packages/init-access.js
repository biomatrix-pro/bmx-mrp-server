import { ACCESS_ADMIN_GROUP_ID } from './const-access'
import { AccessObjectType } from './model-access-object'

export const InitAccess = (app) => () => {
  const UserGroup = app.exModular.models.UserGroup
  const AccessObject = app.exModular.models.AccessObject

  const Serial = app.exModular.services.serial

  return Promise.resolve()
    .then(() => UserGroup.findById(ACCESS_ADMIN_GROUP_ID))
    .then((item) => {
      if (!item) {
        return UserGroup.create({
          id: ACCESS_ADMIN_GROUP_ID,
          name: 'Admin',
          systemType: 'Admin',
          users: []
        })
      }
      return item
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
      }))
    })
    .catch((e) => { throw e })
}

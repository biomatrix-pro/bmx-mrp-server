import { ACCESS_ADMIN_GROUP_ID } from './const-access'

export const InitAccess = (app) => () => {
  const UserGroup = app.exModular.models.UserGroup
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
    .catch((e) => { throw e })
}

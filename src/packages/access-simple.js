import { accessLoggedIn, accessAdmin } from './init-access'

const packageName = 'Access-simple'

export const AccessSimple = (app) => {
  const Module = {
    moduleName: packageName,
    dependency: [
      'models',
      'models.UserGroup',
      'models.UserGroup.usersAdd'
    ],
    module: {}
  }

  app.exModular.modules.Add(Module)

  Module.module.registerLoggedUser = (user) => {
    if (!user || !user.id) {
      throw Error(`${packageName}.registerLoggedUser: invalid param "user" - ${user.toString()}`)
    }

    return app.exModular.models.UserGroup.usersAdd(accessLoggedIn, user.id)
      .catch((e) => { throw e })
  }

  Module.module.unregisterLoggedUser = (user) => {
    if (!user || !user.id) {
      throw Error(`${packageName}.unregisterLoggedUser: invalid param "user" - ${user.toString()}`)
    }

    return app.exModular.models.UserGroup.usersRemove(accessLoggedIn, user.id)
      .catch((e) => { throw e })
  }

  Module.module.addAdmin = (user) => {
    if (!user || !user.id) {
      throw Error(`${packageName}.addAdmin: invalid param "user" - ${user.toString()}`)
    }

    return app.exModular.models.UserGroup.usersAdd(accessAdmin, user.id)
      .catch((e) => { throw e })
  }

  return Module.module
}

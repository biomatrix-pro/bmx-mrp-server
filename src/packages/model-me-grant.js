import uuid from 'uuid/v4'
import * as ACCESS from './const-access'

export const MeGrant = (app, options) => {
  if (!options) {
    options = {}
  }
  // options.storage = options.storage || 'default'

  const Model = {
    name: 'MeGrant',
    priority: 0,
    props: [
      {
        name: 'id',
        type: 'id',
        caption: 'Id',
        description: 'Идентификатор выданных передоверий',
        default: () => uuid()
      },
      {
        name: 'userId',
        type: 'ref',
        caption: 'Пользователь',
        description: 'Пользователь, к которому относится данное передоверие',
        model: 'User',
        default: null
      },
      {
        name: 'accessObjectId',
        type: 'ref',
        caption: 'Объект',
        description: 'Объект, на которое данное передоверие выдано',
        model: 'AccessObject',
        default: null
      },
      {
        name: 'permission',
        type: 'enum',
        caption: 'Разрешение',
        description: 'Какое именно передоверие выдано',
        format: [
          ACCESS.AccessPermissionType.unknown,
          ACCESS.AccessPermissionType.DENY,
          ACCESS.AccessPermissionType.ALLOW
        ],
        default: ACCESS.AccessPermissionType.unknown.value
      },
      {
        name: 'withGrant',
        type: 'boolean',
        caption: 'Передоверие',
        description: 'Есть ли право передоверить это передоверие',
        default: false
      },
      {
        name: 'permissionUserId',
        type: 'ref',
        model: 'PermissionUser',
        caption: 'Разрешение',
        description: 'Ссылка на разрешение, которое в рамках передоверия сформировано в системе',
        default: null
      }
    ],
    routes: []
  }

  const Wrap = app.exModular.services.wrap

  Model.beforeCheckPermission = (req, res, next) => {
    return app.exModular.access.checkPermission(req.user, req.data.accessObjectId)
      .then((permission) => {
        if (!(permission.permission === ACCESS.Allow && permission.withGrant === true)) {
          const err = new app.exModular.services.errors.ServerNotAllowed('No withGrant permission')
          res.err = err
          return next(err)
        }
        return next()
      })
      .catch((e) => { throw e })
  }

  /**
   * (async! need WRAP) после создания записи в базе, создать соответствующее разрешение
   * @param req
   * @param res
   * @param next
   * @return {Promise<void>|*}
   */
  Model.afterCreate = (req, res, next) => {
    if (!res.data) {
      return Promise.resolve({})
    }

    const PermissionUser = app.exModular.models.PermissionUser
    return PermissionUser.create({
      userId: res.data.userId,
      accessObjectId: res.data.accessObjectId,
      permission: res.data.permission,
      withGrant: res.data.withGrant
    })
      .catch((e) => { throw e })
  }

  Model.afterRemove = (req, res, next) => {
    const PermissionUser = app.exModular.models.PermissionUser

    const resData = res.data
    return PermissionUser.remove(res.data.permissionUserId)
      .then((permissionUser) => {
        resData.permissionUser = permissionUser
        res.data = resData
        return resData
      })
      .catch((e) => { throw e })
  }

  Model.routes.create = {
    method: 'POST',
    name: `${Model.name}.create`,
    description: `Create new "${Model.name}"`,
    path: `/${Model.name.toLowerCase()}`,
    before: [
      app.exModular.auth.check,
      app.exModular.access.check(`${Model.name}.create`),
      app.exModular.services.validator.checkBodyForArrayOfModel(Model, { optionalId: true }),
      Wrap(Model.beforeCheckPermission)
    ],
    handler: app.exModular.services.controllerDF.create(Model),
    after: [
      Wrap(Model.afterCreate),
      app.exModular.services.controllerDF.sendData
    ]
  }

  Model.routes.remove = {
    method: 'DELETE',
    name: `${Model.name}.remove`,
    description: `Delete single item in "${Model.name}" by id`,
    path: `/${Model.name.toLowerCase()}/:id`,
    before: [
      app.exModular.auth.check,
      app.exModular.access.check(`${Model.name}.remove`),
      app.exModular.services.validator.paramId(Model)
    ],
    handler: app.exModular.services.controllerDF.remove(Model),
    after: [
      Wrap(Model.afterRemove)
    ]
  }
  return Model
}

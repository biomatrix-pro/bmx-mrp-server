import uuid from 'uuid/v4'
import * as ACCESS from './const-access'

export const ModelMeAccess = (app, options) => {
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
        calculated: true,
        caption: 'Id',
        description: 'Идентификатор объекта доступа',
        default: () => uuid()
      },
      {
        name: 'permission',
        type: 'enum',
        calculated: true,
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
        calculated: true,
        caption: 'Передоверие',
        description: 'Есть ли право передоверить это передоверие',
        default: false
      },
      {
        name: 'isAdmin',
        type: 'boolean',
        calculated: true,
        caption: 'isAdmin',
        description: 'Есть ли право передоверить это передоверие',
        default: false
      },
      {
        name: 'error',
        type: 'text',
        calculated: true,
        caption: 'error',
        description: 'Есть ли право передоверить это передоверие',
        default: false
      },
      {
        name: 'permissionUserId',
        type: 'ref',
        calculated: true,
        model: 'PermissionUser',
        caption: 'Разрешение',
        description: 'Ссылка на разрешение, которое в рамках передоверия сформировано в системе',
        default: null
      },
      {
        name: 'permissionUserGroupId',
        type: 'ref',
        calculated: true,
        model: 'PermissionUserGroup',
        caption: 'Разрешение',
        description: 'Ссылка на разрешение, которое в рамках передоверия сформировано в системе',
        default: null
      },
     ],
    routes: [],
    resourcePath: '/me/access'
  }

  // disable auto-generation of routes except list:
  Model.routes.create = null
  Model.routes.item = null
  Model.routes.save = null
  Model.routes.remove = null
  Model.routes.removeAll = null

  Model.handlerList = (req, res, next) => {
    const AccessObject = app.exModular.models.AccessObject

    return AccessObject.findAll()
      .then((_accessObject) => {

      })
  }

  Model.routes.push(
    {
      method: 'GET',
      name: `${Model.name}.list`,
      description: `Create new "${Model.name}"`,
      path: Model.resourcePath,
      before: [
        app.exModular.auth.check
        // app.exModular.access.check(`${Model.name}.create`),
        // app.exModular.services.validator.checkBodyForArrayOfModel(Model, { optionalId: true }),
        // Wrap(Model.beforeCheckPermission)
      ],
      handler: app.exModular.services.controllerDF.create(Model),
      after: [
        Wrap(Model.afterCreate),
        app.exModular.services.controllerDF.sendData
      ]
    }
  )

  return Model
}

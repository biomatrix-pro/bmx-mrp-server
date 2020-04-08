import uuid from 'uuid/v4'
import { AccessPermissionType } from './const-access'

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
          AccessPermissionType.unknown,
          AccessPermissionType.DENY,
          AccessPermissionType.ALLOW
        ],
        default: AccessPermissionType.unknown.value
      },
      {
        name: 'permissionUserId',
        type: 'ref',
        model: 'PermissionUser',
        caption: 'Разрешение',
        description: 'Ссылка на разрешение, которое в рамках передоверия сформировано в системе',
        default: null
      }
    ]
  }
  return Model
}

import uuid from 'uuid/v4'
import { AccessPermissionType } from './const-access'
// import _ from 'lodash'

export const PermissionUser = (app, options) => {
  if (!options) {
    options = {}
  }
  // options.storage = options.storage || 'default'

  const Model = {
    name: 'PermissionUser',
    priority: 0,
    props: [
      {
        name: 'id',
        type: 'id',
        caption: 'Id',
        description: 'Идентификатор разрешений для группы пользователей',
        default: () => uuid()
      },
      {
        name: 'userGroupId',
        type: 'ref',
        caption: 'Группа',
        description: 'Группа пользователей, к которой относится данное разрешение',
        model: 'UserGroup',
        default: null
      },
      {
        name: 'accessObjectId',
        type: 'ref',
        caption: 'Объект',
        description: 'Объект, на которое данное разрешение выдано',
        model: 'AccessObject',
        default: null
      },
      {
        name: 'value',
        type: 'enum',
        caption: 'Разрешение',
        description: 'Какое именно разрешение выдано',
        format: [
          AccessPermissionType.unknown,
          AccessPermissionType.DENY,
          AccessPermissionType.ALLOW
        ],
        default: AccessPermissionType.unknown.value
      }
    ]
  }
  return Model
}

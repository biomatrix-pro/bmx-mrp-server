import { v4 as uuid } from 'uuid'
import _ from 'lodash'

export const UserGroup = (app, options) => {
  if (!options) {
    options = {}
  }
  options.storage = options.storage || 'default'

  const Model = {
    name: 'UserGroup',
    props: [
      {
        name: 'id',
        type: 'id',
        default: () => uuid()
      },
      {
        name: 'name',
        type: 'text',
        default: null
      },
      {
        name: 'systemType',
        type: 'text',
        default: ''
      },
      {
        name: 'users',
        type: 'refs',
        model: 'User',
        default: []
      }
    ]
  }

  Model.usersAfterRemove = (req, res, next) => {
    if (!req.data || !Array.isArray(req.data) || req.data.length === 0) {
      return {}
    }

    const Session = app.exModular.models.Session
    const Serial = app.exModular.services.serial

    return Session.findAll({ whereIn: { column: 'userId', ids: req.data } })
      .then((_session) => {
        if (!_session) {
          return {}
        }
        return Serial(_session.map((item) => () =>
          Session.removeById(item.id)
            .catch((e) => { throw e })))
      })
  }

  const usersIndex = _.findIndex(Model.props, { name: 'users', type: 'refs' })
  const usersProp = Model.props[usersIndex]
  usersProp.afterRemove = app.exModular.services.wrap(Model.usersAfterRemove)
  return Model
}

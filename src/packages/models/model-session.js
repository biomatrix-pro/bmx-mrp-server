import { v4 as uuid } from 'uuid'
import _ from 'lodash'

export const Session = () => {
  const Model = {
    name: 'Session',
    caption: 'Сессия',
    description: 'Сессия пользователя',
    props: [
      {
        name: 'id',
        type: 'id',
        caption: '',
        description: '',
        default: () => uuid()
      },
      {
        name: 'userId',
        type: 'ref',
        model: 'User',
        caption: '',
        description: '',
        default: null
      },
      {
        name: 'createdAt',
        type: 'datetime',
        caption: '',
        description: '',
        default: () => Date.now()
      },
      {
        name: 'ip',
        type: 'text',
        caption: '',
        description: '',
        default: null
      }
    ],
    createOrUpdate: (item) => {
      return Model.findOne({ where: { userId: item.userId, ip: item.ip } })
        .then((res) => {
          if (!res) {
            return Model.create(item)
          } else {
            _.assign(item, res)
            item.createdAt = new Date()
            item.id = res.id
            return Model.update(item.id, item)
          }
        })
        .catch((e) => { throw e })
    }
  }
  return Model
}

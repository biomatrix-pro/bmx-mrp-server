import { v4 as uuid } from 'uuid'
// import _ from 'lodash'

export const DirectoryYandex = (app) => {
  const Model = {
    name: 'DirectoryYandex',
    caption: 'Яндекс.Directory',
    description: 'Сервис каталога пользователей на Яндексе',
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
        caption: 'Пользователь',
        description: 'Пользователь, социальный аккаунт которого используется для импорта каталога',
        default: null
      },
      // {
      //   name: 'rawUsers',
      //   type: 'text',
      //   format: 'json',
      //   size: 64000,
      //   caption: 'Пользователи - дамп',
      //   description: 'Дамп данных о пользователях из каталога',
      //   default: null
      // },
      {
        name: 'accessToken',
        type: 'text',
        caption: '',
        description: '',
        default: null
      },
      {
        name: 'status',
        type: 'text',
        format: 'text',
        caption: '',
        description: '',
        size: 64,
        default: ''
      },
      {
        name: 'statusMessage',
        type: 'text',
        format: 'text',
        caption: '',
        description: '',
        default: ''
      },
      {
        name: 'createdAt',
        type: 'datetime',
        format: 'YYYY/MM/DD',
        caption: '',
        description: '',
        default: () => Date.now()
      }
    ]
  }

  Model._create = app.exModular.storages.default.create(Model)

  Model.create = (aItem) => {
    const Yandex = app.exModular.services.yandex

    // databags:
    let directoryYandex = null

    aItem.status = 'Import started'
    aItem.createdAt = Date.now()

    return Model._create(aItem)
      .then((_directoryYandex) => {
        directoryYandex = _directoryYandex

        return Yandex.ycDirectoryImport(directoryYandex)
      })
      .then(() => { return directoryYandex })
      .catch(e => { throw e })
  }

  return Model
}

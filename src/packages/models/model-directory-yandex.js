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
      {
        name: 'rawUsers',
        type: 'text',
        format: 'json',
        size: 2048,
        caption: 'Пользователи - дамп',
        description: 'Дамп данных о пользователях из каталога',
        default: null
      },
      {
        name: 'accessToken',
        type: 'text',
        caption: '',
        description: '',
        default: null
      }
    ]
  }

  Model._create = app.exModular.storages.default.create(Model)

  // Model.create = (aItem) => {
  //   const Yandex = app.exModular.services.yandex
  //
  //   // databags:
  //   let directoryYandex = null
  //
  //   return Model._create(aItem)
  //     .then((_directoryYandex) => {
  //       directoryYandex = _directoryYandex
  //
  //       // grab token of current user:
  //       aItem.userId
  //       return yandex.directoryUsersList()
  //       // update data:
  //       // directoryYandex. = 'Started'
  //       directoryYandex.createdAt = Date.now()
  //       console.log('plan started, plan calc:')
  //       console.log(_planCalc)
  //       return Model.update(_planCalc.id, _planCalc)
  //     })
  //     .then((_planCalc) => {
  //       planCalc = _planCalc // updated plan
  //       return MRP.processPlanCalc(planCalc.id)
  //     })
  //     .catch((e) => { throw e })
  // }

  return Model
}

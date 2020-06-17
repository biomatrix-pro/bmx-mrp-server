import { v4 as uuid } from 'uuid'
// import _ from 'lodash'

export const SessionSocial = () => {
  return {
    name: 'SessionSocial',
    caption: 'Сессия через соцсеть',
    description: 'Сессия пользователя открытая после входа через социальную сеть',
    props: [
      {
        name: 'id',
        type: 'id',
        caption: '',
        description: '',
        default: () => uuid()
      },
      {
        name: 'sessionId',
        type: 'ref',
        model: 'Session',
        caption: '',
        description: '',
        default: null
      },
      {
        name: 'rawData',
        type: 'text',
        format: 'json',
        size: 2048,
        caption: '',
        description: '',
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
}

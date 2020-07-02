import { v4 as uuid } from 'uuid'

export const IntgImportResource = (app) => {
  return {
    name: 'IntgImportResource',
    caption: 'Импорт ресурса',
    description: 'Журнал импорта данных ресурса из интеграции',
    props: [
      {
        name: 'id',
        type: 'id',
        caption: '',
        description: '',
        default: () => uuid()
      },
      {
        name: 'intgImportId',
        type: 'ref',
        model: 'IntgImport',
        caption: 'Импорт',
        description: 'Ссылка на импорт, к которому относится этот импорт ресурса',
        default: null
      },
      {
        name: 'remoteNew',
        type: 'array',
        itemType: 'id',
        format: '',
        caption: 'Новые',
        description: 'Новые элементы в источнике',
        default: []
      },
      {
        name: 'remoteUpdated',
        type: 'array',
        itemType: 'id',
        format: '',
        caption: 'Измененные',
        description: 'Измененные элементы в источнике',
        default: []
      },
      {
        name: 'remoteRemoved',
        type: 'array',
        itemType: 'id',
        format: '',
        caption: 'Удалённые',
        description: 'Удаленные элементы из источника',
        default: []
      },
      {
        name: 'remoteSame',
        type: 'array',
        itemType: 'id',
        format: '',
        caption: 'Неизменные',
        description: 'Неизменные элементы в источнике',
        default: []
      },
      {
        name: '',
        type: '',
        format: '',
        caption: '',
        description: '',
        default: null
      }
      // {
      //   name: '',
      //   type: '',
      //   format: '',
      //   caption: '',
      //   description: '',
      //   default: null
      // },
    ]
  }
}

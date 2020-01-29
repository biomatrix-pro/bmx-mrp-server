import uuid from 'uuid/v4'

export const Stage = () => {
  return {
    name: 'Stage',
    props: [
      {
        name: 'id',
        type: 'id',
        caption: 'Id',
        description: 'Идентификатор',
        format: 'uuid',
        default: () => uuid()
      },
      {
        name: 'order',
        type: 'decimal',
        caption: 'Номер п/п',
        description: 'Номер по порядку',
        format: '',
        precision: 10,
        scale: 0,
        default: 0
      },
      {
        name: 'productId',
        type: 'ref',
        caption: 'Продукт',
        description: 'Продукт, к которому относится данный этап производства',
        model: 'Product'
      },
      {
        name: 'caption',
        type: 'text',
        caption: 'Название',
        description: 'Название этапа производства',
        format: 'text',
        size: 127,
        default: ''
      },
      {
        name: 'duration',
        type: 'decimal',
        caption: 'Длительность',
        description: 'Длительность этапа производства продукта',
        format: '',
        precision: 10,
        scale: 0,
        default: 1
      },
      {
        name: 'inWorkingDays',
        type: 'boolean',
        caption: 'Рабочие дни',
        description: 'Признак того, что длительность указана в рабочих днях',
        default: false
      },
      {
        name: 'comments',
        type: 'text',
        caption: 'Примечания',
        format: 'text',
        size: 255,
        default: ''
      }
    ]
  }
}

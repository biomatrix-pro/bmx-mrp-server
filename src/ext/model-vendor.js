import uuid from 'uuid/v4'

export const Vendor = () => {
  return {
    name: 'Vendor',
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
        name: 'caption',
        type: 'text',
        caption: 'Название',
        description: 'Название поставщика',
        format: 'text',
        size: 127,
        default: ''
      },
      {
        name: 'resourceId',
        type: 'ref',
        caption: 'Ресурс',
        description: 'Ресурс, поставляемый этим поставщиком',
        model: 'Resource',
        default: null
      },
      {
        name: 'date',
        type: 'datetime',
        caption: 'Дата',
        description: 'Начальная дата операций с этим поставщиком',
        format: 'DD/MM/YYYY',
        default: () => Date.now()
      },
      {
        name: 'unit',
        type: 'text',
        caption: 'Ед изм',
        description: 'Единица измерения в заказе',
        format: 'text',
        size: 32,
        default: ''
      },
      {
        name: 'orderMin',
        type: 'decimal',
        caption: 'Мин заказ',
        description: 'Минимальная партия ресурса в заказе',
        format: '',
        precision: 12,
        scale: 4,
        default: 0.00
      },
      {
        name: 'orderStep',
        type: 'decimal',
        caption: 'Шаг изм',
        description: 'Шаг изменения количества ресурса в заказе',
        format: '',
        precision: 12,
        scale: 4,
        default: 1
      },
      {
        name: 'inWorkingDays',
        type: 'boolean',
        caption: 'Рабочие дни',
        description: 'Длительность указана в рабочих днях',
        default: false
      },
      {
        name: 'orderDuration',
        type: 'decimal',
        caption: 'Длительность',
        description: 'Длительность поставки партии ресурса от даты заказа',
        format: '',
        precision: 10,
        scale: 0,
        default: 1
      },
      {
        name: 'comments',
        type: 'text',
        caption: 'Примечания',
        description: 'Примечания',
        format: 'text',
        size: 255,
        default: ''
      }
    ]
  }
}

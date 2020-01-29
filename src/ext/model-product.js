import uuid from 'uuid/v4'

export const Product = () => {
  return {
    name: 'Product',
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
        format: 'text',
        size: 127,
        default: ''
      },
      {
        name: 'unit',
        type: 'text',
        caption: 'Ед изм',
        description: '',
        format: 'text',
        size: 32,
        default: ''
      },
      {
        name: 'qntMin',
        type: 'decimal',
        caption: 'Мин выпуск',
        description: 'Минимальная партия выпускаемой продукции',
        format: '',
        precision: 10,
        scale: 1,
        default: ''
      },
      {
        name: 'qntStep',
        type: 'decimal',
        caption: 'Шаг выпуска',
        description: 'Минимальный шаг при указании количества выпускаемой продукции',
        format: '',
        precision: 10,
        scale: 1,
        default: ''
      },
      {
        name: 'inWorkingDays',
        type: 'boolean',
        caption: 'Рабочие дни',
        description: 'Признак того, что количество указано в рабочих днях',
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

import uuid from 'uuid/v4'

export const Resource = () => {
  return {
    name: 'Resource',
    priority: 0,
    props: [
      {
        name: 'id',
        type: 'id',
        format: 'uuid',
        default: () => uuid()
      },
      {
        name: 'caption',
        type: 'text',
        caption: 'Название',
        description: 'Название ресурса',
        format: 'text',
        size: 127,
        default: ''
      },
      {
        name: 'unit',
        type: 'text',
        caption: 'Ед изм',
        description: 'Единица измерения ресурса',
        format: 'text',
        size: 32,
        default: ''
      },
      {
        name: 'minStock',
        type: 'decimal',
        caption: 'Мин кол-во',
        description: 'Минимальное количество на складе',
        format: '',
        precision: 12,
        scale: 2,
        default: ''
      }
    ]
  }
}

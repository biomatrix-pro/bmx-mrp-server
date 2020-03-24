import uuid from 'uuid/v4'

export const Note = (app) => {
  const Model = {
    name: 'Note',
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
        caption: 'Описание',
        format: 'text',
        size: 127,
        default: ''
      }
    ]
  }
  return Model
}

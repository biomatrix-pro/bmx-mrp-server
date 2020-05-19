import uuid from 'uuid/v4'

export const Plan = (app) => {
  const aPlan = {
    name: 'Plan',
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
  return aPlan
}

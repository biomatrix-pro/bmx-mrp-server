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
        name: 'date',
        type: 'datetime',
        caption: 'Дата',
        description: 'Дата передачи продукции для сбыта',
        format: 'DD/MM/YYYY',
        default: () => Date.now()
      },
      {
        name: 'caption',
        type: 'text',
        caption: 'Описание',
        format: 'text',
        size: 127,
        default: ''
      },
      {
        name: 'productId',
        type: 'ref',
        caption: 'Продукт',
        description: 'Продукт, выпуск которого планируется',
        model: 'Product',
        default: null
      },
      {
        name: 'qnt',
        type: 'decimal',
        caption: 'Количество',
        description: 'Количество продукции, которое должно быть доступно на складе',
        format: '',
        precision: 12,
        scale: 2,
        default: ''
      }
    ],

    processAll: () => {
      return aPlan.findAll()
        .then((items) =>
          app.exModular.services.serial(items.map((item) => () => aPlan.process(item.id)))
        )
        .catch((e) => { throw e })
    },

    process: (planId) => {
      return Promise.resolve()
        .then(() => aPlan.findById(planId))
        .then((plan) => {
          console.log('Processing plan:')
          console.log(plan)
        })
    }
  }
  return aPlan
}

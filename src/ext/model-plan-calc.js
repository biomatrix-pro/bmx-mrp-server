import uuid from 'uuid/v4'

export const PlanCalc = (app) => {
  const processPlan = (item) => {

  }

  const aPlan = {
    name: 'PlanCalc',
    description: 'Калькуляция плана',
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
        name: 'planId',
        type: 'ref',
        caption: 'План',
        description: 'План, к которому относится эта калькуляция',
        model: 'Plan',
        default: null
      },
      {
        name: 'createdAt',
        type: 'datetime',
        caption: 'Создана',
        description: 'Время создания калькуляции',
        format: 'DD/MM/YYYY',
        default: () => Date.now()
      },
      {
        name: 'finishedAt',
        type: 'datetime',
        caption: 'Завершена',
        description: 'Время завершения калькуляции',
        format: 'DD/MM/YYYY',
        default: () => Date.now()
      },
      {
        name: 'status',
        type: 'text',
        caption: 'Статус',
        format: 'text',
        size: 127,
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

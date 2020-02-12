import uuid from 'uuid/v4'

const packageName = 'Model-PlanCalc'

export const PlanCalc = (app) => {
  const Model = {
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
    ]
  }

  Model._create = app.exModular.storages.default.create(Model)

  Model.create = (aPlan) => {
    const MRP = app.exModular.services.MRP

    console.log('New plan:')
    console.log(aPlan)

    // databags:
    let planCalc = null

    return Model._create(aPlan)
      .then((_planCalc) => {
        planCalc = _planCalc
        // update status
        _planCalc.status = 'Started'
        _planCalc.createdAt = Date.now()
        console.log('plan started, plan calc:')
        console.log(_planCalc)
        return Model.update(_planCalc)
      })
      .then((_planCalc) => {
        planCalc = _planCalc // updated plan
        return MRP.processPlanCalc(planCalc.id)
      })
      .catch((e) => { throw e })
  }

  app.exModular.modules.Add({
    moduleName: packageName,
    dependency: [
      'services',
      'services.MRP',
      'services.MRP.processPlanCalc'
    ]
  })
  return Model
}

import uuid from 'uuid/v4'
import { ProductStockType } from './model-product-stock'

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
    const Serial = app.exModular.services.serial

    console.log('New plan:')
    console.log(aPlan)

    // data objects:
    // const Plan = app.exModular.models.Plan
    const ProductStock = app.exModular.models.ProductStock
    const PlanItem = app.exModular.models.PlanItem

    // databags:
    let planCalc = null
    let sortedPlanItem = null

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
        // стадия А2.3: обрабатываем продукцию в производстве

        return ProductStock.findAll({
          orderBy: [
            { column: 'date', order: 'asc' }
          ],
          where: {
            type: ProductStockType.inProd.value
          }
        })
      })
      .then((_inProd) => {
        // Получили все партии продукции в производстве на начало планирования. Требуется списать
        // ресурсы и оприходовать результаты.
        if (_inProd) {
          // если есть партии в производстве - обработать партии в производстве
          return Serial(_inProd.map((item) => () => MRP.processInProd(item.id, planCalc.id)))
        } else {
          return {}
        }
      })
      .then(() => {
        // алгоритм обработки планов такой:
        /*
        Получаем список элементов планов - сортирован по датам, по типам продукции
         */
        return PlanItem.findAll({
          orderBy: [
            { column: 'date', order: 'asc' },
            { column: 'productId', order: 'asc'}
          ]
        })
      })
      .then((_sortedPlanItem) => {
        sortedPlanItem = _sortedPlanItem
        console.log('_sortedPlanItem')
        console.log(_sortedPlanItem)
        return planCalc
      })
      .catch((e) => { throw e })
  }

  return Model
}

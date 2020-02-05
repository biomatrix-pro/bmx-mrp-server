import { ResourceStockType } from './model-resource-stock'

const packageName = 'MRP'

export const MRP = (app) => {
  app.exModular.modules.Add({
    moduleName: packageName,
    dependency: [
      'models',
      'models.ProductStock',
      'models.Stage',
      'models.StageResource',
      'models.ResourceStock'
    ]
  })
  const MRP = {}

  // processInProd: обработать записи о партиях продукции в производстве (на начало расчета MRP):
  MRP.processInProd = (productStockId, planCalcId) => {
    const ProductStock = app.exModular.models.ProductStock
    const Stage = app.exModular.models.Stage
    const StageResource = app.exModular.models.StageResource
    const ResourceStock = app.exModular.models.ResourceStock

    const Serial = app.exModular.services.serial

    let productStock = null
    let stages = null
    let aDate = null

    // найти запись о партии:
    return ProductStock.findById(productStockId)
      .then((_productStock) => {
        if (!_productStock) {
          throw Error('No ProductStock record')
        }
        productStock = _productStock
        aDate = _productStock.date
        // для каждой партии продукции в производство: получить этапы производства (в порядке следования очередности)
        // для данного вида продукции:
        return Stage.findAll({ where: { productId: productStock.productId }, orderBy: [{ column: 'order', order: 'asc' }] })
      })
      .then((_stages) => {
        // обработать список всех этапов производства
        stages = _stages
        if (!_stages || _stages.length < 1) {
          throw Error('Stages not found')
        }
        // получить список ресурсов, требуемых для данного этапа производства
        return Serial(stages.map((stage) => () => {
          return StageResource.findAll({ where: { stageId: stage.id } })
            .then((_stageResources) => {
              // обработать список ресурсов
              // для каждого требуемого на данной стадии ресурса:
              return Serial(_stageResources.map((stageResource) => () => {
                // обработать ресурс
                // проверить остатки ресурса на заданную дату:
                return ResourceStock.resourceQntForDate(stageResource.resourceId, aDate)
                  .then((_resQntForDate) => {
                    // рассчитать требуемое количество ресурсов для данного этапа
                    const qnt = productStock.qnt * stageResource.qnt / stage.baseQnt
                    if (qnt > _resQntForDate) {
                      // ресурсов недостаточно - это ошибка
                      console.log('ERROR! No resource')
                      throw Error('Not enough resource')
                    }
                    // списать ресурсы в производство
                    return ResourceStock.create({
                      type: ResourceStockType.used.value,
                      resourceId: stageResource.resourceId,
                      date: stage.date,
                      qnt,
                      caption: 'In-prod, use res',
                      planCalcId
                    })
                  })
              }))
                .then(() => {
                  // после обработки всех ресурсов, указанных для данной стадии - добавляем дату
                  aDate += stage.duration
                })
            })
            .catch((e) => { throw e })
        }))
      })
      .then(() => {
        // проверить дату завершения производства:
        if (aDate > Date.now()) {
          console.log('ERROR: date > Date.now()')
          throw Error('Date > now')
        }
      })
      .catch((e) => { throw e })
  }
  return MRP
}

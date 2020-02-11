import moment from 'moment-business-days'
import { ResourceStockType } from './model-resource-stock'
import { ProductStockType } from './model-product-stock'

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

  /**
   * daysAdd: добавить к указанной дате нужное количество дней - рабочих или календарных
   * @param date исходная дата
   * @param days сколько дней добавлять
   * @param isWorkingDays добавлять ли рабочие дни, иначе будут добавлены календарные
   * @return {Moment} новая дата с добавленными днями (moment object)
   */
  MRP.daysAdd = (date, days, isWorkingDays) => {
    if (isWorkingDays === undefined) {
      isWorkingDays = false
    }
    const aDate = moment(date)
    if (isWorkingDays) {
      return aDate.businessAdd(days)
    } else {
      return aDate.add(days, 'days')
    }
  }

  /**
   * processInProd: обработать записи о партиях продукции в производстве (на начало расчета MRP)
   * @param productStockId ( -> ProductStock.id) идентификатор записи о партии продукции отправленной в производство
   * @param planCalcId (-> PlanCalc.id) идентификатор калькуляции в рамках которой будут производится расчёты
   * @return {Promise<T> | undefined} возвращает промис, разрешающийся в новую запись о произведенной продукции
   */
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
        aDate = moment(_productStock.date)
        console.log('start date:')
        console.log(aDate.format('YYYY-MM-DD'))
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
                console.log(`get res qnt: resId ${stageResource.resourceId}, date ${aDate.format()}`)
                return ResourceStock.resourceQntForDate(stageResource.resourceId, aDate)
                  .then((_resQntForDate) => {
                    console.log('qnt:')
                    console.log(_resQntForDate)
                    // рассчитать требуемое количество ресурсов для данного этапа
                    const qnt = productStock.qnt * stageResource.qnt / stage.baseQnt
                    if (qnt > _resQntForDate) {
                      // ресурсов недостаточно - это ошибка
                      const errMsg = `Not enough resource ${stageResource.resourceId} at date ${aDate.format()}: needed ${qnt}, we have ${_resQntForDate}`
                      console.log(errMsg)
                      throw Error(errMsg)
                    }
                    // списать ресурсы, использованные для этапа производства
                    return ResourceStock.create({
                      type: ResourceStockType.used.value,
                      resourceId: stageResource.resourceId,
                      date: stage.date,
                      qnt: -qnt,
                      caption: 'In-prod, use res',
                      planCalcId
                    })
                  })
              }))
                .then(() => {
                  console.log('Add date:')
                  // после обработки всех ресурсов, указанных для данной стадии - добавляем дату
                  aDate = MRP.daysAdd(aDate, stage.duration, stage.inWorkingDays)
                  console.log(aDate.format('YYYY-MM-DD'))
                })
            })
            .catch((e) => { throw e })
        }))
      })
      .then(() => {
        // проверить дату завершения производства:
        if (aDate.isAfter(Date.now())) {
          console.log('ERROR: date > Date.now()')
          throw Error('Date > now')
        } else {
          // дата норм, оприходовать итоговый объем производства как новую выпущенную продукцию:
          console.log('Prod date:')
          console.log(aDate.format('YYYY-MM-DD'))
          return ProductStock.create({
            date: aDate.format('YYYY-MM-DD'),
            type: ProductStockType.prod.value,
            caption: `inProd ${productStock.id} production finished`,
            productId: productStock.productId,
            qnt: productStock.qnt,
            price: 0,
            planCalcId
          })
        }
      })
      .catch((e) => { throw e })
  }

  /**
   * Обработать ресурсы в транзите, то есть такие ресурсы, которые на начало планового периода
   * находились в процессе доставки
   * @param resourceStockId (-> ResourceStock.id) идентификатор записи в регистре учета остатков ресурсов
   * @param planCalcId (-> PlanCalc.id) идентификатор калькуляции MRP, с которой связана эта запись
   * @returns {PromiseLike<function(...[*]=)> | Promise<function(...[*]=)> | *}
   */
  MRP.processInTransit = (resourceStockId, planCalcId) => {
    const PlanItem = app.exModular.models.PlanItem
    const ResourceStock = app.exModular.models.ResourceStock
    const Vendor = app.exModular.models.Vendor

    let resourceStock = null
    let vendor = null
    // найти запись о партии:
    return ResourceStock.findById(resourceStockId)
      .then((_resStock) => {
        if (!_resStock) {
          const errMsg = `ResourceStock record with id ${resourceStockId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        resourceStock = _resStock
        // для каждой записи о транзите ресурсов - найти поставщика
        return Vendor.findById(resourceStock.vendorId)
      })
      .then((_vendor) => {
        // проверить - нашли ли поставщика
        if (!_vendor) {
          const errMsg = `MRP.processInTransit: vendor id ${resourceStockId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        vendor = _vendor
        console.log('Vendor:')
        console.log(vendor)
        // поставщик найден, нужно получить сведения о длительности доставки
        console.log('orderDuration:')
        console.log(vendor.orderDuration)

        // теперь
      })
  }
  /**
   * processPlanItem: обработать элемент плана производства
   * @param planItemId (-> PlanItem.id) идентификатор элемента плана производства
   * @param planCalcId (-> PlanCalc.id) идентификатор калькуляции, в рамках которой делается обработка
   * @return {Promise<T> | undefined}
   */
  MRP.processPlanItem = (planItemId, planCalcId) => {
    const PlanItem = app.exModular.models.PlanItem
    const ProductStock = app.exModular.models.ProductStock
    const Stage = app.exModular.models.Stage
    const StageResource = app.exModular.models.StageResource
    const ResourceStock = app.exModular.models.ResourceStock

    const Serial = app.exModular.services.serial

    // А2.4. Берем текущую запись в плане производства
    let planItem = null
    return PlanItem.findById(planItemId)
      .then((_planItem) => {
        if (!_planItem) {
          const errMsg = `PlanItem with id ${planItemId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        planItem = _planItem

        // получаем остатки продукции на дату планирования:
        console.log('get qntForDate for planItem:')
        return ProductStock.qntForDate(planItem.productId, planItem.date)
      })
      .then((_qntForDate) => {
        if (!_qntForDate) {
          const errMsg = `Failed to get qntForDate for planItem ${planItemId} prodId ${planItem.productId}`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        console.log(_qntForDate)
        // находим сведения обо всех этапах производства нужной продукции
      })

  }
  return MRP
}

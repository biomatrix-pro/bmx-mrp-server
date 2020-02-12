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
    const Stage = app.exModular.models.Stage
    const StageResource = app.exModular.models.StageResource
    const ResourceStock = app.exModular.models.ResourceStock
    const ProductStock = app.exModular.models.ProductStock

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
        return Stage.findAll(
          {
            where: { productId: productStock.productId },
            orderBy: [{ column: 'order', order: 'asc' }]
          })
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
  MRP.processInTransfer = (resourceStockId, planCalcId) => {
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
        if (resourceStock.type !== ResourceStockType.inTransfer.value) {
          const errMsg = `MRP.processInTransfer: id ${resourceStockId} is not of "inTransfer" type`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }

        // для каждой записи о транзите ресурсов - найти поставщика
        return Vendor.findById(resourceStock.vendorId)
      })
      .then((_vendor) => {
        // проверить - нашли ли поставщика
        if (!_vendor) {
          const errMsg = `MRP.processInTransfer: vendor id ${resourceStockId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        vendor = _vendor
        console.log('Vendor:')
        console.log(vendor)
        // поставщик найден, нужно получить сведения о длительности доставки
        console.log('orderDuration:')
        console.log(vendor.orderDuration)

        // теперь необходимо сохранить сведения о поступлении ресурсов на склад в расчётную дату доставки
        const aDate = MRP.daysAdd(resourceStock.date, vendor.orderDuration, vendor.inWorkingDays)
        return ResourceStock.create({
          date: aDate.format('YYYY-MM-DD'),
          type: ResourceStockType.ordered.value,
          caption: `inTransfer ${resourceStock.id} delivery finished`,
          resourceId: resourceStock.resourceId,
          qnt: resourceStock.qnt,
          price: resourceStock.price,
          vendorId: vendor.id,
          planCalcId
        })
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
        console.log(planItem.qnt)

        // Хватает ли количества продукции на складе для выполнения плана?
        if (planItem.qnt <= _qntForDate) {
          // да, продукции хватает - фиксируем плановую отгрузку продукции для продажи
          return ProductStock.create({
            date: planItem.date,
            type: ProductStockType.sales.value,
            caption: 'Send for sales',
            productId: planItem.productId,
            qnt: -planItem.qnt,
            price: 0,
            planCalcId
          })
        } else {
          // нет, продукции не хватает. Необходимо запланировать производство продукции и зафиксировать в этом случае выполнение плана:
          return MRP.planManufacture(planItem.id, _qntForDate, planCalcId)
            .then(() => {
              // после запланированного производства партии продукции её должно хватать. На всякий случай проверим это:
              return ProductStock.qntForDate(planItem.productId, planItem.date)
            })
            .then((_newQntForDate) => {
              if (planItem.qnt <= _newQntForDate) {
                // всё ок, продукции хватает, фиксируем передачу партии товара в продажи:
                return ProductStock.create({
                  date: planItem.date,
                  type: ProductStockType.sales.value,
                  caption: 'Send for sales',
                  productId: planItem.productId,
                  qnt: -planItem.qnt,
                  price: 0,
                  planCalcId
                })
              } else {
                // проблема: продукции должно хватать, но её не хватает! Это ошибка
                const errMsg = `MRP.processPlanItem: not enought product "${planItem.productId}" qnt after
                  manufacturing: qntForDate ${_newQntForDate}, need qnt ${planItem.qnt}`
                console.log(`ERROR: ${errMsg}`)
                throw Error(errMsg)
              }
            })
            .catch((e) => { throw e })
        }
      })
      .catch((e) => { throw e })
  }

  /**
   * planManufacture: запланировать производство партии продукции
   * @param planItemId идентификатор элемента плана, для которого нужно запланировать производство партии продукции
   * @param qntForDate фактическое количество продукции на складе - оно должно быть меньше требуемого в плане
   * @param planCalcId идентификатор калькуляции, в рамках которой производится планирование
   * @return {Promise<void>} возвращаем запись из ProductStock, которая приходует партию продукции из производства
   */
  MRP.planManufacture = (planItemId, qntForDate, planCalcId) => {
    const PlanCalc = app.exModular.models.PlanCalc
    const PlanItem = app.exModular.models.PlanItem
    const Stage = app.exModular.models.Stage
    const StageResource = app.exModular.models.StageResource
    const ResourceStock = app.exModular.models.ResourceStock
    const ProductStock = app.exModular.models.ProductStock

    const Serial = app.exModular.services.serial

    let planCalc = null
    let planItem = null
    let stages = null

    // для начала получим переданные как параметры объекты:
    return PlanCalc.findById(planCalcId)
      .then((_planCalc) => {
        if (!_planCalc) {
          const errMsg = `MRP.planManufacture: PlanCalc object with id ${planCalcId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        planCalc = _planCalc // сохранили найденный объект
        return PlanItem.findById(planItemId)
      })
      .then((_planItem) => {
        if (!_planItem) {
          const errMsg = `MRP.planManufacture: PlanItem object with id ${planItemId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        planItem = _planItem // сохранили найденный объект

        // 2.5.1. Берём все этапы производства продукции:
        return Stage.findAll(
          {
            where: { productId: planItem.productId },
            orderBy: [{ column: 'order', order: 'asc' }]
          })
      })
      .then((_stages) => {
        // обработать список всех этапов производства
        stages = _stages
        if (!_stages || _stages.length < 1) {
          const errMsg = `MRP.planManufacture: Stages for product ${planItem.productId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
      })
      .catch((e) => { throw e })
  }

  /**
   * Выполнить калькуляцию MRP
   * @param planCalcId идентификатор калькуляции
   * @return {Promise<promiseSerial>}
   */
  MRP.processPlanCalc = (planCalcId) => {
    const PlanCalc = app.exModular.models.PlanCalc
    const PlanItem = app.exModular.models.PlanItem
    const ProductStock = app.exModular.models.ProductStock
    // const Stage = app.exModular.models.Stage
    // const StageResource = app.exModular.models.StageResource
    const ResourceStock = app.exModular.models.ResourceStock

    const Serial = app.exModular.services.serial

    let planCalc = null
    let sortedPlanItem = null

    return PlanCalc.findById(planCalcId)
      .then((_planCalc) => {
        planCalc = _planCalc
        if (!_planCalc) {
          const errMsg = `MRP.processPlanCalc: PlanCalc object with id ${planCalcId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }

        // А2.2. Обработать все партии ресурсов в транзите:
        return ResourceStock.findAll({
          orderBy: [{ column: 'date', order: 'asc' }],
          where: { type: ResourceStockType.inTransfer.value }
        })
      })
      .then((_resourceStock) => {
        if (_resourceStock) {
          // записи о ресурсах в транзите найдены - необходимо их обработать
          return Serial(_resourceStock.map((item) => () => MRP.processInTransfer(item.id, planCalc.id)))
        } else {
          return {}
        }
      })
      .then(() => {
        // стадия А2.3: обрабатываем продукцию в производстве. Нужно получить список
        // партий продукции в производстве
        return ProductStock.findAll({
          orderBy: [{ column: 'date', order: 'asc' }],
          where: { type: ProductStockType.inProd.value }
        })
      })
      .then((_inProd) => {
        if (_inProd) {
          // если есть партии в производстве - обработать партии в производстве
          return Serial(_inProd.map((item) => () => MRP.processInProd(item.id, planCalc.id)))
        } else {
          return {}
        }
      })
      .then(() => {
        // А2.4: обработать записи в таблице планов производства
        return PlanItem.findAll({
          orderBy: [
            { column: 'date', order: 'asc' },
            { column: 'productId', order: 'asc' }
          ]
        })
      })
      .then((_sortedPlanItems) => {
        // получены таблицы отсортированных планов производства, обработать их:
        sortedPlanItem = _sortedPlanItems
        console.log('sortedPlanItem')
        console.log(sortedPlanItem)
        return Serial(_sortedPlanItems.map((item) => () => MRP.processPlanItem(item.id, planCalc.id)))
      })
      .catch((e) => { throw e })
  }

  return MRP
}

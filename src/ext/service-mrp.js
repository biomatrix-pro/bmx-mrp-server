import moment from 'moment-business-days'
import { ResourceStockType } from './model-resource-stock'
import { ProductStock, ProductStockType } from './model-product-stock'

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
   * @param days количество - сколько дней добавлять
   * @param isWorkingDays (boolean) если true, то количество дней указано как рабочие дни, если false - то календарные
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
   * daysSubtract: вычесть из указанной дате нужное количество дней - рабочих или календарных
   * @param date исходная дата
   * @param days количество - сколько дней вычитать
   * @param isWorkingDays (boolean) если true, то количество дней указано как рабочие дни, если false - то календарные
   * @returns {Moment}
   */
  MRP.daysSubtract = (date, days, isWorkingDays) => {
    if (isWorkingDays === undefined) {
      isWorkingDays = false
    }
    const aDate = moment(date)
    if (isWorkingDays) {
      return aDate.businessSubtract(days)
    } else {
      return aDate.subtract(days, 'days')
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
   * planManufacture: запланировать производство партии продукции
   * @param planItemId идентификатор элемента плана, для которого нужно запланировать производство партии продукции
   * @param qntForDate фактическое количество продукции на складе - оно должно быть меньше требуемого в плане
   * @param planCalcId идентификатор калькуляции, в рамках которой производится планирование
   * @return {Promise<void>} возвращаем запись из ProductStock, которая приходует партию продукции из производства
   */
  MRP.planManufacture = (planItemId, qntForDate, planCalcId) => {
    const PlanCalc = app.exModular.models.PlanCalc
    const PlanItem = app.exModular.models.PlanItem
    const Product = app.exModular.models.Product
    const Stage = app.exModular.models.Stage
    const StageResource = app.exModular.models.StageResource
    const ResourceStock = app.exModular.models.ResourceStock
    // const ProductStock = app.exModular.models.ProductStock

    const Serial = app.exModular.services.serial

    let planItem = null
    let aDate = null
    let product = null
    let qntForProd = null

    // для начала получим переданные как параметры объекты:
    return PlanCalc.findById(planCalcId)
      .then((_planCalc) => {
        if (!_planCalc) {
          const errMsg = `MRP.planManufacture: PlanCalc object with id ${planCalcId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        return PlanItem.findById(planItemId)
      })
      .then((_planItem) => {
        if (!_planItem) {
          const errMsg = `MRP.planManufacture: PlanItem object with id ${planItemId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        planItem = _planItem // сохранили найденный объект

        // сохраним стартовую дату - это дата готовности партии продукции
        aDate = moment(planItem.date)

        // получим продукт, который планируем производить
        return Product.findById(planItem.productId)
      })
      .then((_product) => {
        if (!_product) {
          const errMsg = `MRP.planManufacture: Product with id ${planItem.productId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        product = _product

        // необходимо расcчитать количество продукта для производства:
        if (qntForDate >= planItem.qnt) {
          // ошибка: количество продукта должно быть меньше, чем на складе
          const errMsg = `MRP.planManufacture: product qntForDate ${qntForDate} should be less than planItem.qnt ${planItem.qnt}!`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        // проверим параметры продукта для расчёта количества
        if (!product.qntMin) {
          product.qntMin = 0
        }

        if (!product.qntStep || product.qntStep < 1) {
          product.qntStep = 1
        }

        // начинаем расчёт с минимальной партии
        qntForProd = product.qntMin

        // до тех пор, пока не запланировано производство достаточного объема продукции для покрытия плана,
        while (qntForProd + qntForDate < planItem.qnt) {
          qntForProd += product.qntStep // увеличиваем партию производства на указанную величину
        }

        // log
        console.log(`qntForProd: ${qntForProd}`)

        // 2.5.1. Берём все этапы производства продукции:
        return Stage.findAll(
          {
            where: { productId: planItem.productId },
            orderBy: [{ column: 'order', order: 'asc' }]
          })
      })
      .then((_stages) => {
        // обработать список всех этапов производства
        if (!_stages || _stages.length < 1) {
          const errMsg = `MRP.planManufacture: Stages for product ${planItem.productId} not found`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        return Serial(_stages.map((stage) => () => {
          // для каждого этапа:
          // вычислим дату начала этапа:
          aDate = MRP.daysSubtract(aDate, stage.duration, stage.inWorkingDays)

          // log:
          console.log(`stage: ${stage.id}, date start: ${aDate.format('YYYY-MM-DD')}`)

          // если дата начала этапа менее текущей - это ошибка
          if (aDate.isBefore(Date.now())) {
            const errMsg = 'MRP.planManufacture: Date was past for planning'
            console.log(`ERROR: ${errMsg}`)
            throw Error(errMsg)
          }

          // 2.5.3: получаем список ресурсов
          return StageResource.findAll({ where: { stageId: stage.id } })
            .then((_stageResources) => {
              // обработать список ресурсов
              // для каждого требуемого на данной стадии ресурса:
              return Serial(_stageResources.map((stageResource) => () => {
                // обработать ресурс
                // проверить остатки ресурса на заданную дату:
                let qntForStage = 0

                console.log(`Stage: resId ${stageResource.resourceId}, date ${aDate.format()}`)
                return ResourceStock.resourceQntForDate(stageResource.resourceId, aDate)
                  .then((_qntForDate) => {
                    console.log('_resQntForDate:')
                    console.log(_qntForDate)

                    // рассчитать требуемое количество ресурсов для данного этапа
                    qntForStage = qntForProd * stageResource.qnt / stage.baseQnt
                    if (qntForStage > _qntForDate) {
                      // 2.5.3.1. ресурсов недостаточно, нужно планировать поставку партии ресурсов:
                      return MRP.planResOrder(stageResource.resourceId, aDate, qntForStage, _qntForDate, planCalcId)
                        .then(() => ResourceStock.resourceQntForDate(stageResource.resourceId, aDate))
                        .then((_qntForDate2) => {
                          // проверим что ресурсов теперь, после оформления заказа, должно хватать:
                          if (qntForStage > _qntForDate2) {
                            const errMsg = 'MRP.planManufacture: qntForDate less then qntForStage even after order!'
                            console.log(`ERROR: ${errMsg}`)
                            throw Error(errMsg)
                          }
                        })
                        .catch((e) => { throw e })
                    } else {
                      return {}
                    }
                  })
                  .then(() => {
                    // списать ресурсы, использованные для этого этапа производства
                    return ResourceStock.create({
                      type: ResourceStockType.used.value,
                      resourceId: stageResource.resourceId,
                      date: stage.date,
                      qnt: -qntForStage,
                      caption: 'In-prod, use res',
                      planCalcId
                    })
                  })
              }))
            })
        }))
      })
      .then(() => {
        // необходимо оприходовать партию произведенной продукции
        return ProductStock.create({
          date: aDate.format('YYYY-MM-DD'),
          type: ProductStockType.prod.value,
          caption: 'Produced',
          productId: planItem.productId,
          qnt: qntForProd,
          price: 0,
          planCalcId
        })
      })
      .catch((e) => { throw e })
  }

  /**
   * vendorSelect: выбрать поставщика ресурса на указанную дату
   * @param resourceId (-> Resource.id) идентификатор ресурса для выбора поставщика
   * @param date (moment?) дата завершения поставки, на которую нужно выбрать поставщика
   * @returns {Promise<Vendor>} промис разрешается записью поставщика (Vendor)
   */
  MRP.vendorSelect = (resourceId, date) => {
    const Vendor = app.exModular.models.Vendor

    // А2.6.1: выбираем поставщика
    // получим список всех вендоров этого ресурса в обратном хронологическом порядке
    return Vendor.findAll({
      where: { resourceId },
      orderBy: [{ column: 'date', order: 'desc' }]
    })
      .then((_vendors) => {
        if (!_vendors) {
          const errMsg = `MRP.vendorSelect: vendor list is empty for resource ${resourceId} at date ${moment(date).format('YYYY-MM-DD')}`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        let theVendor = null
        // список вендоров получен, выбрать в нём нужного по дате:
        for (let ndx = 0; ndx < _vendors.length; ndx++) {
          // для каждого вендора:
          const vendor = _vendors[ndx]
          // рассчитать дату начала заказа:
          const orderStart = MRP.daysSubtract(date, vendor.orderDuration, vendor.inWorkingDays)
          if (moment(orderStart).isSameOrAfter(vendor.date)) {
            // мы нашли поставщика
            theVendor = vendor
            break
          }
          // иначе переходим к следующему по хронологии поставщику
        }

        if (!theVendor) {
          const errMsg = `MRP.vendorSelect: unable to find vendor for resource ${resourceId} at date ${moment(date).format('YYYY-MM-DD')}`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }
        return theVendor
      })
      .catch((e) => { throw e })
  }

  /**
   * planResOrder: планировать поставку партии ресурсов (WIP)
   * @param resourceId (-> Resource.id) ресурс, поставку которого мы планируем
   * @param date (дата) дата, к которой ресурс должен был быть поставлен
   * @param qntForStage количество ресурса, требуемое для производства
   * @param qntForDate фактическое количество ресурсов на данную дату
   * @param planCalcId (-> PlanCalc.id) идентификатор калькуляции MRP, с которой связан этот план поставки
   * @returns {Promise<T>}
   */
  MRP.planResOrder = (resourceId, date, qntForStage, qntForDate, planCalcId) => {
    const ResourceStock = app.exModular.models.ResourceStock

    let vendor = null
    const aDate = moment(date)
    let orderStart = null

    // А2.6.1: отыскиваем поставщика:
    return MRP.vendorSelect(resourceId, date)
      .then((_vendor) => {
        if (!_vendor) {
          const errMsg = `MRP.planResOrder: can not find vendor for resource ${resourceId} at date ${moment(date).format('YYYY-MM-DD')}`
          console.log(`ERROR: ${errMsg}`)
          throw Error(errMsg)
        }

        // поставщик найден
        vendor = _vendor
        console.log(`Selected vendor ${vendor.caption} for resource ${resourceId} for date ${moment(date).format('YYYY-MM-DD')}`)
        console.log(`Duration: ${vendor.orderDuration}`)

        // рассчитаем период заказа - дата начала заказа:
        orderStart = MRP.daysSubtract(date, vendor.orderDuration, vendor.inWorkingDays)

        // теперь нужно получить список заказов этого поставщика, который приходится на период заказа
        return ResourceStock.findAll({
          where: { type: ResourceStockType.ordered.value, resourceId, vendorId: vendor.id },
          whereOp: [
            { column: 'date', op: '>=', value: orderStart.format('YYYY-MM-DD') },
            { column: 'date', op: '<=', value: aDate.format('YYYY-MM-DD') }
          ],
          orderBy: [{ column: 'date', order: 'desc' }]
        })
      })
      .then((_resStock) => {
        // сначала проверим параметры заказа у вендора
        if (vendor.orderMin < 0) {
          vendor.orderMin = 0
        }
        if (vendor.orderStep < 1) {
          vendor.orderStep = 1
        }

        console.log('_resStock:')
        console.log(_resStock)

        // получили список заказов, которые поступают в дату нового заказа
        if (!_resStock || _resStock.length === 0) {
          // таких заказов нет - нужно просто разместить новый заказ:
          // рассчитаем количество ресурсов в заказе на основании минимального количества и шага:
          let orderQnt = vendor.orderMin
          while (qntForDate + orderQnt < qntForStage) {
            orderQnt += vendor.orderStep
          }

          // добавим в записи о партиях ресурсов 2 записи - первая о заказе, вторая о доставке
          return ResourceStock.create({
            date: orderStart.format('YYYY-MM-DD'), // дата заказа
            type: ResourceStockType.inTransfer.value,
            caption: `resOrder: inTransfer order for qntForStage ${qntForStage}`,
            resourceId,
            qnt: orderQnt,
            qntReq: qntForStage,
            price: vendor.price,
            vendorId: vendor.id,
            planCalcId
          })
            .then((_inTransferStock) => ResourceStock.create({
              date: aDate.format('YYYY-MM-DD'), // дата поступления
              type: ResourceStockType.ordered.value,
              caption: `resOrder: ordered for qntForStage ${qntForStage}`,
              resourceId,
              qnt: orderQnt,
              qntReq: qntForStage,
              price: vendor.price,
              vendorId: vendor.id,
              inTransferId: _inTransferStock.id, // ссылка на запись о заказе
              planCalcId
            }))
        } else {
          // есть запись о ресурсах,  поступающих в нужный период:
          if (_resStock.length > 1) {
            console.log('WARNING! Multiply records found — strange!')
          }
          let resOrder = _resStock[0] // берем самую первую найденную запись

          // берём текущий заказ и увеличиваем его:
          // теперь должно хватать на потребность прошлого заказа и текущего
          let orderQnt = vendor.orderMin
          while (qntForDate + orderQnt < (qntForStage + resOrder.qntReq)) {
            orderQnt += vendor.orderStep
          }
          resOrder.qnt = orderQnt
          resOrder.qntReq = (qntForStage + resOrder.qntReq)

          // обновим данные о заказе:
          return ResourceStock.update(resOrder)
            .then((_resOrder) => {
              resOrder = _resOrder
              return ResourceStock.findById(resOrder.inTransferId)
            })
            .then((_inTransfer) => {
              if (!_inTransfer) {
                console.log(`WARNING! Not found inTransfer for order ${resOrder.id}`)
                return {}
              } else {
                _inTransfer.qnt = orderQnt
                _inTransfer.qntReq = (qntForStage + resOrder.qntReq)
                return ResourceStock.update(_inTransfer)
              }
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
   * @returns промис с записью об обработанном транзите
   */
  MRP.processInTransfer = (resourceStockId, planCalcId) => {
    const ResourceStock = app.exModular.models.ResourceStock
    const Vendor = app.exModular.models.Vendor

    let resourceStock = null
    let vendor = null
    // найти запись о заказе партии:
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
          inTransferId: resourceStock.id,
          planCalcId
        })
      })
  }
  /**
   * processPlanItem: обработать элемент плана производства
   * @param planItemId (-> PlanItem.id) идентификатор элемента плана производства
   * @param planCalcId (-> PlanCalc.id) идентификатор калькуляции, в рамках которой делается обработка
   * @return промис с записью ProductStock о запланированном производстве
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

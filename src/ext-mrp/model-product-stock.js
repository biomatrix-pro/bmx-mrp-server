import { v4 as uuid } from 'uuid'
import moment from 'moment-business-days'

export const ProductStockType = {
  unknown: { value: 0, caption: '(unknown)' },
  initial: { value: 1, caption: 'initial' },
  inProd: { value: 2, caption: 'in-prod' },
  prod: { value: 3, caption: 'prod' },
  sales: { value: 4, caption: 'sales' }
}

export const ProductStock = () => {
  const Model = {
    name: 'ProductStock',
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
        format: 'DD/MM/YYYY',
        default: () => Date.now()
      },
      {
        name: 'type',
        type: 'enum',
        format: [
          ProductStockType.unknown,
          ProductStockType.initial,
          ProductStockType.inProd,
          ProductStockType.prod,
          ProductStockType.sales
        ],
        default: ProductStockType.unknown.value
      },
      {
        name: 'caption',
        type: 'text',
        caption: 'Описание',
        format: 'text',
        default: ''
      },
      {
        name: 'productId',
        type: 'ref',
        model: 'Product',
        default: null
      },
      {
        name: 'qnt',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
      },
      {
        name: 'price',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
      },
      {
        name: 'planCalcId',
        type: 'ref',
        model: 'PlanCalc',
        description: 'Калькуляция к которой относится эта запись',
        default: null
      }
    ]
  }

  /**
   * qntForDate: получить количество продукции на указанный момент времени
   * @param prodId (-> Product.id) идентификатор продукции
   * @param date (Date | Moment) указанный момент времени
   * @param types (Array) массив типов записей, которые необходимо учитывать
   * @return {Promise<unknown>} возвращает промис, разрешающийся количеством
   */
  Model.qntForDate = (prodId, date, types) => {
    if (!types) {
      types = [ProductStockType.initial.value, ProductStockType.prod.value, ProductStockType.sales.value]
    }
    if (!Array.isArray(types)) {
      types = [types]
    }
    const knex = Model.storage.db
    const aDate = moment(date)

    return knex(Model.name)
      .sum({ sq: ['qnt'] })
      .whereIn('type', types)
      .andWhere('date', '<', aDate.format('YYYY-DD-MM'))
      .andWhere({ productId: prodId })
      .then((res) => {
        if (!res || !Array.isArray(res) || !res[0].sq) {
          return 0
        }
        return res[0].sq
      })
      .catch((e) => { throw e })
  }
  return Model
}

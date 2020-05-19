import { v4 as uuid } from 'uuid'
import moment from 'moment-business-days'

export const ResourceStockType = {
  unknown: { value: 0, caption: '(unknown)' },
  initial: { value: 1, caption: 'initial' },
  inTransfer: { value: 2, caption: 'in-transfer' },
  ordered: { value: 3, caption: 'ordered' },
  used: { value: 4, caption: 'used' }
}

export const ResourceStock = (app) => {
  const Model = {
    name: 'ResourceStock',
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
        name: 'type',
        type: 'enum',
        format: [
          ResourceStockType.unknown,
          ResourceStockType.initial,
          ResourceStockType.inTransfer,
          ResourceStockType.ordered,
          ResourceStockType.used
        ],
        default: ResourceStockType.unknown.value
      },
      {
        name: 'resourceId',
        type: 'ref',
        caption: 'Ресурс',
        description: 'Ресурс, движение которого регистрируется',
        model: 'Resource',
        default: null
      },
      {
        name: 'date',
        type: 'datetime',
        caption: 'Дата',
        description: 'Дата операции с ресурсом',
        format: 'DD/MM/YYYY',
        default: () => Date.now()
      },
      {
        name: 'qnt',
        type: 'decimal',
        caption: 'Количество',
        description: 'Количество ресурса, которое регистрируется',
        precision: 12,
        scale: 2,
        default: 0
      },
      {
        name: 'price',
        type: 'decimal',
        caption: 'Цена',
        description: 'Цена ресурса по регистрируемой операции',
        precision: 12,
        scale: 2,
        default: 0
      },
      {
        name: 'vendorId',
        type: 'ref',
        caption: 'Поставщик',
        description: 'Поставщик (если применимо)',
        model: 'Vendor',
        default: null
      },
      {
        name: 'caption',
        type: 'text',
        caption: 'Описание',
        format: 'text',
        default: ''
      },
      {
        name: 'planCalcId',
        type: 'ref',
        caption: 'Калькуляция',
        description: 'Калькуляция, в рамках которой добавлена запись о движении ресурсов',
        model: 'PlanCalc',
        default: null
      },
      {
        name: 'qntReq',
        type: 'decimal',
        caption: 'Потребность',
        description: 'Количество ресурса, которое необходимо для производства - справочно',
        precision: 12,
        scale: 2,
        default: 0
      },
      {
        name: 'inTransferId',
        type: 'ref',
        caption: 'Заказ',
        description: 'Заказ ресурсов в статусе транзит, с которым связана эта партия',
        model: 'ResourceStock',
        default: null
      }
    ]
  }

  /**
   * resourceQntForDate: получить количество указанного ресурса на указанный момент времени
   * @param resId (-> Resource.id) идентификатор ресурса
   * @param date (Date | Moment) указанный момент времени
   * @param types (Array, optional) типы записей, которые следует учитывать
   * @return {Promise<unknown>} возвращает промис, разрешающийся количеством ресурса
   */
  Model.resourceQntForDate = (resId, date, types) => {
    if (!types) {
      types = [
        ResourceStockType.initial.value,
        ResourceStockType.ordered.value,
        ResourceStockType.used.value
      ]
    }
    const knex = Model.storage.db
    const aDate = moment(date)

    return knex(Model.name)
      .sum({ sq: ['qnt'] })
      .where('date', '<', aDate.format('YYYY-DD-MM'))
      .andWhere({ resourceId: resId })
      .then((res) => {
        if (!res || !Array.isArray(res) || !res[0].sq) {
          return 0
        }
        return res[0].sq
      })
  }
  return Model
}

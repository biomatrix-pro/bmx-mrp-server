import uuid from 'uuid/v4'

export const ResourceStockType = {
  unknown: { value: 0, caption: '(unknown)' },
  initial: { value: 1, caption: 'initial' },
  inTransfer: { value: 2, caption: 'in-transfer' },
  ordered: { value: 3, caption: 'ordered' },
  used: { value: 4, caption: 'used' }
}

export const ProductStock = () => {
  return {
    name: 'ProductStock',
    priority: 0,
    props: [
      {
        name: 'id',
        type: 'id',
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
        model: 'Resource',
        default: null
      },
      {
        name: 'date',
        type: 'datetime',
        format: 'DD/MM/YYYY',
        default: () => Date.now()
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
        name: 'vendorId',
        type: 'ref',
        caption: 'Поставщик',
        model: 'Vendor',
        default: null
      },
      {
        name: 'caption',
        type: 'text',
        caption: 'Описание',
        format: 'text',
        default: ''
      }
    ]
  }
}

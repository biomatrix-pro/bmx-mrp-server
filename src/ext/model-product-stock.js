import uuid from 'uuid/v4'

export const ProductStockType = {
  unknown: { value: 0, caption: '(unknown)' },
  initial: { value: 1, caption: 'initial' },
  inProd: { value: 2, caption: 'in-prod' },
  prod: { value: 3, caption: 'prod' },
  sales: { value: 4, caption: 'sales' }
}

export const ProductStock = () => {
  return {
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
        name: 'caption',
        type: 'text',
        caption: 'Описание',
        format: 'text',
        default: ''
      },
      {
        name: 'date',
        type: 'datetime',
        format: 'DD/MM/YYYY',
        default: () => Date.now()
      },
      {
        name: 'productId',
        type: 'ref',
        model: 'Product',
        default: null
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
      }
    ]
  }
}

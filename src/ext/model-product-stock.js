import uuid from 'uuid/v4'

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
  Model.processProd = (productStockId, planCalcId) => {
    const ProductStock = app.exModular.models.ProductStock
    const Stages = app.exModular.models.Stages
    let productStock = null
    let stages = null

    return ProductStock.findById(productStockId)
      .then((_productStock) => {
        productStock = _productStock
        // для каждой партии продукции в производство: получить этапы производства (в порядке следования очередности)
        // для данного вида продукции:
        return Stages.findAll({ where: { productId: productStock.productId } })
      })
      .then((_stages) => {
        stages = _stages
        // получить список ресурсов, требуемых для данного этапа производства
      })
  }
  return Model
}

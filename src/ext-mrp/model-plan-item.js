import { v4 as uuid } from 'uuid'

export const PlanItem = (app) => {
  const aPlanItem = {
    name: 'PlanItem',
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
        description: 'План, к которому относится этот элемент',
        model: 'Plan',
        default: null
      },
      {
        name: 'date',
        type: 'datetime',
        caption: 'Дата',
        description: 'Дата передачи продукции для сбыта',
        format: 'DD/MM/YYYY',
        default: () => Date.now()
      },
      {
        name: 'caption',
        type: 'text',
        caption: 'Описание',
        format: 'text',
        size: 127,
        default: ''
      },
      {
        name: 'productId',
        type: 'ref',
        caption: 'Продукт',
        description: 'Продукт, выпуск которого планируется',
        model: 'Product',
        default: null
      },
      {
        name: 'qnt',
        type: 'decimal',
        caption: 'Количество',
        description: 'Количество продукции, которое должно быть доступно на складе',
        format: '',
        precision: 12,
        scale: 2,
        default: ''
      }
    ]
  }
  return aPlanItem
}

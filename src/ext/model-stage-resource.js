import uuid from 'uuid/v4'

export const StageResource = () => {
  return {
    name: 'StageResource',
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
        name: 'resourceId',
        type: 'ref',
        caption: 'Ресурс',
        description: 'Ресурс, затрачиваемый в ходе этапа',
        model: 'Resource',
        default: null
      },
      {
        name: 'stageId',
        type: 'ref',
        caption: 'Этап',
        description: 'Этап, к которому относится использование ресурса',
        model: 'Stage',
        default: null
      },
      {
        name: 'qnt',
        type: 'decimal',
        caption: 'Количество',
        description: 'Количество потребляемого ресурса для выпуска количества продукции, указанного как базовое в этапе',
        precision: 14,
        scale: 4,
        default: 0
      }
    ]
  }
}

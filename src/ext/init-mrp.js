export const deployGoodCarRent = 'ba59f20d-7d3b-462c-9e6e-00f24b8bdd7e'
export const deployBetaGoodCarRent = 'a26b55fa-d7e3-4e1f-83a0-d14993ed75e0'

export const InitMrp = (app) => () => {
  return app.exModular.services.seed('Product', 'product.json')
    .then(() => app.exModular.services.seed('Plan', 'plan.json', { upsert: true }))
    .then(() => app.exModular.services.seed('PlanItem', 'plan-item.json', { upsert: true }))
    .then(() => app.exModular.services.seed('ProductStock', 'product-stock.json', { upsert: true }))
    .then(() => app.exModular.services.seed('Resource', 'resource.json', { upsert: true }))
    .then(() => app.exModular.services.seed('Stage', 'stage.json', { upsert: true }))
    .then(() => app.exModular.services.seed('Vendor', 'vendor.json', { upsert: true }))
    .then(() => app.exModular.services.seed('StageResource', 'stage-resource.json', { upsert: true }))
    .then(() => app.exModular.services.seed('ResourceStock', 'resource-stock.json', { upsert: true }))
  /*
  return Promise.resolve()
    .then(() => app.exModular.models.Product.count())
    .then((count) => {
      if (!count || count === 0) {
        return app.exModular.models.Product.create({
          id: 'bmx-fl',
          caption: 'Biomatrix',
          unit: 'фл 6мл',
          qntMin: 1000.0,
          qntStep: 100,
          comments: 'Biomatrix, флаконы 6мл'
        })
          .then(() => app.exModular.models.Product.create({
            id: 'bmx-am',
            caption: 'Biomatrix',
            unit: 'ам 2мл',
            qntMin: 1000.51,
            qntStep: 100,
            comments: 'Biomatrix, ампулы 2мл'
          }))
      }
    })
    .catch((e) => {
      throw e
    })
   */
}

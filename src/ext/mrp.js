import { Product } from './model-product'
import { ProductStock } from './model-product-stock'
import { InitMrp } from './init-mrp'
import { InitUsers } from './init-users'

const packageName = 'Mrp'

export const Mrp = (app, opt) => {
  app.exModular.modules.Add({
    moduleName: packageName,
    dependency: [
      'models',
      'modelAdd',
      'initAdd'
    ]
  })

  app.exModular.modelAdd(Product(app))
  app.exModular.modelAdd(ProductStock(app))

  app.exModular.initAdd(InitUsers(app))
  app.exModular.initAdd(InitMrp(app))

  return app
}

import { Plan } from './model-plan'
import { PlanItem } from './model-plan-item'
import { PlanCalc } from './model-plan-calc'
import { Product } from './model-product'
import { ProductStock } from './model-product-stock'
import { Resource } from './model-resource'
import { ResourceStock } from './model-resource-stock'
import { Stage } from './model-stage'
import { StageResource } from './model-stage-resource'
import { Vendor } from './model-vendor'

import { InitMrp } from './init-mrp'
import { InitUsers } from './init-users'

import { MRP } from './service-mrp'

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

  app.exModular.modelAdd(Plan(app))
  app.exModular.modelAdd(PlanItem(app))
  app.exModular.modelAdd(PlanCalc(app))
  app.exModular.modelAdd(Product(app))
  app.exModular.modelAdd(ProductStock(app))
  app.exModular.modelAdd(Resource(app))
  app.exModular.modelAdd(ResourceStock(app))
  app.exModular.modelAdd(Stage(app))
  app.exModular.modelAdd(StageResource(app))
  app.exModular.modelAdd(Vendor(app))

  app.exModular.services.MRP = MRP(app)

  app.exModular.initAdd(InitUsers(app))
  app.exModular.initAdd(InitMrp(app))

  return app
}

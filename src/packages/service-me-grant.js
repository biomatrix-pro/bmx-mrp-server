const packageName = 'Service.MeGrant'

export const MRP = (app) => {
  app.exModular.modules.Add({
    moduleName: packageName,
    dependency: [
      'models',
      'models.ProductStock',
      'models.Stage',
      'models.StageResource',
      'models.ResourceStock'
    ]
  })
  const MeGrant = {}

  MeGrant.create = () => {
  }

  return MeGrant
}

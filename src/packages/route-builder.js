import _ from 'lodash'

const packageName = 'route-builder package'

export const listRouteName = 'list'
export const createRouteName = 'create'
export const removeAllRouteName = 'removeAll'
export const itemRouteName = 'item'
export const saveRouteName = 'save'
export const removeRouteName = 'remove'

export const crudRoutes = [
  listRouteName,
  createRouteName,
  removeAllRouteName,
  itemRouteName,
  saveRouteName,
  removeRouteName
]

export const routeList = (app, Model) => {
  const objectName = `${Model.name}.${listRouteName}`
  return {
    method: 'GET',
    name: objectName,
    description: `Get list of "${Model.name}"`,
    path: `/${Model.name.toLowerCase()}`,
    handler: app.exModular.services.controller.list(Model),
    validate: [
      app.exModular.auth.check,
      app.exModular.access.check(objectName),
      app.exModular.services.validator.listFilterValidator(Model)
    ]
  }
}

export const routeCreate = (app, Model) => {
  const objectName = `${Model.name}.${createRouteName}`
  return {
    method: 'POST',
    name: objectName,
    description: `Create new "${Model.name}"`,
    path: `/${Model.name.toLowerCase()}`,
    handler: app.exModular.services.controller.create(Model),
    validate: [
      app.exModular.auth.check,
      app.exModular.access.check(objectName),
      app.exModular.services.validator.checkBodyForArrayOfModel(Model, { optionalId: true })
    ]
  }
}

export const routeRemoveAll = (app, Model) => {
  const objectName = `${Model.name}.${removeAllRouteName}`
  return {
    method: 'DELETE',
    name: objectName,
    description: `Delete all items from "${Model.name}"`,
    path: `/${Model.name.toLowerCase()}`,
    handler: app.exModular.services.controller.removeAll(Model),
    validate: [
      app.exModular.auth.check,
      app.exModular.access.check(objectName)
    ]
  }
}

export const routeItemForRefs = (app, Model) => {
  const r = []

  r.push(_.filter(Model.props, { type: 'refs' }).map((prop) => {
    return [
      {
        method: 'POST',
        name: `${Model.name}.${prop.name}.${createRouteName}`,
        description: `Add item[s] to refs field "${Model.name}.${prop.name}"`,
        path: `/${Model.name.toLowerCase()}/:id/${prop.name.toLowerCase()}`,
        handler: app.exModular.services.controller.refsCreate(Model, prop),
        validate: [
          app.exModular.auth.check,
          app.exModular.access.check(`${Model.name}.${createRouteName}`),
          app.exModular.services.validator.paramId(Model),
          app.exModular.services.validator.checkBodyForArrayOfRefs(Model, prop)
        ]
      }
    ]
  }))
  return r
}

export const routeItem = (app, Model) => {
  const objectName = `${Model.name}.${itemRouteName}`
  return [
    {
      method: 'GET',
      name: objectName,
      description: `Get single item of "${Model.name}" by id`,
      path: `/${Model.name.toLowerCase()}/:id`,
      handler: app.exModular.services.controller.item(Model),
      validate: [
        app.exModular.auth.check,
        app.exModular.access.check(objectName),
        app.exModular.services.validator.paramId(Model)
      ]
    },
    routeItemForRefs(app, Model)
  ]
}

export const routeSave = (app, Model) => {
  const objectName = `${Model.name}.${saveRouteName}`
  return {
    method: 'PUT',
    name: objectName,
    description: `Save (update) single item in "${Model.name}"`,
    path: `/${Model.name.toLowerCase()}/:id`,
    handler: app.exModular.services.controller.save(Model),
    validate: [
      app.exModular.auth.check,
      app.exModular.access.check(objectName),
      app.exModular.services.validator.paramId(Model),
      app.exModular.services.validator.checkBodyForModel(Model)
    ]
  }
}

export const routeRemove = (app, Model) => {
  const objectName = `${Model.name}.${removeRouteName}`
  return {
    method: 'DELETE',
    name: objectName,
    description: `Delete single item in "${Model.name}" by id`,
    path: `/${Model.name.toLowerCase()}/:id`,
    handler: app.exModular.services.controller.remove(Model),
    validate: [
      app.exModular.auth.check,
      app.exModular.access.check(objectName),
      app.exModular.services.validator.paramId(Model)
    ]
  }
}

export const RouteBuilder = (app) => {
  app.exModular.modules.Add({
    moduleName: packageName,
    dependency: [
      'services.errors',
      'services.errors.ServerError',
      'services.errors.ServerGenericError',
      'services.errors.ServerInvalidParameters',
      'services.errors.ServerNotFound',
      'services.validator',
      'services.validator.paramId',
      'services.validator.checkBodyForModel',
      'services.controller',
      'services.controller.list',
      'services.controller.create',
      'services.controller.save',
      'services.controller.item',
      'services.controller.remove',
      'services.controller.removeAll',
      'models',
      'express',
      'services.wrap'
    ]
  })

  const routesForModel = (model, opt) => {
    // if no opt specified - generate all crud routes
    if (!opt) {
      opt = crudRoutes
    }

    // if only one route name specified - make it array with single item
    if (!Array.isArray(opt)) {
      opt = [opt]
    }

    // model should be provided
    if (!model) {
      throw new Error('generateRoute: invalid model param')
    }

    // generate routes and register them
    app.exModular.routes.Add(opt.map((routeName) => {
      switch (routeName) {
        case listRouteName: return routeList(app, model)
        case createRouteName: return routeCreate(app, model)
        case itemRouteName: return routeItem(app, model)
        case saveRouteName: return routeSave(app, model)
        case removeRouteName: return routeRemove(app, model)
        case removeAllRouteName: return routeRemoveAll(app, model)
      }
      throw new Error(`generateRoute: invalid routeName ${routeName}`)
    }))
  }

  const routesForAllModels = () => {
    const keys = Object.keys(app.exModular.models)
    keys.map((modelName) => {
      const model = app.exModular.models[modelName]
      app.exModular.routes.Add(routesForModel(model))
    })
    return app
  }

  const generateRoutes = () => {
    const Wrap = app.exModular.services.wrap

    return Promise.resolve()
      .then(() => {
        app.exModular.routes.map((route) => {
          let handlers = []

          if (route.before) {
            if (!Array.isArray(route.before)) {
              route.before = [route.before]
            }
            handlers = _.concat(handlers, _.flattenDeep(route.before))
          }

          if (route.validate) {
            if (!Array.isArray(route.validate)) {
              route.validate = [route.validate]
            }
            handlers = _.concat(handlers, _.flattenDeep(route.validate))
          }

          if (route.handler) {
            handlers = _.concat(handlers, Wrap(route.handler))
          }

          if (route.after) {
            if (!Array.isArray(route.after)) {
              route.after = [route.after]
            }
            handlers = _.concat(handlers, _.flattenDeep(route.after))
          }

          switch (route.method) {
            case 'GET':
              app.get(route.path, handlers)
              break
            case 'POST':
              app.post(route.path, handlers)
              break
            case 'PUT':
              app.put(route.path, handlers)
              break
            case 'DELETE':
              app.delete(route.path, handlers)
              break
            case 'ALL':
              app.all(route.path, handlers)
              break
          }
        })
      })
      .then(() => {
        if (app.exModular.services.errors.handler) {
          app.use(app.exModular.services.errors.handler)
        }
      })
      .then(() => app)
      .catch((e) => { throw e })
  }

  return {
    forModel: routesForModel,
    forAllModels: routesForAllModels,
    generateRoutes
  }
}

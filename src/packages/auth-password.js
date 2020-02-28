const packageName = 'Auth-password'

export const AuthPassword = (app) => {
  const Module = {
    moduleName: packageName,
    dependency: [
      'services.errors',
      'services.errors.ServerError',
      'services.errors.ServerGenericError',
      'services.validator',
      'services.validator.checkBodyForModelName',
      'services.validator.paramId',
      'models',
      'models.User',
      'models.User.create',
      'models.User.count',
      'access.addAdmin',
      'routes.Add'
    ],
    module: {}
  }

  app.exModular.modules.Add(Module)

  const Errors = app.exModular.services.errors
  const User = app.exModular.models.User
  const Session = app.exModular.models.Session

  Module.module.login = (req, res) => {
    if (!req.data) {
      throw new Errors.ServerGenericError(
        `${packageName}.signup: Invalid request handling: req.data not initialized, use middleware to parse body`)
    }

    let user = null

    return User.findOne({ where: { email: req.data.email } })
      .then((aUser) => {
        user = aUser
        if (!user) {
          throw new Errors.ServerInvalidUsernamePassword('Invalid username or password')
        }

        if (user.disabled) {
          throw new Errors.ServerNotAllowed('User is disabled')
        }

        // if (!user.emailVerified) {
        //  throw new ServerNotAllowed('Email should be verified')
        // }

        if (!User.isPassword(user.password, req.data.password)) {
          throw new Errors.ServerInvalidUsernamePassword('Invalid username or password') // password error
        }

        return Session.createOrUpdate({ userId: user.id, ip: req.ip })
      })
      .then((session) => {
        res.json({ token: app.exModular.auth.encode(session.id) })
        return app.exModular.access.registerLoggedUser(user)
      })
      .catch((error) => {
        // console.log('login: error')
        // console.log(error)
        if (error instanceof Errors.ServerError) {
          throw error
        } else {
          throw new Errors.ServerGenericError(error)
        }
      })
  }

  Module.module.logout = (req, res) => {
    // console.log('Auth.Logout')
    if (!req || !req.user || !req.user.session) {
      return new Errors.ServerNotAllowed('User session not found')
    }

    // console.log(`finding login id=${req.user.loginId}`)
    return Session.findById(req.user.session.id)
      .then((session) => {
        // console.log(`Login found: ${login}`)
        if (!session) {
          return new Errors.ServerNotAllowed('Session not found')
        }

        // destroy current session
        // remove current user from logged-in group
        return Promise.all([
          Session.removeById(session.id),
          app.exModular.access.unregisterLoggedUser(req.user)
        ])
      })
      .then((data) => {
        res.status(200).send()
        return Promise.resolve()
      })
      .catch((error) => {
        // console.log('login: error')
        // console.log(error)
        if (error instanceof Errors.ServerError) {
          throw error
        } else {
          throw new Errors.ServerGenericError(error)
        }
      })
  }

  const Validator = app.exModular.services.validator
  // define routes for this module
  Module.module.routes = [
    {
      method: 'POST',
      name: 'Auth.Login',
      description: 'Login via username/password, return token',
      path: '/auth/login',
      handler: Module.module.login,
      validate: Validator.checkBodyForModel({
        name: 'AuthPassword',
        props: [
          {
            name: 'email',
            type: 'text',
            format: 'email',
            default: null
          },
          {
            name: 'password',
            type: 'text',
            format: 'password',
            default: null
          }
        ]
      }, { optionalId: true }),
      /*
      beforeHandler: [ app.exModular.auth.optional ],
      */
      type: 'Auth',
      object: 'Login'
    },
    {
      method: 'GET',
      name: 'Auth.Logout',
      path: '/auth/logout',
      handler: Module.module.logout,
      validate: app.exModular.auth.check,
      type: 'Auth',
      object: 'Logout'
    }
  ]

  app.exModular.routes.Add(Module.module.routes)

  return app
}

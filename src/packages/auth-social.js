
import fetch, { Request, Headers, FormData } from 'node-fetch'
import { URLSearchParams } from 'url'

const packageName = 'auth-social'

export const AuthSocial = (app) => {
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

  Module.module.loginSocial = (req, res, next) => {
    if (!req.data) {
      throw new Errors.ServerGenericError(
        `${packageName}.loginSocial: Invalid request handling: req.data not initialized, use middleware to parse body`)
    }

    if (!req.data.code) {
      throw new Errors.ServerGenericError(
        `${packageName}.loginSocial: code param is invalid`)
    }

    if (!req.params.provider) {
      throw new Errors.ServerInvalidParameters(
        'req.params.provider',
        '',
        `${packageName}.loginSocial: no req.params.provider`)
    }

    const body = new URLSearchParams()
    body.append('grant_type', 'authorization_code')
    body.append('code', req.data.code)
    body.append('client_id', process.env.SOCIAL_YANDEX_APP)
    body.append('client_secret', process.env.SOCIAL_YANDEX_SECRET)

    const request = new Request('https://oauth.yandex.ru/token', {
      method: 'POST',
      body: body
      // headers: new Headers({
      //   'Content-Type': 'application/x-www-form-urlencoded'
      // })
    })

    let user = null
    let session = null
    let socialLogin = null

    return fetch(request)
      .then(response => {
        if (response.status < 200 || response.status >= 300) {
          throw new Errors.ServerGenericError(response.statusText)
        }
        return response.json()
      })
      .then((_data) => {
        const _socialLogin = {
          tokenType: _data.token_type,
          accessToken: _data.access_token,
          expiresIn: _data.expires_in,
          refreshToken: _data.refresh_token
        }
        socialLogin = _socialLogin
        console.log('social login:')
        console.log(socialLogin)

        return fetch(new Request('https://login.yandex.ru/info?format=json', {
          method: 'GET',
          headers: new Headers({ Authorization: `OAuth ${socialLogin.accessToken}` })
        }))
      })
      .then((_resp) => {
        if (_resp.status < 200 || _resp.status >= 300) {
          throw new Errors.ServerGenericError(_resp.statusText)
        }
        return _resp.json()
      })
      .then((_passport) => {
        console.log('Yandex passport:')
        console.log(_passport)
        if (!_passport || !_passport.default_email) {
          throw new Errors.ServerGenericError(
            `${packageName}.loginSocial: default_email not found in Yandex passport data`)
        }
        return User.findOne({ where: { email: _passport.default_email } })
      })
      .then((aUser) => {
        user = aUser
        if (!user) {
          throw new Errors.ServerInvalidUsernamePassword('User with this email not found')
        }

        if (user.disabled) {
          throw new Errors.ServerNotAllowed('User is disabled')
        }

        // if (!user.emailVerified) {
        //  throw new ServerNotAllowed('Email should be verified')
        // }

        // if (!User.isPassword(user.password, req.data.password)) {
        //   throw new Errors.ServerInvalidUsernamePassword('Invalid username or password') // password error
        // }

        return Session.createOrUpdate({ userId: user.id, ip: req.ip })
      })
      .then((_session) => {
        session = _session
        return app.exModular.access.addLogged(user)
      })
      .then(() => {
        res.json({ token: app.exModular.auth.encode(session.id) })
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
      name: 'Auth.Social',
      description: 'Login via social provider and return app token',
      path: '/auth/social/:provider',
      handler: Module.module.loginSocial,
      before: [
        app.exModular.auth.check,
        app.exModular.access.check('Auth.Social'),
        Validator.checkBodyForModel({
          name: 'AuthSocial',
          props: [
            {
              name: 'code',
              type: 'text',
              format: 'text',
              default: ''
            }
          ]
        }, { optionalId: true })
      ]
    }
  ]

  app.exModular.routes.Add(Module.module.routes)

  return app
}

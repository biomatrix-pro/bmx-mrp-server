/* eslint-env mocha */
import { describe, it, before, after } from 'mocha'
import supertest from 'supertest'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import env from 'dotenv-safe'

import App from '../../src/packages/app-builder'

import {
  directoryYandexAdd
} from '../client/client-api'
// import { ExtTest } from '../../src/ext-test/ext-test'
import { Mrp } from '../../src/ext-mrp/mrp'
// import * as ACCESS from '../../src/packages/const-access'

/**

 MRP test: тестируем модуль MRP

 Основные сценарии тестирования:
 1) проверить базовую функцию - взять план, сделать калькуляцию
 2) проверить как работает дополнительная калькуляция
 3) тестировать индивидуальные сценарии данных
*/

chai.use(dirtyChai)

const moduleName = 'YANDEX'
// test case:
describe(`${moduleName} module tests`, function () {
  env.config()
  process.env.NODE_ENV = 'test' // just to be sure
  let app = null

  const context = {
    request: null,
    apiRoot: '',
    authSchema: 'Bearer',
    adminToken: null,
    userToken: null
  }

  context.yAdmin = {}

  before((done) => {
    App()
      .then((a) => {
        app = a
        Mrp(app)
      })
      .then(() => app.exModular.storages.Init()) // init storages
      .then(() => app.exModular.modelsInit())
      .then(() => {
        app.exModular.routes.builder.forAllModels()
        return app.exModular.routes.builder.generateRoutes()
      })
      .then(() => app.exModular.initAll())
      .then(() => app.exModular.models.UserDomain.findOne({ where: { domain: process.env.YC_DOMAIN } }))
      .then((_domain) => {
        if (!_domain) {
          throw new Error(`${moduleName}: specified domain "${process.env.YC_DOMAIN}" not found in UserDomain model`)
        }

        context.yAdmin.userDomain = _domain
        return app.exModular.models.UserSocial.findOne({ where: { email: process.env.YC_ADMIN_USER } })
      })
      .then((_userSocial) => {
        if (!_userSocial) {
          throw new Error(`${moduleName}: specified social admin user  "${process.env.YC_ADMIN_USER}" not found in UserSocial model`)
        }

        context.yAdmin.userSocial = _userSocial
        return app.exModular.models.User.findOne({ where: { id: _userSocial.userId } })
      })
      .then((_user) => {
        if (!_user) {
          throw new Error(`${moduleName}: specified user not found in User model`)
        }
        context.yAdmin.user = _user

        // get session:
        return app.exModular.models.Session.findOne({ where: { userId: context.yAdmin.user.id, type: 'Social' } })
      })
      .then((_session) => {
        if (!_session) {
          throw new Error('before: Session for (userSocial/type social) not found!')
        }
        context.yAdmin.session = _session
        context.yAdmin.token = app.exModular.auth.encode(_session.id)
        return app.exModular.models.SessionSocial.findOne({ where: { sessionId: _session.id } })
      })
      .then((_sessionSocial) => {
        if (!_sessionSocial) {
          throw new Error('before: sessionSocial not found for session')
        }
        context.yAdmin.sessionSocial = _sessionSocial
        // ok, we found user,
        // TODO: check if socialAdminUser is actually admin in Yandex:
        context.request = supertest(app)
        done()
      })
      .then(() => app.exModular.models.DirectoryYandex.dataClear())
      .catch(done)
  })

  after((done) => {
    app.exModular.storages.Close()
      .then(() => done())
      .catch(done)
  })

  // beforeEach((done) => {
  //   app.exModular.storages.Clear()
  //     .then(() => done())
  //     .catch(done)
  // })

  describe('YANDEX test case', function () {
    it('1-1: login to YC and get data', function () {
      console.log('yAdmin:')
      console.log(context.yAdmin)

      context.token = context.yAdmin.token
      return directoryYandexAdd(context,
        {
          userId: context.yAdmin.user.id,
          accessToken: context.yAdmin.sessionSocial.accessToken
        })
        .then((_res) => {
          console.log('YC directory added:')
          console.log(_res.body)
        })
        .catch((e) => { throw e })
    })
  })
})

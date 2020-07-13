/* eslint-env mocha */
import { describe, it, before, beforeEach, after } from 'mocha'
import supertest from 'supertest'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import env from 'dotenv-safe'

import App from '../../src/packages/app-builder'

import {
  loginAs,
  UserAdmin,
  UserFirst,
  signupUser,
  userGroupAdd,
  permissionUserGroupCreate,
  userGroupUsersAdd, mrpPlanCalcAdd
} from '../client/client-api'
// import { ExtTest } from '../../src/ext-test/ext-test'
import { Mrp } from '../../src/ext-mrp/mrp'
import * as ACCESS from '../../src/packages/const-access'

/**

 MRP test: тестируем модуль MRP

 Основные сценарии тестирования:
 1) проверить базовую функцию - взять план, сделать калькуляцию
 2) проверить как работает дополнительная калькуляция
 3) тестировать индивидуальные сценарии данных
*/

chai.use(dirtyChai)

// test case:
describe('MRP module tests', function () {
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
      .then(() => {
        context.request = supertest(app)
        done()
      })
      .catch(done)
  })

  after((done) => {
    app.exModular.storages.Close()
      .then(() => done())
      .catch(done)
  })

  beforeEach((done) => {
    app.exModular.storages.Clear()
      .then(() => done())
      .catch(done)
  })

  describe('MRP test case', function () {
    it('1-1: ', function () {
      return signupUser(context, UserAdmin)
        .then(() => loginAs(context, UserAdmin))
        .then((res) => {
          context.adminToken = res.body.token
          context.token = context.adminToken
          return userGroupAdd(context, { name: 'Employee' })
        })
        .then((res) => {
          context.groupEmployee = res.body.id

          const perms = [
            {
              userGroupId: context.groupEmployee,
              accessObjectId: 'Plan.list',
              permission: ACCESS.AccessPermissionType.ALLOW.value,
              withGrant: true
            },
            {
              userGroupId: context.groupEmployee,
              accessObjectId: 'Plan.item',
              permission: ACCESS.AccessPermissionType.ALLOW.value,
              withGrant: true
            }
          ]
          return permissionUserGroupCreate(context, perms)
        })
        .then(() => {
          context.token = context.UserFirst

          // create user
          return signupUser(context, UserFirst)
        })
        .then((res) => {
          context.UserFirstId = res.body.id

          return loginAs(context, UserFirst)
        })
        .then((res) => {
          context.UserFirst = res.body.token
          context.token = context.adminToken

          return userGroupUsersAdd(context, context.groupEmployee, [context.UserFirstId])
        })
        .then(() => {
          context.token = context.adminToken

          return mrpPlanCalcAdd(context, { planId: 1 })
        })
        .catch((e) => { throw e })
    })
  })
})

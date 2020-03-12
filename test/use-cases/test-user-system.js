/* eslint-env mocha */
import { describe, it, before, beforeEach, after } from 'mocha'
import supertest from 'supertest'
import chai, { expect } from 'chai'
import dirtyChai from 'dirty-chai'
import env from 'dotenv-safe'
import _ from 'lodash'

import App from '../../src/packages/app-builder'

import {
  loginAs,
  UserAdmin,
  // UserFirst,
  // userList,
  signupUser, meGroups, userGroupAdd, UserFirst, UserSecond
  // userDelete,
  // userSave
} from '../client/client-api'
import { ACCESS_ADMIN_GROUP_ID } from '../../src/packages/const-access'

/**

*/

chai.use(dirtyChai)

// test case:
describe('ex-modular test: user system', function () {
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
      .then(() => app.exModular.storages.Clear())
      .catch((err) => {
        done(err)
      })
  })

  after((done) => {
    app.exModular.storages.Close()
      .then(() => done())
      .catch(done)
  })

  /*
  beforeEach((done) => {
    app.exModular.storages.Clear()
      .then(() => done())
      .catch(done)
  }) */

  /* Test plan:

  u-s-1: Создать первого пользователя:
    1-c1: проверить что аккаунт успешно создан
    1-c2: проверить что получен токен
    1-c3: проверить что он администратор

  u-s-2: Создать пользовательские группы:
    2-1 группа "менеджеры":
      2-1-c1: проверить что всё ок
    2-2: группа "сотрудники":
      2-2-c1: проверить что группа создана

  u-s-3: Создать два новых пользователя:
   3-1: первый пользователь
    3-1-c1: пользователь создан успешно
   3-2: второй пользователь
    3-2-c1: пользователь создан успешно

Проверить, что от имени первого и второго пользователя нельзя создать группу.

От имени администратора дать доступ группе менеджеров и сотрудников к ресурсу «Заметки» на чтение с правом передоверия.

Дать доступ к ресурсу Заметки группе менеджеров на запись с правом передоверия.

Добавить первого пользователя к менеджерам.

Добавить второго пользователя к сотрудникам.

Проверить что первый и второй пользователь могут получить доступ к Заметкам на чтение.

Проверить что сотрудник не имеет прав на создание записи.

Проверить что мегеджер имеет право на создание записи.
   */
  describe('User system test', function () {
    it('u-s-1: register first user account', function () {
      return signupUser(context, UserAdmin)
        .then((res) => {
          // 1-c1: user account created ok
          expect(res.body).to.exist('Body should exist')
          expect(res.body).to.be.an('object')
          expect(res.body.email).to.exist()
          expect(res.body.email).to.be.equal(UserAdmin.email)
          return loginAs(context, UserAdmin)
        })
        .then((res) => {
          // 1-c2: we have some token
          expect(res.body).to.exist('res.body should exist')
          expect(res.body.token).to.exist('res.body.token should exist')

          context.adminToken = res.body.token

          context.token = context.adminToken
          return meGroups(context)
        })
        .then((res) => {
          // 1-c3: user is admin
          expect(res.body).to.exist('Body should exist')
          expect(res.body).to.be.an('array').that.not.empty()
          const _adminGroupNdx = _.findIndex(res.body, (item) => item.id === ACCESS_ADMIN_GROUP_ID)
          expect(_adminGroupNdx).not.equal(-1)
        })
        .catch((e) => { throw e })
    })

    describe('u-s-2: create user groups', function () {
      it('2-1: Managers group', function () {
        context.token = context.adminToken
        return userGroupAdd(context, { name: 'Managers' })
          .then((res) => {
            // 2-1-c1: check if group created ok
            expect(res.body).to.exist('Body should exist')
            expect(res.body).to.be.an('object')
            expect(res.body.id).to.exist()
            expect(res.body.name).to.be.equal('Managers')

            context.groupManagers = res.body.id
          })
          .catch((e) => { throw e })
      })
      it('2-2: Employee group', function () {
        context.token = context.adminToken
        return userGroupAdd(context, { name: 'Employee' })
          .then((res) => {
            // 2-2-c1: check if group created ok
            expect(res.body).to.exist('Body should exist')
            expect(res.body).to.be.an('object')
            expect(res.body.id).to.exist()
            expect(res.body.name).to.be.equal('Employee')

            context.groupEmployee = res.body.id
          })
          .catch((e) => { throw e })
      })
    })

    describe('u-s-3: create users', function () {
      it('3-1: UserFirst', function () {
        context.token = context.adminToken
        return signupUser(context, UserFirst)
          .then((res) => {
            // 3-1-c1: check if user created ok
            expect(res.body).to.exist('Body should exist')
            expect(res.body).to.be.an('object')
            expect(res.body.id).to.exist()
            expect(res.body.name).to.be.equal(UserFirst.name)
            expect(res.body.email).to.be.equal(UserFirst.email)

            context.userFirst = res.body.id
          })
          .catch((e) => { throw e })
      })
      it('3-2: UserSecond', function () {
        context.token = context.adminToken
        return signupUser(context, UserSecond)
          .then((res) => {
            // 3-2-c1: check if user created ok
            expect(res.body).to.exist('Body should exist')
            expect(res.body).to.be.an('object')
            expect(res.body.id).to.exist()
            expect(res.body.name).to.be.equal(UserSecond.name)
            expect(res.body.email).to.be.equal(UserSecond.email)

            context.userFirst = res.body.id
          })
          .catch((e) => { throw e })
      })
    })

    /*
    it('Generate a lot of users', function () {
      let ndx = 1
      return signupUser(context, UserAdmin)
        .then((res) => {
          expect(res.body).to.exist('Body should exist')
          expect(res.body).to.be.an('object')
          expect(res.body.email).to.exist()
          expect(res.body.email).to.be.equal(UserAdmin.email)
          return loginAs(context, UserAdmin)
        })
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
        .then(() => signupUser(context, { name: `User${ndx}`, email: `user${ndx}@email.net`, password: `passw${ndx++}`, isAdmin: false }))
    }) */
  })
})

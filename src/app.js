import express from 'express'
import appBuilder from './packages/app-builder'
import serverBuilder from './packages/server-builder'
import { Mrp } from './ext-mrp/mrp'
// import { ExtTest } from './ext-test/ext-test'
import env from 'dotenv-safe'

// load .env

env.config()

let app = null

// build app & server
appBuilder(express, {})
  .then((_app) => {
    app = _app
    Mrp(app)
    // ExtTest(app)
  })
  .then(() => app.exModular.storages.Init()) // init storages
  .then(() => app.exModular.modelsInit())
  .then(() => {
    app.exModular.routes.builder.forAllModels()
    return app.exModular.routes.builder.generateRoutes()
  })
  .then(() => app.exModular.initAll())
  .then(() => serverBuilder(app, {}))
  .catch((e) => { throw e })

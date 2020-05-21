export const InitUsers = (app) => () =>
  app.exModular.services.seed('User', 'user.json', { upsert: true })
    .then((res) => {
      if (res && Array.isArray(res) && res.length === 1) {
        return app.exModular.access.addAdmin(res[0])
      }
    })
    .catch((e) => { throw e })

/* return Promise.resolve()
    .then(() => app.exModular.models.User.count())
    .then((count) => {
      if (!count || count === 0) {
        return app.exModular.models.User.create({
          name: 'John Admin',
          email: 'admin@email.net',
          password: 'admin12345'
        })
      }
    })
    .catch((e) => {
      throw e
    }) */

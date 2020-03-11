export const Wrap = (app) => (fn) => (req, res, next) => {
  const processErr = (next, err) => {
    if (app && app.server && app.server.error) {
      app.server.error('Error in wrapped async function:')
      app.server.error(err.toString())
    }
    next(err)
  }
  try {
    if (fn.length === 2) {
      fn(req, res)
        .catch((err) => {
          res.error = err
          processErr(next, err)
        })
    } else if (fn.length === 3) {
      fn(req, res, next)
        .then(() => next())
        .catch((err) => {
          res.error = err
          processErr(next, err)
        })
    }
  } catch (err) {
    res.error = err
    processErr(next, err)
  }
}

import { body, param, validationResult, matchedData, query } from 'express-validator'

const packageName = 'Service.Validator'

export const Validator = (app) => {
  app.exModular.modules.Add({ moduleName: packageName, dependency: ['services.errors', 'services.errors.ServerInvalidParams']})

  const validateData = (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        next(new app.exModular.services.errors.ServerInvalidParams({ errors: errors.array() }))
      }
      req.data = matchedData(req)
      next()
    } catch (e) {
      next(e)
    }
  }

  const checkBodyForModel = (Model, options) => {
    const validations = []
    Model.props.map((prop) => {
      if (prop.type === 'text') {
        validations.push(body([prop.name]).optional().isString().withMessage(`${Model.name}.${prop.name} should be string`))
      } else if (prop.type === 'id' && (options && !options.optionalId)) {
        validations.push(body([prop.name]).optional().isString().withMessage(`${Model.name}.${prop.name} should be string UUID`))
      } else if (prop.type === 'refs') {
        validations.push(body([prop.name]).isArray({ min: 0 }).withMessage('Users should be specified as array'))
      } else if (prop.type === 'ref') {
        validations.push(body([prop.name]).optional().isString().withMessage(`${Model.name}.${prop.name} should be string UUID`))
      }
    })
    validations.push(validateData)
    return validations
  }

  const checkBodyForModelName = (modelName, options) => {
    const model = app.exModular.models[modelName]
    return checkBodyForModel(model, options)
  }

  const listFilterValidator = (Model, options) => {
    // const validations = []
    return query(['filter']).optional()
  }

  const applyValidationsToReq = (validations, req) => {
    return Promise.all(validations.map((validation) => validation.run(req)))
      .then(() => {
        req.validationErrors = validationResult(req)
        if (!req.validationErrors.isEmpty()) {
          // TODO: add logging error
          throw new app.services.errors.ServerInvalidParams(req.validationErrors.mapped())
        }
        req.matchedData = matchedData(req)
        return req
      })
      .catch((err) => { throw err })
  }
  const paramId = (Model) => {
    return param('id').isString().withMessage('Id should be specified in URL')
  }

  return {
    checkBodyForModel,
    checkBodyForModelName,
    validateData,
    applyValidationsToReq,
    paramId,
    listFilterValidator
  }
}

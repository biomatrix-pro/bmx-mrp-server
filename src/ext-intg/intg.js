import { IntgConnection } from './model-intg-connection'
import { IntgImport } from './model-intg-import'
import { YCUser } from './model-yc-user'
import { YCUserContact } from './model-yc-user-contact'
import { YCDepartment } from './model-yc-department'
import { YCOrganization } from './model-yc-organization'
import { YCService } from './model-yc-service'
import { YCDomain } from './model-yc-domain'
import { YCGroup } from './model-yc-group'
import { LinkYCUser } from './model-link-yc-user'

const moduleName = 'Intg'

export const Intg = (app) => {
  const Module = {
    moduleName: moduleName,
    caption: 'Intg: Интеграция',
    description: 'Модуль для обеспечения возможности интеграции данных exModular с внешними системами',
    dependency: [
      'modules.Add'
    ],
    module: {}
  }

  app.exModular.modules.Add(Module)

  app.exModular.modelAdd(IntgConnection(app))
  app.exModular.modelAdd(IntgImport(app))
  app.exModular.modelAdd(YCUser(app))
  app.exModular.modelAdd(YCUserContact(app))
  app.exModular.modelAdd(YCDepartment(app))
  app.exModular.modelAdd(YCOrganization(app))
  app.exModular.modelAdd(YCService(app))
  app.exModular.modelAdd(YCDomain(app))
  app.exModular.modelAdd(YCGroup(app))
  app.exModular.modelAdd(LinkYCUser(app))

  return Module
}

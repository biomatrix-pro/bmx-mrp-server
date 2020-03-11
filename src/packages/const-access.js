export const ACCESS_DENY = 0
export const ACCESS_ALLOW = 1
export const ACCESS_UNKNOW = undefined

export const ACCESS_GUEST_ID = '12a507e4-d101-467a-97d4-f65a3b71f57c'
export const ACCESS_ADMIN_GROUP_ID = '416db26a-a15d-4c57-ac2d-786a69857f4d'

export const AccessSystemType = {
  unknown: { value: null, caption: '(unknown)' },
  Admin: { value: 'Admin', caption: 'ADMIN' },
  User: { value: 'User', caption: 'User' }
}

export const AccessPermissionType = {
  unknown: { value: ACCESS_UNKNOW, caption: '(unknown)' },
  DENY: { value: ACCESS_DENY, caption: 'DENY' },
  ALLOW: { value: ACCESS_ALLOW, caption: 'ALLOW' }
}

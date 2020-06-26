import { v4 as uuid } from 'uuid'

export const YCGroup = () => {
  return {
    name: 'YCGroup',
    caption: 'YC.Команда',
    description: 'Организация в Yandex Connect',
    props: [
      {
        name: 'id',
        type: 'id',
        caption: 'Идентификатор',
        description: 'Идентификатор команды',
        default: () => uuid()
      },
      {
        name: 'directoryId',
        type: 'ref',
        model: 'DirectoryYandex',
        caption: 'Интеграция',
        description: 'Ссылка на профиль интеграции, через который загружены эти данные',
        default: null
      },
      {
        name: 'name',
        type: 'text',
        format: '',
        caption: 'Название',
        description: 'Название команды',
        default: null
      },
      {
        name: 'email',
        type: 'text',
        format: '',
        caption: 'Email',
        description: 'Основная электронная почта команды',
        default: null
      }
    ]
  }
}

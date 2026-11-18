import { useEffect, useState } from 'react'
import { listModels } from '../../services/api/client.js'
import { setMessagesModel, setResponsesModel, useSettings } from '../../services/settings.js'
import { useTranslate } from '../../i18n/index.js'
import { Select } from '../base/Select.js'
import styles from './Settings.module.css'

/** 模型设置放在 API Key 下方，获取列表时使用已保存的 Key。 */
export const ApiModelField = () => {
  const t = useTranslate()
  const apiKey = useSettings((state) => state.apiKey)
  const apiOrigin = useSettings((state) => state.apiOrigin)
  const apiProtocol = useSettings((state) => state.apiProtocol)
  const messagesModel = useSettings((state) => state.messagesModel)
  const responsesModel = useSettings((state) => state.responsesModel)
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  useEffect(() => {
    setModels([])
    setModelError(null)
  }, [apiOrigin, apiProtocol])

  const modelName = apiProtocol === 'messages' ? messagesModel : responsesModel
  const updateModelName = apiProtocol === 'messages' ? setMessagesModel : setResponsesModel
  const fetchModels = async () => {
    if (!apiKey || loadingModels) {
      setModelError(t('apiGatewayKeyRequired'))
      return
    }
    setLoadingModels(true)
    setModelError(null)
    try {
      setModels(await listModels(apiKey))
    } catch (cause) {
      setModelError(
        t('apiGatewayModelFetchFailed', {
          message: cause instanceof Error ? cause.message : String(cause),
        })
      )
    } finally {
      setLoadingModels(false)
    }
  }

  return (
    <div className={styles.cell}>
      <div className={styles.gateway}>
        <div className={styles.label}>
          {t(apiProtocol === 'messages' ? 'messagesModelLabel' : 'responsesModelLabel')}
        </div>
        <div className={styles.gatewayRow}>
          <input
            className={styles.gatewayInput}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={modelName}
            placeholder={t(
              apiProtocol === 'messages' ? 'messagesModelPlaceholder' : 'responsesModelPlaceholder'
            )}
            aria-label={t(
              apiProtocol === 'messages' ? 'messagesModelLabel' : 'responsesModelLabel'
            )}
            onChange={(event) => updateModelName(event.target.value)}
          />
          <button
            type="button"
            className={styles.gatewayAction}
            disabled={loadingModels}
            onClick={() => void fetchModels()}
          >
            {t(loadingModels ? 'apiGatewayModelsLoading' : 'apiGatewayFetchModels')}
          </button>
        </div>
        {models.length > 0 ? (
          <Select
            value={models.includes(modelName) ? modelName : ''}
            options={models.map((model) => ({ value: model, label: model }))}
            onChange={updateModelName}
            placeholder={t('apiGatewaySelectModel')}
            ariaLabel={t('apiGatewaySelectModel')}
            className={styles.gatewayProtocol}
          />
        ) : null}
        <div className={styles.description}>
          {t(apiProtocol === 'messages' ? 'messagesModelDescription' : 'responsesModelDescription')}
        </div>
        {modelError ? <div className={styles.error}>{modelError}</div> : null}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { DEFAULT_API_ORIGIN, normalizeApiOrigin } from '../../services/api/config.js'
import {
  setApiOrigin,
  setApiProtocol,
  useSettings,
  type ApiProtocol,
} from '../../services/settings.js'
import { useTranslate } from '../../i18n/index.js'
import { Select, type SelectOption } from '../base/Select.js'
import styles from './Settings.module.css'

/** API 网关地址和协议：默认连接 DeepSeek 的 Messages 接口。 */
export const ApiGatewayField = () => {
  const t = useTranslate()
  const apiOrigin = useSettings((state) => state.apiOrigin)
  const apiProtocol = useSettings((state) => state.apiProtocol)
  const [value, setValue] = useState(apiOrigin)
  const [error, setError] = useState(false)

  useEffect(() => setValue(apiOrigin), [apiOrigin])

  const protocolOptions: SelectOption<ApiProtocol>[] = [
    { value: 'messages', label: t('apiProtocolMessages') },
    { value: 'responses', label: t('apiProtocolResponses') },
  ]

  const changeProtocol = (protocol: ApiProtocol) => {
    setApiProtocol(protocol)
  }

  const apply = () => {
    const normalized = normalizeApiOrigin(value)
    if (!normalized || !setApiOrigin(normalized)) {
      setError(true)
      return
    }
    setValue(normalized)
    setError(false)
  }

  const restoreDefault = () => {
    setApiOrigin(DEFAULT_API_ORIGIN)
    setValue(DEFAULT_API_ORIGIN)
    setError(false)
  }

  return (
    <>
      <div className={styles.cell}>
        <div className={styles.row}>
          <div className={styles.text}>
            <div className={styles.label}>{t('apiProtocolLabel')}</div>
          </div>
          <Select
            value={apiProtocol}
            options={protocolOptions}
            onChange={changeProtocol}
            ariaLabel={t('apiProtocolLabel')}
            className={styles.gatewayProtocol}
          />
        </div>
      </div>
      <div className={styles.cell}>
        <div className={styles.gateway}>
          <div className={styles.label}>{t('apiGatewayLabel')}</div>
          <div className={styles.gatewayRow}>
            <input
              className={styles.gatewayInput}
              type="url"
              autoComplete="url"
              spellCheck={false}
              value={value}
              aria-label={t('apiGatewayLabel')}
              onChange={(event) => {
                setValue(event.target.value)
                setError(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  apply()
                }
              }}
            />
            <button type="button" className={styles.gatewayAction} onClick={apply}>
              {t('confirm')}
            </button>
            <button
              type="button"
              className={styles.gatewayActionSecondary}
              onClick={restoreDefault}
            >
              {t('apiGatewayReset')}
            </button>
          </div>
          <div className={styles.description}>
            {t(
              apiProtocol === 'responses'
                ? 'apiGatewayDescriptionResponses'
                : 'apiGatewayDescription'
            )}
          </div>
          {error ? <div className={styles.error}>{t('apiGatewayInvalid')}</div> : null}
        </div>
      </div>
    </>
  )
}

import clsx from 'clsx'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPosition, useDismiss } from './anchored.js'
import styles from './Menu.module.css'

export type MenuOption = {
  key: string
  label: string
  icon: ReactNode
  danger?: boolean
  onSelect: () => void
}

/** 点击触发，向下展开；点外部或 Esc 关闭 */
export const Menu = ({
  options,
  children,
}: {
  options: MenuOption[]
  children: (props: {
    open: boolean
    toggle: (event?: MouseEvent<HTMLButtonElement>) => void
  }) => ReactNode
}) => {
  const [open, setOpen] = useState(false)
  const [fallbackRect, setFallbackRect] = useState<DOMRect | null>(null)
  const close = () => setOpen(false)
  // 左侧对齐并再左移 5px，让菜单文字与触发元素图标对齐
  const { anchorRef, floatingRef, position } = useAnchoredPosition<HTMLSpanElement, HTMLDivElement>(
    open,
    { align: 'start', alignOffset: -5, offset: 4, fallbackRect }
  )
  useDismiss(open, [anchorRef, floatingRef], close)
  const toggle = (event?: MouseEvent<HTMLButtonElement>) => {
    if (open) {
      setOpen(false)
      return
    }
    if (event) {
      setFallbackRect(event.currentTarget.getBoundingClientRect())
    }
    setOpen(true)
  }

  return (
    <>
      <span ref={anchorRef} className={styles.anchor}>
        {children({ open, toggle })}
      </span>
      {open
        ? createPortal(
            <div
              ref={floatingRef}
              className={styles.menu}
              style={position ?? undefined}
              role="menu"
            >
              {options.map((option) => (
                <div
                  key={option.key}
                  role="menuitem"
                  className={clsx(styles.option, option.danger && styles.danger)}
                  onClick={() => {
                    setOpen(false)
                    option.onSelect()
                  }}
                >
                  <span className={styles.icon}>{option.icon}</span>
                  {option.label}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  )
}

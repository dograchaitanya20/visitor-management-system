import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'
import { notify, clearNotifications } from '../api/notifier'
import { useNotificationsStore } from '../store/notifications'

describe('Notification Bell and Drawer', () => {
  beforeEach(() => {
    clearNotifications()
    // Seed 2 notifications (1 unread, 1 unread)
    notify({
      to: 'host@example.com',
      channel: 'email',
      message: 'Visitor John Doe has arrived',
    })
    notify({
      to: 'host@example.com',
      channel: 'push',
      message: 'New pre-approval requested',
    })
    useNotificationsStore.getState().refresh()
  })

  it('opens drawer on bell click, marks read on item click, and decrements badge', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )

    // Unread count badge displays '2'
    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    expect(bellBtn).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    // Drawer is initially not visible
    expect(screen.queryByText('Visitor John Doe has arrived')).not.toBeInTheDocument()

    // Click the bell
    fireEvent.click(bellBtn)

    // Drawer opens and shows notifications
    const notifItem = screen.getByText('Visitor John Doe has arrived')
    expect(notifItem).toBeInTheDocument()

    // Click the notification to mark it as read
    fireEvent.click(notifItem)

    // Unread count badge should now display '1'
    expect(screen.getByText('1')).toBeInTheDocument()

    // Close drawer via close button (×)
    const closeButtons = screen.getAllByRole('button', { name: '×' })
    fireEvent.click(closeButtons[0])

    // Drawer content is removed
    expect(screen.queryByText('Visitor John Doe has arrived')).not.toBeInTheDocument()
  })
})

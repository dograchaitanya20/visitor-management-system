import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DeskPage } from '../pages/DeskPage'
import * as repo from '../api/repo'
import { useSessionStore } from '../store/session'
import { useVisitsStore } from '../store/visits'
import { AppError } from '../api/errors'

describe('Front Desk / Visitor Table & Pass Scan Flow', () => {
  beforeEach(async () => {
    repo.setSimulatedDelay(0)
    repo.resetRepo()
    useSessionStore.getState().setRole('FRONT_DESK')
    await useVisitsStore.getState().fetchVisits()
  })

  it('renders registration form, pass scan box, and visitor table on /desk', async () => {
    render(
      <BrowserRouter>
        <DeskPage />
      </BrowserRouter>,
    )

    expect(screen.getByRole('heading', { name: /Front Desk/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Walk-In Registration/i })).toBeInTheDocument()
    expect(screen.getByText(/Quick Pass Check-In/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Scan or enter pass code/i)).toBeInTheDocument()
  })

  it('filters visitor table by search text and status dropdown', async () => {
    // Create a walk-in to test specific visitor search
    await repo.createWalkIn({
      name: 'Zara Qureshi',
      phone: '+91 98200 99999',
      hostId: 'emp-01',
      purpose: 'Design Review Meeting',
      type: 'Business Guests',
      office: 'Mumbai Goregaon',
      photo: 'data:image/jpeg;base64,mock',
    })
    await useVisitsStore.getState().fetchVisits()

    render(
      <BrowserRouter>
        <DeskPage />
      </BrowserRouter>,
    )

    // Check "All Days" so all seeded items are visible
    fireEvent.click(screen.getByLabelText(/All Days/i))

    // Search for Zara
    const searchInput = screen.getByPlaceholderText(/Search visitor, phone, host, pass/i)
    fireEvent.change(searchInput, { target: { value: 'Zara' } })

    await waitFor(() => {
      expect(screen.getByText('Zara Qureshi')).toBeInTheDocument()
    })

    // Filter by Status "CHECKED_IN" -> Zara is PENDING, so Zara should disappear
    const statusSelect = screen.getByRole('combobox', { name: /Filter by status/i })
    fireEvent.change(statusSelect, { target: { value: 'CHECKED_IN' } })

    await waitFor(() => {
      expect(screen.queryByText('Zara Qureshi')).not.toBeInTheDocument()
    })
  })

  it('checks in a pre-approved visitor via PassScanBox and opens details drawer', async () => {
    // Create a valid invite with known passCode
    const now = new Date()
    const start = new Date(now.getTime() - 10 * 60_000).toISOString()
    const end = new Date(now.getTime() + 60 * 60_000).toISOString()

    const [inviteVisit] = await repo.createInvites({
      hostId: 'emp-02',
      title: 'Board Meeting',
      type: 'Business Guests',
      office: 'Mumbai Goregaon',
      windowStart: start,
      windowEnd: end,
      guests: [
        {
          name: 'Kunal Kapoor',
          phone: '+91 98200 88888',
          email: 'kunal@example.com',
          company: 'Kapoor Holdings',
        },
      ],
    })

    const passCode = inviteVisit.passCode!

    render(
      <BrowserRouter>
        <DeskPage />
      </BrowserRouter>,
    )

    const passInput = screen.getByPlaceholderText(/Scan or enter pass code/i)
    fireEvent.change(passInput, { target: { value: passCode } })

    const checkInBtn = screen.getByRole('button', { name: 'Check In' })
    fireEvent.click(checkInBtn)

    // Details drawer opens and displays visitor details
    expect(await screen.findByRole('heading', { name: /Visitor Pass Details/i })).toBeInTheDocument()
    expect(screen.getByText('Kunal Kapoor')).toBeInTheDocument()
    expect(screen.getByText(/Kapoor Holdings/i)).toBeInTheDocument()

    // Status is now CHECKED_IN (shown in drawer and/or table)
    expect(screen.getAllByText('Checked In').length).toBeGreaterThanOrEqual(1)
    // "Check Out Visitor" button is now available in drawer
    expect(screen.getByRole('button', { name: /Check Out Visitor/i })).toBeInTheDocument()
  })

  it('surfaces PASS_INVALID error specifically when an invalid or expired pass is scanned', async () => {
    render(
      <BrowserRouter>
        <DeskPage />
      </BrowserRouter>,
    )

    const passInput = screen.getByPlaceholderText(/Scan or enter pass code/i)
    fireEvent.change(passInput, { target: { value: 'NONEXISTENT_PASS' } })

    const checkInBtn = screen.getByRole('button', { name: 'Check In' })
    fireEvent.click(checkInBtn)

    expect(
      await screen.findByText(/Invalid pass code/i),
    ).toBeInTheDocument()
  })

  it('blocks illegal check-in on a PENDING visit and surfaces explanation rather than crashing', async () => {
    // Create a PENDING walk-in visit
    const pendingVisit = await repo.createWalkIn({
      name: 'Ramesh Sen',
      phone: '+91 98200 77777',
      hostId: 'emp-01',
      purpose: 'Interview',
      type: 'Interview',
      office: 'Mumbai Goregaon',
      photo: 'data:image/jpeg;base64,mock',
    })
    await useVisitsStore.getState().fetchVisits()

    render(
      <BrowserRouter>
        <DeskPage />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByLabelText(/All Days/i))
    fireEvent.change(screen.getByPlaceholderText(/Search visitor, phone, host, pass/i), {
      target: { value: 'Ramesh Sen' },
    })

    const row = await screen.findByText('Ramesh Sen')
    fireEvent.click(row)

    // Drawer opens
    expect(await screen.findByRole('heading', { name: /Visitor Pass Details/i })).toBeInTheDocument()

    // Check In button should NOT be present for PENDING status
    expect(screen.queryByRole('button', { name: /Check In Visitor/i })).not.toBeInTheDocument()
    // Explanatory message should be shown
    expect(screen.getByText(/Awaiting host approval/i)).toBeInTheDocument()

    // Directly attempting illegal checkIn via repo throws AppError with ILLEGAL_TRANSITION
    await expect(
      repo.applyEvent(pendingVisit.id, 'checkIn', 'front-desk'),
    ).rejects.toThrow(AppError)

    try {
      await repo.applyEvent(pendingVisit.id, 'checkIn', 'front-desk')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect((err as AppError).code).toBe('ILLEGAL_TRANSITION')
    }
  })
})

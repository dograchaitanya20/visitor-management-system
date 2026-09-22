import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AdminPage } from '../pages/AdminPage'
import * as repo from '../api/repo'
import { useSessionStore } from '../store/session'
import { useVisitsStore } from '../store/visits'

describe('Admin Panel Flow', () => {
  beforeEach(async () => {
    repo.setSimulatedDelay(0)
    repo.resetRepo()
    useSessionStore.getState().setRole('ADMIN')
    await useVisitsStore.getState().fetchVisits()
  })

  it('renders admin dashboard with settings form, demo data controls, and audit log', async () => {
    render(
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>,
    )

    expect(await screen.findByRole('heading', { name: /Admin Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /System Configuration/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Demo Dataset Management/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /System Audit Log/i })).toBeInTheDocument()
  })

  it('updates settings: adds/removes visit types and saves settings', async () => {
    render(
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>,
    )

    expect(await screen.findByRole('heading', { name: /System Configuration/i })).toBeInTheDocument()

    // Add a new visit type
    const typeInput = screen.getByPlaceholderText(/Add new visit type/i)
    fireEvent.change(typeInput, { target: { value: 'VIP Diplomat' } })
    fireEvent.click(screen.getByRole('button', { name: /\+ Add Type/i }))

    expect(screen.getByText('VIP Diplomat')).toBeInTheDocument()

    // Change pre-approval limit to 10
    const limitInput = screen.getByLabelText(/Daily Pre-Approval Limit per Host/i)
    fireEvent.change(limitInput, { target: { value: '10' } })

    // Save settings
    const saveBtn = screen.getByRole('button', { name: /Save Settings/i })
    fireEvent.click(saveBtn)

    // Verify settings updated in repo
    await waitFor(async () => {
      const saved = await repo.getSettings()
      expect(saved.maxPreApprovalsPerDay).toBe(10)
      expect(saved.visitTypes).toContain('VIP Diplomat')
    })
  })

  it('filters audit log entries by search query', async () => {
    // Perform an action to produce an audit entry
    const visit = await repo.createWalkIn({
      name: 'Priya Sharma',
      phone: '+91 98200 12345',
      hostId: 'emp-01',
      purpose: 'Vendor Review',
      type: 'Vendor',
      office: 'Mumbai Goregaon',
      photo: 'data:image/jpeg;base64,mock',
    })

    render(
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>,
    )

    expect(await screen.findByRole('heading', { name: /System Audit Log/i })).toBeInTheDocument()

    // Search for visit ID
    const searchInput = screen.getByPlaceholderText(/Search by visit ID, actor, event/i)
    fireEvent.change(searchInput, { target: { value: visit.id } })

    expect(await screen.findByText(visit.id)).toBeInTheDocument()
  })

  it('loads 10,000 demo visits and resets back to default seed data', async () => {
    render(
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>,
    )

    expect(await screen.findByRole('heading', { name: /Demo Dataset Management/i })).toBeInTheDocument()
    expect(screen.getAllByText(/300 visits/i).length).toBeGreaterThanOrEqual(1)

    // 1. Click "Load 10,000 Demo Visits"
    const loadBtn = screen.getByRole('button', { name: /🚀 Load 10,000 Demo Visits/i })
    fireEvent.click(loadBtn)

    // Store updates to 10,000
    await waitFor(() => {
      expect(useVisitsStore.getState().items.length).toBe(10_000)
    })
    expect(screen.getByText(/10,000 visits/i)).toBeInTheDocument()
    expect(screen.getByText(/10,000 records generated in/i)).toBeInTheDocument()

    // 2. Click "Reset to Default Data"
    const resetBtn = screen.getByRole('button', { name: /🔄 Reset to Default Data/i })
    fireEvent.click(resetBtn)

    // Store resets to 300
    await waitFor(() => {
      expect(useVisitsStore.getState().items.length).toBe(300)
    })
    expect(screen.getAllByText(/300 visits/i).length).toBeGreaterThanOrEqual(1)
  })
})

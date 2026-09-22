import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { InvitePage } from '../pages/InvitePage'
import { resetRepo, setSimulatedDelay } from '../api/repo'
import { useSessionStore } from '../store/session'

describe('Invite / Pre-Approval Flow', () => {
  beforeEach(() => {
    setSimulatedDelay(0)
    resetRepo()
    useSessionStore.getState().setRole('HOST')
    useSessionStore.getState().setEmployee('emp-01')
  })

  it('renders the invite form and disables submit button when no guests are added', async () => {
    render(
      <BrowserRouter>
        <InvitePage />
      </BrowserRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: /Invite & Pre-Approve Visitors/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Event Title/i)).toBeInTheDocument()

    // Confirm button is disabled when guest list is empty
    const submitBtn = screen.getByRole('button', { name: /Confirm & Send Invites/i })
    expect(submitBtn).toBeDisabled()
  })

  it('allows adding and removing guests in GuestPicker', async () => {
    render(
      <BrowserRouter>
        <InvitePage />
      </BrowserRouter>,
    )

    await screen.findByRole('heading', { name: /Invite & Pre-Approve Visitors/i })

    // Add a guest
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Priya Sharma/i), {
      target: { value: 'Anita Desai' },
    })
    fireEvent.change(screen.getByPlaceholderText(/\+91 98200 12345/i), {
      target: { value: '+91 98200 55555' },
    })
    fireEvent.change(screen.getByPlaceholderText(/priya@example\.com/i), {
      target: { value: 'anita@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Acme Corp/i), {
      target: { value: 'Tech Innovations' },
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Add to List/i }))

    // Guest should appear in the list
    expect(screen.getByText('Anita Desai')).toBeInTheDocument()
    expect(screen.getByText(/Tech Innovations/i)).toBeInTheDocument()

    // Submit button should now be enabled
    const submitBtn = screen.getByRole('button', { name: /Confirm & Send Invites \(1\)/i })
    expect(submitBtn).not.toBeDisabled()

    // Remove the guest
    fireEvent.click(screen.getByRole('button', { name: /Remove Anita Desai/i }))
    expect(screen.queryByText('Anita Desai')).not.toBeInTheDocument()
    expect(submitBtn).toBeDisabled()
  })

  it('submits valid invites and displays generated QR pass results', async () => {
    render(
      <BrowserRouter>
        <InvitePage />
      </BrowserRouter>,
    )

    await screen.findByRole('heading', { name: /Invite & Pre-Approve Visitors/i })

    // Fill form
    fireEvent.change(screen.getByLabelText(/Event Title/i), {
      target: { value: 'Annual Vendor Partnership Summit' },
    })

    // Add 2 guests
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Priya Sharma/i), {
      target: { value: 'Vikram Seth' },
    })
    fireEvent.change(screen.getByPlaceholderText(/\+91 98200 12345/i), {
      target: { value: '+91 98200 11111' },
    })
    fireEvent.click(screen.getByRole('button', { name: /\+ Add to List/i }))

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Priya Sharma/i), {
      target: { value: 'Sunita Narain' },
    })
    fireEvent.change(screen.getByPlaceholderText(/\+91 98200 12345/i), {
      target: { value: '+91 98200 22222' },
    })
    fireEvent.click(screen.getByRole('button', { name: /\+ Add to List/i }))

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Confirm & Send Invites \(2\)/i })
    fireEvent.click(submitBtn)

    // Results screen appears
    expect(
      await screen.findByText(/🎉 Pre-Approval Invites Sent!/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Vikram Seth')).toBeInTheDocument()
    expect(screen.getByText('Sunita Narain')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Create Another Invite/i })).toBeInTheDocument()
  })

  it('surfaces LIMIT_EXCEEDED error specifically with an alert banner', async () => {
    render(
      <BrowserRouter>
        <InvitePage />
      </BrowserRouter>,
    )

    await screen.findByRole('heading', { name: /Invite & Pre-Approve Visitors/i })

    fireEvent.change(screen.getByLabelText(/Event Title/i), {
      target: { value: 'Over Limit Meeting' },
    })

    // Add 6 guests for same host and day (limit is 5)
    for (let i = 1; i <= 6; i++) {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Priya Sharma/i), {
        target: { value: `Guest ${i}` },
      })
      fireEvent.change(screen.getByPlaceholderText(/\+91 98200 12345/i), {
        target: { value: `+91 98200 9000${i}` },
      })
      fireEvent.click(screen.getByRole('button', { name: /\+ Add to List/i }))
    }

    const submitBtn = screen.getByRole('button', { name: /Confirm & Send Invites \(6\)/i })
    fireEvent.click(submitBtn)

    // Specific Limit Exceeded alert banner is displayed
    expect(
      await screen.findByText(/Pre-Approval Limit Exceeded/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Daily pre-approval limit of 5 exceeded for host/i),
    ).toBeInTheDocument()
  })
})

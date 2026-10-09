import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Header from '../../src/components/header'

// Use real framer-motion: the existing header suite mocks its components and
// cannot catch an incompatible motion/AnimatePresence dependency update.
describe('Header with the real animation library', () => {
  it('opens the mobile links and removes them after closing the menu', async () => {
    render(<Header />)
    expect(screen.getAllByRole('link', { name: /^Team$/ })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /^Open menu$/ }))
    expect(screen.getByRole('button', { name: /^Close menu$/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^Team$/ })).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /^Close menu$/ }))
    await waitFor(() => expect(screen.getAllByRole('link', { name: /^Team$/ })).toHaveLength(1), {
      timeout: 3000,
    })
    expect(screen.getByRole('button', { name: /^Open menu$/ })).toBeInTheDocument()
  })
})

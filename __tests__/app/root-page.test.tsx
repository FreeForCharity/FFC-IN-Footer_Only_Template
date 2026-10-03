import React from 'react'
import { render, screen } from '@testing-library/react'

import RootPage from '../../src/app/page'

// This suite used to mock `src/app/home-page` and assert a `data-testid` the
// mock itself supplied — so it verified the mock, not the route, and it broke
// the moment a fork replaced the home page with its own content instead of
// delegating. Asserting the route's actual contract holds either way.
describe('Root page (app/page.tsx)', () => {
  it('should render without crashing', () => {
    const { container } = render(<RootPage />)
    expect(container).toBeTruthy()
  })

  it('should own the main landmark targeted by the skip link', () => {
    render(<RootPage />)
    const mains = screen.getAllByRole('main')

    expect(mains).toHaveLength(1)
    expect(mains[0]).toHaveAttribute('id', 'main-content')
  })

  it('should render a single top-level heading', () => {
    render(<RootPage />)
    const h1s = screen.getAllByRole('heading', { level: 1 })

    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent?.trim().length).toBeGreaterThan(0)
  })
})

import React from 'react'
import { render } from '@testing-library/react'

// Mock the home-page module since it renders the team section
jest.mock('../../src/app/home-page', () => {
  return function MockHomePage() {
    return <div data-testid="home-page">Home Page Content</div>
  }
})

import RootPage from '../../src/app/page'

describe('Root page (app/page.tsx)', () => {
  it('should render without crashing', () => {
    const { container } = render(<RootPage />)
    expect(container).toBeTruthy()
  })

  it('should render the HomePage component', () => {
    const { getByTestId } = render(<RootPage />)
    expect(getByTestId('home-page')).toBeInTheDocument()
  })
})

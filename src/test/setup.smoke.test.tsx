import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

function Smoke() {
  return <h1>Assembly Line Tracking System</h1>
}

describe('Vitest + RTL setup', () => {
  it('renders a React component', () => {
    render(<Smoke />)
    expect(screen.getByRole('heading', { name: /assembly line tracking system/i })).toBeInTheDocument()
  })
})

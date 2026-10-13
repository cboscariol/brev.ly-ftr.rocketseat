import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renderiza', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'brev.ly' })).toBeInTheDocument()
  })
})

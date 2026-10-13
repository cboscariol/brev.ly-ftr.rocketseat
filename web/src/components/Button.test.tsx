import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('fica desabilitado e sinaliza carregamento', () => {
    render(<Button loading>Salvar link</Button>)
    const button = screen.getByRole('button', { name: 'Salvar link' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

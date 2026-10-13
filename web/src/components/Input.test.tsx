import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('associa label, prefixo e mensagem de erro ao campo', () => {
    render(<Input label="Link encurtado" prefix="brev.ly/" error="Código inválido." />)

    const input = screen.getByLabelText('Link encurtado')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Código inválido.')
    expect(screen.getByText('brev.ly/')).toBeInTheDocument()
  })

  it('não marca erro quando não há mensagem', () => {
    render(<Input label="Link original" />)
    expect(screen.getByLabelText('Link original')).not.toHaveAttribute('aria-invalid')
  })
})

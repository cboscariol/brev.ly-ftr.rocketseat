import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/lib/api'
import * as navigation from '@/lib/navigation'
import { renderRoute } from '@/test/render'

const resolved = {
  id: '6f1c3d0e-0000-4000-8000-000000000001',
  originalUrl: 'https://linkedin.com/in/myprofile',
  shortCode: 'Linkedin-Profile',
  shortUrl: 'http://localhost:5173/Linkedin-Profile',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('/:shortCode', () => {
  it('resolve, registra exatamente um acesso e redireciona (mesmo em StrictMode)', async () => {
    const resolveLink = vi.spyOn(api, 'resolveLink').mockResolvedValue(resolved)
    const registerAccess = vi
      .spyOn(api, 'registerAccess')
      .mockResolvedValue({ id: resolved.id, accessCount: 1 })
    const redirectTo = vi.spyOn(navigation, 'redirectTo').mockImplementation(() => {})

    renderRoute('/Linkedin-Profile')

    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith(resolved.originalUrl))
    expect(screen.getByRole('heading', { name: 'Redirecionando...' })).toBeInTheDocument()

    expect(resolveLink).toHaveBeenCalledTimes(1)
    expect(resolveLink.mock.calls[0]?.[0]).toBe('Linkedin-Profile')
    expect(registerAccess).toHaveBeenCalledTimes(1)
    expect(registerAccess).toHaveBeenCalledWith(resolved.id)
    expect(screen.getByRole('link', { name: 'Acesse aqui' })).toHaveAttribute(
      'href',
      resolved.originalUrl,
    )
  })

  it('mostra a página 404 quando o código não existe, sem contar acesso', async () => {
    vi.spyOn(api, 'resolveLink').mockRejectedValue(
      new ApiError(404, 'LINK_NOT_FOUND', 'Link não encontrado.'),
    )
    const registerAccess = vi.spyOn(api, 'registerAccess')
    const redirectTo = vi.spyOn(navigation, 'redirectTo')

    renderRoute('/nao-existe')

    expect(await screen.findByRole('heading', { name: 'Link não encontrado' })).toBeInTheDocument()
    expect(registerAccess).not.toHaveBeenCalled()
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it('não consulta a API para códigos mal formatados', async () => {
    const resolveLink = vi.spyOn(api, 'resolveLink')

    renderRoute('/c%C3%B3digo%20inv%C3%A1lido')

    expect(await screen.findByRole('heading', { name: 'Link não encontrado' })).toBeInTheDocument()
    expect(resolveLink).not.toHaveBeenCalled()
  })

  it('diferencia falha temporária da API de link inexistente', async () => {
    vi.spyOn(api, 'resolveLink').mockRejectedValue(
      new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor.'),
    )
    const redirectTo = vi.spyOn(navigation, 'redirectTo')

    renderRoute('/Linkedin-Profile')

    expect(
      await screen.findByRole('heading', { name: 'Não foi possível abrir o link' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Link não encontrado' })).not.toBeInTheDocument()
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it('redireciona mesmo se o registro do acesso falhar', async () => {
    vi.spyOn(api, 'resolveLink').mockResolvedValue(resolved)
    vi.spyOn(api, 'registerAccess').mockRejectedValue(new ApiError(500, 'X', 'Erro'))
    const redirectTo = vi.spyOn(navigation, 'redirectTo').mockImplementation(() => {})

    renderRoute('/Linkedin-Profile')

    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith(resolved.originalUrl))
  })
})

describe('rotas desconhecidas', () => {
  it.each(['/a/b', '/links/123/extra'])('mostra NotFound para %s', async (path) => {
    const resolveLink = vi.spyOn(api, 'resolveLink')

    renderRoute(path)

    expect(await screen.findByRole('heading', { name: 'Link não encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'brev.ly' })).toHaveAttribute('href', '/')
    expect(resolveLink).not.toHaveBeenCalled()
  })
})

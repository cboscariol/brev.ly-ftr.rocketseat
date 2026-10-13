import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/lib/api'
import * as download from '@/lib/download'
import { makeLink, makePage } from '@/test/fixtures'
import { renderRoute } from '@/test/render'

beforeEach(() => {
  vi.spyOn(api, 'listLinks').mockResolvedValue(makePage([]))
})

afterEach(() => {
  vi.restoreAllMocks()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('Home — listagem', () => {
  it('mostra carregamento e depois o estado vazio com CSV desabilitado', async () => {
    const pending = deferred<ReturnType<typeof makePage>>()
    vi.mocked(api.listLinks).mockReturnValue(pending.promise)

    renderRoute('/')

    expect(screen.getByText('Carregando links...')).toBeInTheDocument()
    pending.resolve(makePage([]))

    expect(await screen.findByText('Ainda não existem links cadastrados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar CSV' })).toBeDisabled()
  })

  it('lista os links com URL curta, original e acessos', async () => {
    vi.mocked(api.listLinks).mockResolvedValue(
      makePage([
        makeLink({ shortCode: 'Portfolio-Dev', accessCount: 30 }),
        makeLink({
          shortCode: 'Linkedin-Profile',
          originalUrl: 'https://linkedin.com/in/myprofile',
          accessCount: 1,
        }),
      ]),
    )

    renderRoute('/')

    const link = await screen.findByRole('link', { name: 'brev.ly/Portfolio-Dev' })
    expect(link).toHaveAttribute('href', 'http://localhost:5173/Portfolio-Dev')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText('linkedin.com/in/myprofile')).toBeInTheDocument()
    expect(screen.getByText('30 acessos')).toBeInTheDocument()
    expect(screen.getByText('1 acesso')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar CSV' })).toBeEnabled()
  })

  it('mostra erro e permite tentar novamente', async () => {
    vi.mocked(api.listLinks).mockRejectedValue(new ApiError(500, 'X', 'Falhou'))

    renderRoute('/')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os links.',
    )
    vi.mocked(api.listLinks).mockResolvedValue(makePage([makeLink()]))
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('link', { name: 'brev.ly/Portfolio-Dev' })).toBeInTheDocument()
  })

  it('carrega a próxima página', async () => {
    vi.mocked(api.listLinks).mockImplementation(async (page) =>
      page === 1
        ? makePage([makeLink({ shortCode: 'primeiro' })], { total: 2, totalPages: 2, pageSize: 1 })
        : makePage([makeLink({ shortCode: 'segundo' })], {
            page: 2,
            total: 2,
            totalPages: 2,
            pageSize: 1,
          }),
    )

    renderRoute('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Carregar mais links' }))

    expect(await screen.findByRole('link', { name: 'brev.ly/segundo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'brev.ly/primeiro' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Carregar mais links' })).not.toBeInTheDocument()
  })
})

describe('Home — cadastro', () => {
  it('mantém "Salvar link" desabilitado enquanto o formulário está vazio', async () => {
    renderRoute('/')
    expect(screen.getByRole('button', { name: 'Salvar link' })).toBeDisabled()
  })

  it('valida URL e código antes de chamar a API', async () => {
    const createLink = vi.spyOn(api, 'createLink')
    const user = userEvent.setup()
    renderRoute('/')

    await user.type(screen.getByLabelText('Link original'), 'não é url')
    await user.type(screen.getByLabelText('Link encurtado'), 'com espaço')
    await user.click(screen.getByRole('button', { name: 'Salvar link' }))

    expect(await screen.findByText('Informe uma URL válida.')).toBeInTheDocument()
    expect(
      screen.getByText('Use de 3 a 32 caracteres: letras, números, hífen ou sublinhado.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Link original')).toHaveAttribute('aria-invalid', 'true')
    expect(createLink).not.toHaveBeenCalled()
  })

  it('cria o link uma única vez, normaliza a URL e limpa o formulário', async () => {
    const pending = deferred<ReturnType<typeof makeLink>>()
    const createLink = vi.spyOn(api, 'createLink').mockReturnValue(pending.promise)
    const user = userEvent.setup()
    renderRoute('/')

    await user.type(screen.getByLabelText('Link original'), 'linkedin.com/in/myprofile')
    await user.type(screen.getByLabelText('Link encurtado'), 'Linkedin-Profile')
    await user.click(screen.getByRole('button', { name: 'Salvar link' }))

    const submit = await screen.findByRole('button', { name: 'Salvando...' })
    expect(submit).toBeDisabled()
    await user.click(submit)

    vi.mocked(api.listLinks).mockResolvedValue(
      makePage([makeLink({ shortCode: 'Linkedin-Profile' })]),
    )
    pending.resolve(makeLink({ shortCode: 'Linkedin-Profile' }))

    expect(await screen.findByText('Link criado com sucesso')).toBeInTheDocument()
    expect(createLink).toHaveBeenCalledTimes(1)
    expect(createLink).toHaveBeenCalledWith({
      originalUrl: 'https://linkedin.com/in/myprofile',
      shortCode: 'Linkedin-Profile',
    })
    expect(screen.getByLabelText('Link original')).toHaveValue('')
    expect(
      await screen.findByRole('link', { name: 'brev.ly/Linkedin-Profile' }),
    ).toBeInTheDocument()
  })

  it('mostra erro no campo quando o código já existe', async () => {
    vi.spyOn(api, 'createLink').mockRejectedValue(
      new ApiError(409, 'SHORT_CODE_TAKEN', 'Este link encurtado já está em uso.'),
    )
    const user = userEvent.setup()
    renderRoute('/')

    await user.type(screen.getByLabelText('Link original'), 'exemplo.com')
    await user.type(screen.getByLabelText('Link encurtado'), 'existente')
    await user.click(screen.getByRole('button', { name: 'Salvar link' }))

    expect(await screen.findByText('Este link encurtado já está em uso.')).toBeInTheDocument()
    expect(screen.getByLabelText('Link encurtado')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Home — ações da lista', () => {
  beforeEach(() => {
    vi.mocked(api.listLinks).mockResolvedValue(
      makePage([makeLink({ id: 'abc', shortCode: 'apagar' })]),
    )
  })

  it('exclui após confirmação e não exclui ao cancelar', async () => {
    const deleteLink = vi.spyOn(api, 'deleteLink').mockResolvedValue()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup()
    renderRoute('/')

    const button = await screen.findByRole('button', { name: 'Excluir brev.ly/apagar' })
    await user.click(button)
    expect(deleteLink).not.toHaveBeenCalled()

    vi.mocked(api.listLinks).mockResolvedValue(makePage([]))
    await user.click(button)

    expect(confirm).toHaveBeenLastCalledWith('Você realmente quer apagar o link brev.ly/apagar?')
    expect(deleteLink).toHaveBeenCalledWith('abc')
    expect(await screen.findByText('Ainda não existem links cadastrados')).toBeInTheDocument()
  })

  it('copia a URL encurtada real', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderRoute('/')

    await user.click(await screen.findByRole('button', { name: 'Copiar brev.ly/apagar' }))

    expect(writeText).toHaveBeenCalledWith('http://localhost:5173/apagar')
    expect(await screen.findByText('Link copiado com sucesso')).toBeInTheDocument()
  })

  it('exporta o CSV uma única vez e baixa o arquivo retornado', async () => {
    const pending = deferred<{ fileName: string; downloadUrl: string }>()
    const exportLinks = vi.spyOn(api, 'exportLinks').mockReturnValue(pending.promise)
    const downloadFile = vi.spyOn(download, 'downloadFile').mockImplementation(() => {})
    const user = userEvent.setup()
    renderRoute('/')

    const button = await screen.findByRole('button', { name: 'Baixar CSV' })
    await user.click(button)
    expect(button).toBeDisabled()
    await user.click(button)

    pending.resolve({
      fileName: 'links-1.csv',
      downloadUrl: 'https://cdn.example.com/exports/links-1.csv',
    })

    await waitFor(() =>
      expect(downloadFile).toHaveBeenCalledWith(
        'https://cdn.example.com/exports/links-1.csv',
        'links-1.csv',
      ),
    )
    expect(exportLinks).toHaveBeenCalledTimes(1)
  })

  it('avisa quando a exportação falha', async () => {
    vi.spyOn(api, 'exportLinks').mockRejectedValue(
      new ApiError(
        503,
        'STORAGE_NOT_CONFIGURED',
        'Exportação indisponível: armazenamento não configurado.',
      ),
    )
    const user = userEvent.setup()
    renderRoute('/')

    await user.click(await screen.findByRole('button', { name: 'Baixar CSV' }))

    const toast = await screen.findByText('Erro ao exportar')
    expect(
      within(toast.closest('li') as HTMLElement).getByText(/armazenamento não configurado/),
    ).toBeInTheDocument()
  })
})

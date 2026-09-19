# arturtmelo.dev

Portfólio pessoal de **Artur Tavares de Melo** — desenvolvedor full-stack. Um site estático em tema de terminal/hacker, escrito em HTML, CSS e JavaScript puro: sem framework, sem build, sem dependências. A interface é toda em português.

**Ao vivo:** https://arturtmelo.dev

## O que tem no site

- **Hero, sobre, stack e projetos** — apresentação, linha do tempo em formato de `git log`, cartões de projeto e o globo dos idiomas.
- **Terminal interativo** — comandos de verdade (veja abaixo), com histórico, `Tab` para completar e atalhos clicáveis.
- **Playground** — três jogos: **Snake** (com zoom no celular), **corrida de digitação** e **labirinto de palavras** (4×4, 5×5 ou 6×6, com uma única rota que passa por todos os quadrados).
- **Cinco temas de cor** — Matrix (padrão), Amber CRT, Dracula, Nord e Synthwave; a barra do navegador no celular acompanha o tema.
- **Paleta de comandos** (`Ctrl+K` / `⌘K`), lista de atalhos (`?`) e oito **conquistas** escondidas.
- **Código Konami** — no computador digita-se; no celular abre um controle na tela (rodapé).
- **Versão para impressão** — `Ctrl+P` gera um currículo limpo a partir da própria página.

### Comandos do terminal

`help` · `about` · `skills` · `experience` · `education` · `languages` · `projects` · `contact` · `email` · `github` · `linkedin` · `cv` · `open <projeto>` · `whoami` · `ls` · `cat` · `history` · `neofetch` · `git log` · `date` · `banner` · `theme <nome>` · `sound` · `palette` · `achievements` · `konami` · `echo` · `clear` — e alguns segredos. Digite `help` para a lista completa.

### Atalhos

| Tecla | Ação |
| --- | --- |
| `Ctrl` + `K` / `⌘K` | paleta de comandos |
| `?` | lista de atalhos |
| `Esc` | fecha modais e janelas maximizadas |
| `↑↑↓↓←→←→BA` | código Konami |
| `WASD` / setas | controla o Snake |
| `Tab` · `↑` `↓` | completar comandos · histórico, no terminal |

## Estrutura

```
index.html              página completa (o que o Vercel serve)
404.html                página de erro, no mesmo estilo
css/style.css           todos os estilos, temas e regras de impressão
js/script.js            todo o comportamento (seções marcadas por comentários /* ---- */)
js/404.js               script da página 404 (fora do HTML por causa da CSP)
fonts/                  JetBrains Mono e Space Grotesk (latin, woff2) + licenças OFL
img/projects/           capturas dos projetos (webp)
og-card.png             imagem de compartilhamento (Open Graph / Twitter)
apple-touch-icon.png    ícone para a tela inicial do iOS
robots.txt, sitemap.xml SEO
vercel.json             cabeçalhos de segurança e cache
artifact-preview.html   espelho do <body> do index.html, usado para pré-visualizar
```

## Como editar o conteúdo

- **Textos, links, experiência, formação:** direto no `index.html`.
- **Projetos:** cada um é um `<article class="project-card">` em `#projects`. O terminal (`projects`, `open <projeto>`) lê esses cartões, então basta adicionar ou editar o cartão — não há lista duplicada.
- **Linha do tempo (`git log`):** o bloco `.git-log` do `index.html`; cada commit tem `hash`, data, mensagem e uma linha de detalhe.
- **Cores dos temas:** variáveis CSS em `css/style.css` (`:root` e `:root[data-theme="..."]`). Ao mudar o `--bg` de um tema, atualize também o `bg` correspondente em `THEMES` no `js/script.js` (é a cor da barra do navegador no celular).
- **Palavras do labirinto:** lista `WORDS` no módulo do labirinto (`js/script.js`), com dica por palavra; só letras A–Z, sem acento.
- **Conquistas e atalhos:** `ACHIEVEMENTS` e `SHORTCUTS` no início do `js/script.js`.

> Sempre que mudar o `<body>` do `index.html`, aplique a mesma mudança no `artifact-preview.html` — os dois corpos precisam ser idênticos.

## Rodar localmente

Não há build. Abra o `index.html` no navegador, ou sirva a pasta com qualquer servidor estático:

```bash
npx serve .
# ou
python -m http.server 8000
```

## Deploy

Push para a branch `master` no GitHub (`arturtmelo/portfolio`) → o Vercel publica automaticamente em `arturtmelo.dev`.

`vercel.json` define:

- **Segurança:** `Content-Security-Policy` restritiva (só recursos do próprio domínio; estilos inline permitidos; `data:` só para imagens), `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`. Por causa da CSP, **não use `<script>` inline nem `onclick=` no HTML** — todo JavaScript fica em arquivos.
- **Cache:** fontes com `immutable` por um ano; imagens e ícones por sete dias.

## Notas de engenharia

- **Acessibilidade:** navegação por teclado completa, `aria-*` em modais e controles, foco devolvido ao fechar, `prefers-reduced-motion` respeitado e contraste conferido nos cinco temas.
- **Desempenho:** animações decorativas pausam fora da tela, o canvas do fundo só inicia quando o navegador está ocioso, o labirinto só é gerado quando a aba aparece e as fontes são pré-carregadas (self-hosted, sem chamadas externas).
- **Sem rastreamento:** nenhum analytics, nenhum cookie, nenhuma requisição a terceiros. Tudo que o site guarda (tema, som, conquistas, recordes) fica no `localStorage` do próprio navegador.

## Licença

Código e conteúdo © Artur Tavares de Melo. As fontes seguem a licença SIL OFL (arquivos em `fonts/`).

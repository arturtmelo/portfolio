# arturtmelo.dev

Portfólio pessoal de **Artur Tavares de Melo** — desenvolvedor full-stack. Um site estático em tema de terminal/hacker, escrito em HTML, CSS e JavaScript puro: sem framework, sem build, sem dependências. A interface é toda em português.

**Ao vivo:** https://arturtmelo.dev

## O que tem no site

- **Hero, sobre, stack e projetos** — apresentação, linha do tempo em formato de `git log`, cartões de projeto e o globo dos idiomas.
- **Terminal interativo** — comandos de verdade (veja abaixo), com histórico, `Tab` para completar e atalhos clicáveis.
- **Playground** — três jogos: **Snake** (com zoom no celular), **corrida de digitação** e **labirinto de palavras** (4×4, 5×5 ou 6×6, com uma única rota que passa por todos os quadrados).
- **Seis temas de cor** — Matrix (padrão), Amber CRT, Dracula, Nord, Synthwave e **Claro** (papel, o único tema claro). O botão de paleta de tintas no topo abre a lista ("temas — toque em um:"), a tecla `T` passa para o próximo e a troca é uma transição suave (sem ela quando o sistema pede menos movimento). A escolha fica salva, e a barra do navegador no celular acompanha o tema.
- **Paleta de comandos** (`Ctrl+K` / `⌘K`), lista de atalhos (`?`) e oito **conquistas** escondidas.
- **Código Konami** — no computador digita-se; no celular abre um controle na tela (rodapé).
- **Currículo em PDF de verdade** — o botão `baixar_cv()` baixa `Artur-Tavares-de-Melo-CV.pdf` (A4, 2 páginas, texto selecionável e marcado para leitores de tela e sistemas de recrutamento). `Ctrl+P` gera o mesmo currículo direto do navegador.
- **Contato direto** — e-mail (com botão de copiar), LinkedIn, GitHub e o currículo em PDF; o botão flutuante do WhatsApp fica em todas as páginas.

### Comandos do terminal

`help` · `about` · `skills` · `experience` · `education` · `languages` · `projects` · `contact` · `email` · `github` · `linkedin` · `cv` (baixa o PDF; `cv imprimir` abre a impressão) · `open <projeto>` · `whoami` · `ls` · `cat` · `history` · `neofetch` · `git log` · `date` · `banner` · `theme <nome>` (também `theme light`) · `sound` · `palette` · `achievements` · `konami` · `echo` · `clear` — e alguns segredos. Digite `help` para a lista completa.

### Atalhos

| Tecla | Ação |
| --- | --- |
| `Ctrl` + `K` / `⌘K` | paleta de comandos |
| `?` | lista de atalhos |
| `T` | próximo tema |
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
Artur-Tavares-de-Melo-CV.pdf  o currículo em PDF (gerado, veja abaixo)
scripts/build-cv.js     gera o PDF a partir da versão de impressão do site
robots.txt, sitemap.xml SEO
vercel.json             cabeçalhos de segurança e cache
artifact-preview.html   espelho do <body> do index.html, usado para pré-visualizar
```

## Como editar o conteúdo

- **Textos, links, experiência, formação:** direto no `index.html`.
- **Projetos:** cada um é um `<article class="project-card">` em `#projects`. O terminal (`projects`, `open <projeto>`) lê esses cartões, então basta adicionar ou editar o cartão — não há lista duplicada.
- **Linha do tempo (`git log`):** o bloco `.git-log` do `index.html`; cada commit tem `hash`, data, mensagem e uma linha de detalhe.
- **Cores dos temas:** variáveis CSS em `css/style.css` (`:root` e `:root[data-theme="..."]`). Além das cores de sempre (`--bg`, `--text`, `--green`...), cada tema define as superfícies: `--screen` (prompt do terminal, caixas de código, tabuleiros), `--bar-bg`, `--tag-bg`, `--on-accent` (texto sobre o verde), `--bg-rgb`, `--card-rgb`, `--scrim-rgb` e `--overlay-rgb` (para camadas translúcidas) e `--shadow-k` (força das sombras). **Não escreva cores escuras fixas nos componentes:** use essas variáveis, senão o tema claro quebra.
- **Criar um tema novo:** (1) um bloco `:root[data-theme="nome"], [data-swatch="nome"] { ... }` no CSS (o seletor `data-swatch` faz a amostra de cor do menu se atualizar sozinha); (2) uma linha em `THEMES` no `js/script.js` com o `label` e o `bg` (a cor da barra do navegador no celular, igual ao `--bg`); (3) confira o contraste (4,5:1 para texto) com o axe-core nos estados principais.
- **Palavras do labirinto:** lista `WORDS` no módulo do labirinto (`js/script.js`), com dica por palavra; só letras A–Z, sem acento.
- **Conquistas e atalhos:** `ACHIEVEMENTS` e `SHORTCUTS` no início do `js/script.js`.

## O currículo em PDF

O PDF **não é escrito à mão**: sai da versão de impressão do próprio site (`@media print` em `css/style.css`, com `@page` em A4), então o conteúdo vem do `index.html`. Depois de mudar qualquer coisa que apareça no currículo (texto, experiência, projetos, habilidades), gere de novo e faça o commit do arquivo:

```bash
node scripts/build-cv.js
```

Precisa do Node 22+ e de um Chrome, Chromium ou Edge instalado (sem dependências; use `CHROME=/caminho/do/chrome` se ele estiver num lugar incomum). O script imprime o tamanho e o número de páginas.

O que sai na impressão é decidido no CSS: títulos como `sobre.txt` viram "Sobre", o título "ARTUR" dá lugar ao nome completo (`.print-name`), a linha "disponível para novas oportunidades" e os cartões de contato ficam de fora, e os projetos ganham o endereço dos links por extenso. Para esconder ou trazer algo, ajuste a lista de `display: none` no início do bloco `@media print`.

> Sempre que mudar o `<body>` do `index.html`, aplique a mesma mudança no `artifact-preview.html` — os dois corpos precisam ser idênticos.

## Rodar localmente

O site não tem build. Abra o `index.html` no navegador, ou sirva a pasta com qualquer servidor estático:

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

- **Acessibilidade:** navegação por teclado completa e sem armadilhas de foco (o `Tab` do terminal só completa quando há o que completar; a ordem de foco segue a leitura da página), `aria-*` em modais e controles, foco devolvido ao fechar, `prefers-reduced-motion` respeitado, contraste conferido nos seis temas e suporte ao **modo de alto contraste do Windows** (`forced-colors`: ícones, seleções e o acerto/erro da corrida de digitação continuam visíveis). Ao criar um controle novo, teste-o só com o teclado e com o alto contraste ligado.
- **Desempenho:** animações decorativas pausam fora da tela, o canvas do fundo só inicia quando o navegador está ocioso, o labirinto só é gerado quando a aba aparece e as fontes são pré-carregadas (self-hosted, sem chamadas externas).
- **Sem rastreamento:** nenhum analytics, nenhum cookie, nenhuma requisição a terceiros. Tudo que o site guarda (tema, som, conquistas, recordes) fica no `localStorage` do próprio navegador.

## Licença

Código e conteúdo © Artur Tavares de Melo. As fontes seguem a licença SIL OFL (arquivos em `fonts/`).

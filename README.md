

<div align="center">

<a href="https://www.npmjs.com/package/ravdw" target="_blank"><img src="https://img.shields.io/badge/-ravdw-c40404?style=flat-square&labelColor=c40404&logo=npm&logoColor=white&link=https://www.npmjs.com/package/ravdw" height="40" /></a>  
 <a href="https://www.npmjs.com/package/ravdw" target="_blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/ravdw?style=flat-square&logo=npm&labelColor=c40404&color=c40404" height="40" ></a>

---

# ⚙️ RAVDW

### 🔍 Consulta WHOIS simples, 📬 Sugestões inteligentes de contatos para denúncia e 📄 Sistema simples de relatório.

[![⭐ Stars](https://img.shields.io/github/stars/ravenastar-js/ravdw?style=for-the-badge&label=%E2%AD%90%20Stars&color=2d7445&logo=star&logoColor=white&labelColor=444&radius=10)](https://github.com/ravenastar-js/ravdw/stargazers)
[![🔱 Forks](https://img.shields.io/github/forks/ravenastar-js/ravdw?style=for-the-badge&label=%F0%9F%94%B1%20Forks&color=2d7445&logo=git&logoColor=white&labelColor=444&radius=10)](https://github.com/ravenastar-js/ravdw/network/members)
[![📦 NPM Version](https://img.shields.io/npm/v/ravdw?style=for-the-badge&label=%F0%9F%93%A6%20NPM&color=2d7445&logo=npm&logoColor=white&labelColor=444&radius=10)](https://www.npmjs.com/package/ravdw)
[![⚙️ Node.js](https://img.shields.io/badge/%E2%9A%99%EF%B8%8F%20Node.js-14.0%2B-green?style=for-the-badge&logo=nodedotjs&color=2d7445&logoColor=white&labelColor=444&radius=10)](https://nodejs.org)
[![📄 License](https://img.shields.io/badge/%F0%9F%93%84%20License-MIT-blue?style=for-the-badge&logo=opensourceinitiative&color=2d7445&logoColor=white&labelColor=444&radius=10)](LICENSE)

</div>

![RavDW](media/ravdw.png)

<div align="center">
BANNER INSPIRADO EM
<br>
<a href="https://store.steampowered.com/app/1507580/Enigma_do_Medo" >
  <img src="https://i.imgur.com/Gbyx94i.png" width="180">
</a>
</div>

---

## 🎯 Visão Geral

**🔍 Consulta WHOIS simples, 📬 Sugestões inteligentes de contatos para denúncia e 📄 Sistema simples de relatório.**

## 🌟 Características Principais

- **🔍 Consulta WHOIS**: RDAP, WHOIS tradicional e Hackertarget
- **📄 Gerador de Relatórios**: Denúncias para phishing, pirataria, LGPD, malware e mais
- **🏠 Detecção Inteligente**: Identifica hospedagem gratuita e provedores
- **🌐 Internacionalização**: Português e Inglês
- **💬 Interface Amigável**: Modo interativo com menus intuitivos
- **📊 Dados Consolidados**: Informações técnicas organizadas e relevantes

📦 Instalação Rápida

<details>
<summary>📥 Como instalar o NodeJS?</summary>

- [COMO INSTALAR NODE JS NO WINDOWS?](https://youtu.be/-jft_9PlffQ)
</details>

```bash
npm i -g ravdw           # ✅ Recomendado
npm install -g ravdw     # ✅ Completo

# Após instalação, use em qualquer lugar:
ravdw help
ravdw --help
```bash

### 🔍 VERIFICAR INSTALAÇÃO

```bash
npm ls -g ravdw          # ✅ Listar pacote
npm list -g ravdw        # ✅ Completo
ravdw version            # ✅ Versão instalada
ravdw --version          # ✅ Versão instalada
```

## 🗑️ DESINSTALAR GLOBALMENTE

```bash
npm un -g ravdw          # ✅ Recomendado  
npm uninstall -g ravdw   # ✅ Completo
npm remove -g ravdw      # ✅ Alternativo
```

## 🎯 Como Usar

### 🔍 Consulta Rápida de Domínio

```bash
# Consulta básica
ravdw exemplo.com

# Consulta específica
ravdw lookup exemplo.com

# Com timeout personalizado
ravdw lookup exemplo.com --timeout=15000
```

### 📄 Gerar Relatório de Denúncia

```bash
# Relatório interativo
ravdw report exemplo.com

# Relatório com opções específicas
ravdw report exemplo.com --type=phishing --evidence=https://exemplo.com/fake-login

# Múltiplas violações
ravdw report exemplo.com --type=phishing,piracy,malware --evidence=url1,url2,url3
```

### 💬 Modo Interativo (Recomendado)

```bash
ravdw
```

### 🆘 Ajuda e Informações

```bash
# Ajuda completa
ravdw help
ravdw --help

# Versão
ravdw version
ravdw --version
```

## 📋 Tipos de Violação Suportados

| Violação | Emoji | Descrição |
|----------|-------|-----------|
| `phishing` | 🕵️ | Imitação de sites legítimos |
| `piracy` | 🏴‍☠️ | Distribuição não autorizada |
| `lgpd` | 📊 | Violação de proteção de dados |
| `childporn` | 🚫 | Conteúdo de exploração infantil |
| `hate` | 💢 | Discurso de ódio |
| `scam` | 🎭 | Golpes financeiros |
| `copyright` | 📝 | Violação de direitos autorais |
| `malware` | 🦠 | Distribuição de malware |
| `spam` | 📨 | Spam massivo |
| `other` | ❓ | Outras violações |

## 🏠 Provedores Detectados Automaticamente

- **☁️ Cloudflare Pages** (`pages.dev`)
- **🐙 GitHub Pages** (`github.io`) 
- **▲ Vercel** (`vercel.app`)
- **🎯 Netlify** (`netlify.app`)
- **🔥 Firebase** (`web.app`)
- **🔮 Glitch** (`glitch.me`)
- **⚙️ Heroku** (`herokuapp.com`)
- **📝 WordPress** (`wordpress.com`)
- **✍️ Blogger** (`blogspot.com`)
- **🌐 Weebly** (`weebly.com`)
- **🆓 000webhost** (`000webhost.com`)

## 📊 Exemplo de Saída

### 🔍 Consulta WHOIS

```text
+----------------------------------------------------+
|                                                    |
|   📋 Informações do Domínio                       |
|   Domínio: exemplo.com                              |
|   Registrado em: 15/09/1997 às 01:00:00 (-03:00)   |
|   Expira em: 14/09/2028 às 01:00:00 (-03:00)       |
|   Atualizado em: 09/09/2019 às 12:39:04 (-03:00)   |
|                                                    |
+----------------------------------------------------+

+---------------------------------------------------------+
|                                                         |
|   🏢 Informações do Registrador                         |
|   Registrador: Exemplo Inc.                             |
|   Email de Abuso: abuse@exemplo.com                     |
|   Formulário: https://www.exemplo.com/contact-us/       |
|                                                         |
+---------------------------------------------------------+
```

### 📄 Relatório Gerado

```text
🧾 ABUSE REPORT - exemplo.com

O domínio "exemplo.com", registrado por "MarkMonitor Inc.", está sendo utilizado para:
• Phishing - imitação de sites legítimos para captura de credenciais

📚 POSSÍVEIS LEIS APLICÁVEIS:
• Art. 154-A do CP — Invasão de Dispositivo Informático
• Art. 171, §2º-A do CP — Fraude Eletrônica

🎯 PRÓXIMOS PASSOS RECOMENDADOS:
  🌐 Arquive as evidências gratuitamente na Wayback Machine...
  📸 Registre as evidências em plataformas confiáveis...
```

## 🏗️ Estrutura do Projeto

```bash
📁 ravdw/
├── 📁 bin/
│   └── 🔧 ravdw.js
├── 📁 lib/
│   ├── 🌐 index.js
│   ├── 📄 lang.json
│   └── 📁 core/ ⚙️
│       ├── 🈲 i18n.js
│       ├── 🗺️ SiteMap.js
│       ├── 🛠️ utils.js
│       └── 🔍 WhoisEngine.js
├── 📁 commands/ 💬
│   ├── 🔎 lookup.js
│   ├── 📊 report.js
│   └── 💬 interactive.js
├── 📦 package.json
├── 📖 README.md
└── ⚙️ .gitignore
```


## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">

## Feito com 💚 por [RavenaStar](https://linktr.ee/ravenastar)

[⬆ Voltar ao topo](#-ravdw)

</div>

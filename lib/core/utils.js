const chalk = require('chalk');
const boxen = require('boxen');
const figlet = require('figlet');
const moment = require('moment-timezone');

function detectSystemLanguage() {
    try {
        const envLang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || '';
        if (envLang.includes('pt')) return 'pt';
        if (envLang.includes('en')) return 'en';
        
        const locale = Intl.DateTimeFormat().resolvedOptions().locale;
        if (locale.startsWith('pt')) return 'pt';
        
        return 'en';
    } catch {
        return 'en';
    }
}

function validateAndCleanDomain(domain) {
    if (!domain || domain.trim() === '') {
        return 'Por favor, digite um domínio válido.';
    }
    
    let cleanDomain = domain
        .trim()
        .toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?/, '')
        .split('/')[0];
    
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    
    if (!domainRegex.test(cleanDomain)) {
        return 'Domínio inválido. Use: exemplo.com ou subdominio.exemplo.com';
    }
    
    return cleanDomain;
}

function handleError(error, lang) {
    const errorMessages = {
        pt: {
            general: '❌ Erro durante a execução:',
            network: '   Verifique sua conexão com a internet.',
            timeout: '   A consulta WHOIS excedeu o tempo limite.',
            server: '   Servidor WHOIS indisponível.',
            domain: '   Domínio não encontrado ou inválido.',
            tip: '💡 Dica: Verifique se o domínio existe e tente novamente.'
        },
        en: {
            general: '❌ Error during execution:',
            network: '   Check your internet connection.',
            timeout: '   WHOIS query timed out.',
            server: '   WHOIS server unavailable.',
            domain: '   Domain not found or invalid.',
            tip: '💡 Tip: Check if the domain exists and try again.'
        }
    };
    
    const msg = errorMessages[lang] || errorMessages.en;
    
    console.error(chalk.red(`\n${msg.general}`));
    console.error(chalk.red(`   ${error.message}`));
    
    if (error.code === 'ENOTFOUND') {
        console.error(chalk.red(msg.network));
    } else if (error.code === 'TIMEOUT') {
        console.error(chalk.red(msg.timeout));
    } else if (error.message.includes('ECONNREFUSED')) {
        console.error(chalk.red(msg.server));
    } else if (error.message.includes('not found') || error.message.includes('invalid')) {
        console.error(chalk.red(msg.domain));
    }
    
    console.error(chalk.gray(`\n${msg.tip}`));
    process.exit(1);
}

function timeout(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Timeout após ${ms}ms`));
        }, ms);
    });
}

function displayBanner(version, title = 'RAVDW') {
    const bannerText = chalk.cyan.bold(figlet.textSync(title, { 
        font: 'Standard',
        horizontalLayout: 'default'
    })) + '\n' + chalk.gray(`v${version} - Consulta WHOIS e geração de relatórios de denúncia`);

    console.log(
        boxen(
            bannerText,
            { 
                padding: 1, 
                borderColor: 'cyan', 
                borderStyle: 'round',
                margin: 1,
                textAlignment: 'center'
            }
        )
    );
}

function formatDateWithTimezone(dateString, lang = 'en') {
    if (!dateString) return 'N/D';
    
    try {
        let momentDate = moment(dateString);
        
        if (!momentDate.isValid()) {
            return dateString;
        }
        
        const timezone = moment.tz.guess();
        if (lang === 'pt') {
            return momentDate.tz(timezone).format('DD/MM/YYYY [às] HH:mm:ss [(]Z[)]');
        } else {
            return momentDate.tz(timezone).format('YYYY-MM-DD [at] HH:mm:ss [(]Z[)]');
        }
    } catch (error) {
        return dateString;
    }
}

function normalizeProviderName(providerName) {
    if (!providerName) return '';
    
    return providerName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s+/g, '');
}

function hasProviderMatch(registrar, providerKey) {
    if (!registrar || !providerKey) return false;
    
    const registrarNormalized = normalizeProviderName(registrar);
    const providerNormalized = normalizeProviderName(providerKey);
    
    if (registrarNormalized === providerNormalized) {
        return true;
    }
    
    if (registrarNormalized.includes(providerNormalized) || 
        providerNormalized.includes(registrarNormalized)) {
        return true;
    }
    
    const synonymMap = {
        'markmonitor': ['markmonitorinc', 'markmonitor'],
        'tucows': ['tucowsdomains', 'tucows'],
        'godaddy': ['godaddycom', 'godaddy'],
        'namecheap': ['namecheapinc', 'namecheap'],
        'cloudflare': ['cloudflareinc', 'cloudflare'],
        'google': ['googlellc', 'googleinc', 'google'],
        'enom': ['enominc', 'enom'],
        'namebright': ['namebrightcom', 'namebright'],
        'webnic': ['webniccc', 'webnic'],
        'publicdomainregistry': ['publicdomainregistry', 'pdr'],
        'epik': ['epikcom', 'epik'],
        'hostinger': ['hostingercom', 'hostinger'],
        'hostgator': ['hostgatorcom', 'hostgator'],
        'bluehost': ['bluehostcom', 'bluehost'],
        'dreamhost': ['dreamhostcom', 'dreamhost'],
        'vercel': ['vercelinc', 'vercel'],
        'netlify': ['netlifycom', 'netlify'],
        'github': ['githubinc', 'github'],
        'amazon': ['amazoncom', 'amazonaws', 'aws'],
        'microsoft': ['microsoftcom', 'microsoft']
    };
    
    for (const [baseName, synonyms] of Object.entries(synonymMap)) {
        if (synonyms.includes(providerNormalized) && synonyms.some(syn => registrarNormalized.includes(syn))) {
            return true;
        }
        if (synonyms.includes(registrarNormalized) && synonyms.some(syn => providerNormalized.includes(syn))) {
            return true;
        }
    }
    
    return false;
}

function filterRelevantContacts(contacts, result) {
    if (!Array.isArray(contacts)) return [];
    
    const registrar = result.rdapSummary?.registrar || '';
    const hostingProvider = result.siteAnalysis?.hostingProvider?.name || '';
    const domain = result.query || '';
    
    const relevantContacts = contacts.filter(contact => {
        const provider = contact.provider || '';
        
        if (registrar && hasProviderMatch(registrar, provider)) {
            return true;
        }
        
        if (hostingProvider && hasProviderMatch(hostingProvider, provider)) {
            return true;
        }
        
        if (domain.endsWith('.br')) {
            if (provider.includes('registro.br') || provider.includes('cert.br')) {
                return true;
            }
        }
        
        return false;
    });
    
    const uniqueContacts = [];
    const seenContacts = new Set();
    
    for (const contact of relevantContacts) {
        const contactKey = `${contact.provider}|${contact.contact}`;
        if (!seenContacts.has(contactKey)) {
            seenContacts.add(contactKey);
            uniqueContacts.push(contact);
        }
    }
    
    return uniqueContacts;
}

module.exports = {
    detectSystemLanguage,
    validateAndCleanDomain,
    handleError,
    timeout,
    displayBanner,
    formatDateWithTimezone,
    filterRelevantContacts,
    normalizeProviderName,
    hasProviderMatch
};
const fs = require('fs');
const path = require('path');
const WhoisEngine = require('./core/WhoisEngine');
const SiteMapper = require('./core/SiteMap');
const { filterRelevantContacts, hasProviderMatch, formatDateWithTimezone } = require('./core/utils');
const i18n = require('./core/i18n');

function getVersion() {
    try {
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageData.version || '1.0.0';
    } catch {
        return '1.0.0';
    }
}

async function lookupDomain(domain, options = {}) {
    const lang = options.lang || 'en';
    const query = cleanDomain(domain);

    const [whoisResult, siteAnalysis] = await Promise.allSettled([
        queryWhoisWithFallback(query, options),
        analyzeSiteWithFallback(query, lang)
    ]);

    const contactsData = await loadContactsData();

    return consolidateFinalResult(
        whoisResult.status === 'fulfilled' ? whoisResult.value : null,
        siteAnalysis.status === 'fulfilled' ? siteAnalysis.value : null,
        contactsData,
        lang
    );
}

function cleanDomain(domain) {
    return domain
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .toLowerCase()
        .trim();
}

async function queryWhoisWithFallback(domain, options) {
    try {
        const whoisEngine = new WhoisEngine();
        return await whoisEngine.query(domain, options);
    } catch (error) {
        return {
            domain: domain,
            sources: {},
            consolidated: {
                registrar: i18n.t('common.unknown', 'en'),
                registrarDetails: null,
                nameServers: [],
                status: [],
                contacts: {},
                relatedDomains: [],
                created: null,
                updated: null,
                expires: null
            },
            errors: [error.message],
            reliability: { score: 0, level: 'LOW', sourcesUsed: [] }
        };
    }
}

async function analyzeSiteWithFallback(domain, lang = 'en') {
    try {
        const siteMapper = new SiteMapper(lang);
        return await siteMapper.analyzeDomain(domain);
    } catch (error) {
        return {
            domain: domain,
            isFreeHosting: false,
            hostingProvider: null,
            tldType: 'unknown',
            errors: [error.message]
        };
    }
}

async function loadContactsData() {
    try {
        const contactsUrl = 'https://raw.githubusercontent.com/ravenastar-js/gd/refs/heads/main/report.json';
        const axios = require('axios');
        const response = await axios.get(contactsUrl, { timeout: 10000 });

        if (response.data && typeof response.data === 'object') {
            return response.data;
        }
        throw new Error('Formato inválido');
    } catch (error) {
        return getFallbackContacts();
    }
}

function consolidateFinalResult(whoisResult, siteAnalysis, contactsData, lang) {
    const { consolidated, reliability } = whoisResult || {};

    let finalRegistrar = consolidated?.registrar || i18n.t('common.unknown', lang);
    let finalRegistrarDetails = consolidated?.registrarDetails || null;

    if ((!finalRegistrar || finalRegistrar === i18n.t('common.unknown', lang)) && siteAnalysis?.hostingProvider) {
        finalRegistrar = siteAnalysis.hostingProvider.name;
    }

    const detectedProviders = detectRelevantProviders(
        whoisResult?.domain || 'unknown',
        finalRegistrar,
        siteAnalysis,
        contactsData
    );

    const suggestedContacts = buildSuggestedContacts(
        detectedProviders,
        contactsData,
        lang,
        siteAnalysis,
        consolidated?.contacts
    );

    const result = {
        query: whoisResult?.domain || 'unknown',
        rdapSummary: {
            registrar: finalRegistrar,
            registrarDetails: finalRegistrarDetails,
            statuses: consolidated?.status || ['active'],
            created: consolidated?.created,
            updated: consolidated?.updated,
            expires: consolidated?.expires,
            nameServers: consolidated?.nameServers || [],
            contacts: consolidated?.contacts || {}
        },
        suggestedContacts,
        siteAnalysis: siteAnalysis || {},
        whoisReliability: reliability || { score: 0, level: 'UNKNOWN', sourcesUsed: [] },
        relatedDomains: consolidated?.relatedDomains || [],
        rawData: {
            whois: whoisResult,
            site: siteAnalysis
        }
    };

    result.suggestedContacts = filterRelevantContacts(result.suggestedContacts, result);

    return result;
}

function detectRelevantProviders(domain, registrar, siteAnalysis, contactsData) {
    const providers = new Set();
    const domainLower = domain.toLowerCase();
    const registrarLower = (registrar || '').toLowerCase();

    for (const providerKey of Object.keys(contactsData)) {
        if (hasProviderMatch(registrar, providerKey)) {
            providers.add(providerKey);
        }
    }

    for (const providerKey of Object.keys(contactsData)) {
        const providerData = contactsData[providerKey];
        if (providerData.domains) {
            for (const domainPattern of providerData.domains) {
                if (domainLower.includes(domainPattern.toLowerCase())) {
                    providers.add(providerKey);
                    break;
                }
            }
        }
    }

    if (siteAnalysis?.hostingProvider) {
        const hostName = siteAnalysis.hostingProvider.name;
        for (const providerKey of Object.keys(contactsData)) {
            if (hasProviderMatch(hostName, providerKey)) {
                providers.add(providerKey);
            }
        }
    }

    if (domainLower.endsWith('.br')) {
        providers.add('registro.br');
        providers.add('cert.br');
    }

    return Array.from(providers);
}

function buildSuggestedContacts(providers, contactsData, lang, siteAnalysis, whoisContacts = {}) {
    const suggestedContacts = [];

    if (whoisContacts.abuse && (whoisContacts.abuse.email || whoisContacts.abuse.phone)) {
        const abuseContact = {
            provider: 'WHOIS Abuse Contact',
            type: 'whois',
            contact: whoisContacts.abuse.email || whoisContacts.abuse.phone,
            description: whoisContacts.abuse.email ?
                `Abuse email from WHOIS record${whoisContacts.abuse.phone ? ` | Phone: ${whoisContacts.abuse.phone}` : ''}` :
                `Abuse phone from WHOIS record`
        };

        abuseContact.message = lang === 'pt' 
            ? 'Contato de abuso extraído diretamente do registro WHOIS:'
            : 'Abuse contact extracted directly from WHOIS record:';

        suggestedContacts.push(abuseContact);
    }

    for (const providerKey of providers) {
        const providerData = contactsData[providerKey];
        if (!providerData) continue;

        if (providerData.type === 'email') {
            suggestedContacts.push({
                provider: providerKey,
                type: 'email',
                contact: providerData.contact,
                message: getLocalizedMessage(providerData, 'message', lang, providerKey)
            });
        } else if (providerData.type === 'form') {
            suggestedContacts.push({
                provider: providerKey,
                type: 'form',
                contact: providerData.contact,
                message: getLocalizedMessage(providerData, 'message', lang, providerKey)
            });
        } else if (providerData.type === 'multiple' && Array.isArray(providerData.contacts)) {
            for (const contact of providerData.contacts) {
                suggestedContacts.push({
                    provider: providerKey,
                    type: contact.type,
                    contact: contact.contact,
                    description: getLocalizedMessage(contact, 'description', lang),
                    message: getLocalizedMessage(providerData, 'message', lang, providerKey)
                });
            }
        }
    }

    if (siteAnalysis?.hostingProvider && siteAnalysis.hostingProvider.abuseContact) {
        suggestedContacts.push({
            provider: siteAnalysis.hostingProvider.name,
            type: 'email',
            contact: siteAnalysis.hostingProvider.abuseContact,
            message: lang === 'pt' ?
                `Provedor de hospedagem detectado: ${siteAnalysis.hostingProvider.name}` :
                `Detected hosting provider: ${siteAnalysis.hostingProvider.name}`
        });
    }

    return suggestedContacts;
}

function getLocalizedMessage(data, field, lang, fallback = '') {
    const langField = field + '_' + lang;
    return data[langField] || data[field] ||
        (lang === 'pt' ? `${field} para ${fallback}` : `${field} for ${fallback}`);
}

function getFallbackContacts() {
    return {
        "registro.br": {
            "type": "email",
            "contact": "abuse@registro.br",
            "message_pt": "Envie a denúncia para o e-mail:",
            "message_en": "Send the report to the email:",
            "domains": [".br", "com.br", "net.br", "org.br"]
        },
        "cloudflare": {
            "type": "multiple",
            "contacts": [
                {
                    "type": "form",
                    "contact": "https://abuse.cloudflare.com/phishing",
                    "description_pt": "Formulário oficial da Cloudflare para denunciar abusos",
                    "description_en": "Official Cloudflare form to report abuse"
                }
            ],
            "message_pt": "A Cloudflare oferece formulário para denúncia de abusos:",
            "message_en": "Cloudflare provides a form for reporting abuse:"
        },
        "cert.br": {
            "type": "email",
            "contact": "mail-abuse@cert.br",
            "message_pt": "Envie a denúncia para o e-mail:",
            "message_en": "Send the report to the email:",
            "domains": [".br"]
        },
        "markmonitor": {
            "type": "email",
            "contact": "abusecomplaints@markmonitor.com",
            "message_pt": "Envie a denúncia para o e-mail de abuso:",
            "message_en": "Send the report to the abuse email:"
        }
    };
}

async function generateReport(options) {
    const {
        domain,
        result,
        violations,
        evidences,
        lang,
        outputDir = process.cwd()
    } = options;

    const reportDir = path.join(outputDir, 'reports');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    const fileName = `${domain.replace(/[^a-zA-Z0-9.-]/g, '_')}_relatorio.txt`;
    const filePath = path.join(reportDir, fileName);

    const registrar = result.rdapSummary.registrar || i18n.t('common.unknown', lang);

    const text = generateCompleteReport({
        domain,
        registrar,
        violations,
        evidences,
        lang,
        result
    });

    fs.writeFileSync(filePath, text, 'utf8');
    return filePath;
}

function generateCompleteReport(params) {
    const { domain, registrar, violations, evidences, lang, result } = params;
    const isEnglish = lang === 'en';

    const violationDescriptions = violations.map(violation =>
        getViolationDescription(violation, lang)
    ).join('\n');

    const allLaws = getCombinedLaws(violations, lang);

    const evidenciasFormatadas = evidences.map((evidence, index) => {
        return `[${index + 1}] ${evidence}`;
    }).join('\n');

    const nextSteps = getNextSteps(lang);
    const technicalInfo = generateTechnicalInfo(result, lang);

    if (isEnglish) {
        return `🧾 ABUSE REPORT - ${domain}

The domain "${domain}", registered by "${registrar}", is being used for:
${violationDescriptions}

📚 APPLICABLE LAWS:
${allLaws.map(law => `• ${law}`).join('\n')}

🔗 EVIDENCES:
${evidenciasFormatadas}

---
Report generated by RAVDW v${getVersion()}
${new Date().toISOString()}

${nextSteps}

${technicalInfo}`;
    } else {
        return `🧾 ABUSE REPORT - ${domain}

O domínio "${domain}", registrado por "${registrar}", está sendo utilizado para:
${violationDescriptions}

📚 POSSÍVEIS LEIS APLICÁVEIS:
${allLaws.map(law => `• ${law}`).join('\n')}

🔗 EVIDÊNCIAS:
${evidenciasFormatadas}

---
Relatório gerado por RAVDW v${getVersion()}
${new Date().toISOString()}

${nextSteps}

${technicalInfo}`;
    }
}

function getNextSteps(lang) {
    const nextSteps = i18n.t('report.next_steps', lang);
    
    let stepsText = nextSteps.title + '\n';
    stepsText += nextSteps.steps.map(step => `  ${step}`).join('\n');
    
    return stepsText;
}

function generateTechnicalInfo(result, lang) {
    const msg = i18n.t('whois.technical_info', lang);
    
    let technicalText = `${msg.whois_title} ${result.query}\n\n`;

    const domainInfo = [
        `${msg.domain}: ${result.query}`,
        `${msg.registered_on}: ${formatDateWithTimezone(result.rdapSummary?.created, lang) || i18n.t('common.unknown', lang)}`,
        `${msg.expires_on}: ${formatDateWithTimezone(result.rdapSummary?.expires, lang) || i18n.t('common.unknown', lang)}`,
        `${msg.updated_on}: ${formatDateWithTimezone(result.rdapSummary?.updated, lang) || i18n.t('common.unknown', lang)}`
    ];

    technicalText += createBox(domainInfo.join('\n'), msg.domain_info) + '\n\n';

    const registrarInfo = [
        `${msg.registrar}: ${result.rdapSummary?.registrar || i18n.t('common.unknown', lang)}`
    ];

    if (result.rdapSummary?.registrarDetails) {
        const details = result.rdapSummary.registrarDetails;
        if (details.abuseEmail) {
            registrarInfo.push(`${msg.abuse_email}: ${details.abuseEmail}`);
        }
        if (details.website) {
            registrarInfo.push(`${msg.form}: ${details.website}`);
        }
        if (details.ianaId) {
            registrarInfo.push(`IANA ID: ${details.ianaId}`);
        }
    }

    technicalText += createBox(registrarInfo.join('\n'), msg.registrar_info) + '\n\n';

    const hostingProvider = result.siteAnalysis?.hostingProvider?.name || i18n.t('common.unknown', lang);
    const hostingType = result.siteAnalysis?.isFreeHosting ? i18n.t('common.free', lang) : i18n.t('common.paid', lang);
    
    const hostingInfo = [
        `${msg.hosting}: ${hostingProvider}`,
        `${msg.type}: ${hostingType}`
    ];

    if (hostingProvider.toLowerCase() !== i18n.t('common.unknown', lang).toLowerCase() && 
        hostingProvider.toLowerCase() !== 'unknown' &&
        hostingProvider !== 'N/D') {
        technicalText += createBox(hostingInfo.join('\n'), msg.hosting_info) + '\n\n';
    }

    const nameServers = result.rdapSummary?.nameServers || [];
    if (nameServers.length > 0) {
        const nsText = nameServers.map(ns => `• ${ns}`).join('\n');
        technicalText += createBox(nsText, msg.name_servers) + '\n\n';
    }

    const statuses = result.rdapSummary?.statuses || [];
    if (statuses.length > 0) {
        const statusText = statuses.map(status => `• ${status}`).join('\n');
        technicalText += createBox(statusText, msg.status) + '\n\n';
    }

    const contacts = result.suggestedContacts || [];
    if (contacts.length > 0) {
        const contactText = contacts.map(contact => 
            `• ${contact.provider}: ${contact.contact} (${contact.type})`
        ).join('\n');
        technicalText += createBox(contactText, msg.contacts) + '\n\n';
    }

    const reliability = result.whoisReliability || {};
    if (reliability.score !== undefined) {
        const reliabilityInfo = [
            `${msg.score}: ${reliability.score}/100`,
            `${msg.level}: ${reliability.level}`,
            `${msg.sources}: ${reliability.sourcesUsed?.join(', ') || 'N/A'}`
        ];
        technicalText += createBox(reliabilityInfo.join('\n'), msg.reliability) + '\n\n';
    }

    const relatedDomains = result.relatedDomains || [];
    if (relatedDomains.length > 0) {
        const relatedText = relatedDomains.map(domain => `• ${domain}`).join('\n');
        technicalText += createBox(relatedText, 'Domínios Relacionados') + '\n\n';
    }

    return technicalText;
}

function createBox(content, title = '') {
    const lines = content.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length), title.length);
    
    const topBorder = '┌' + '─'.repeat(maxLength + 2) + '┐';
    const bottomBorder = '└' + '─'.repeat(maxLength + 2) + '┘';
    
    let box = topBorder + '\n';
    
    if (title) {
        const titleLine = `│ ${title.padEnd(maxLength)} │`;
        box += titleLine + '\n';
        box += '├' + '─'.repeat(maxLength + 2) + '┤\n';
    }
    
    for (const line of lines) {
        box += `│ ${line.padEnd(maxLength)} │\n`;
    }
    
    box += bottomBorder;
    return box;
}

function getViolationDescription(violation, lang) {
    const violationTypes = i18n.t('report.violation_types', lang);
    const violationData = violationTypes[violation] || violationTypes.other;
    
    return `• ${violationData.name} - ${violationData.description}`;
}

function getCombinedLaws(violations, lang) {
    const VIOLATION_LAWS = {
        phishing: {
            laws: {
                pt: [
                    'Art. 154-A do CP — Invasão de Dispositivo Informático',
                    'Art. 171, §2º-A do CP — Fraude Eletrônica',
                    'Lei 12.965/2014 — Marco Civil da Internet'
                ],
                en: [
                    'U.S. Computer Fraud and Abuse Act (CFAA)',
                    'EU Directive 2013/40/EU — Cyber Attacks',
                    'GDPR Article 5(1)(f) — Data Integrity'
                ]
            }
        },
        piracy: {
            laws: {
                pt: [
                    'Lei 9.610/1998 — Direitos Autorais',
                    'Art. 184 do CP — Violação de Direito Autoral'
                ],
                en: [
                    'Digital Millennium Copyright Act (DMCA)',
                    'WIPO Copyright Treaty'
                ]
            }
        },
        lgpd: {
            laws: {
                pt: ['Lei 13.709/2018 — Lei Geral de Proteção de Dados (LGPD)'],
                en: ['General Data Protection Regulation (EU) 2016/679 — GDPR']
            }
        },
        childporn: {
            laws: {
                pt: ['Art. 241 do ECA — Divulgação de Conteúdo Explícito Infantil'],
                en: [
                    '18 U.S.C. §2252 — Child Exploitation Laws (USA)',
                    'Directive 2011/93/EU — Child Sexual Abuse'
                ]
            }
        },
        hate: {
            laws: {
                pt: [
                    'Lei 7.716/1989 — Crimes de Racismo',
                    'Art. 20 da Lei 7.716/1989'
                ],
                en: ['International Covenant on Civil and Political Rights — Article 20']
            }
        },
        scam: {
            laws: {
                pt: [
                    'Art. 171 do CP — Estelionato',
                    'Art. 4º da Lei 8.137/1990 — Crimes Contra a Economia Popular'
                ],
                en: [
                    '18 U.S.C. §1343 — Wire Fraud',
                    'Fraud Act 2006 (UK)'
                ]
            }
        },
        copyright: {
            laws: {
                pt: [
                    'Lei 9.610/1998 — Direito Autoral',
                    'Art. 184 do CP'
                ],
                en: [
                    'Digital Millennium Copyright Act (DMCA)',
                    'Copyright, Designs and Patents Act 1988 (UK)'
                ]
            }
        },
        malware: {
            laws: {
                pt: [
                    'Art. 154-A do CP — Invasão de Sistema',
                    'Lei 12.965/14 — Marco Civil da Internet'
                ],
                en: [
                    'CFAA (USA)',
                    'Budapest Convention on Cybercrime'
                ]
            }
        },
        spam: {
            laws: {
                pt: ['Lei 12.965/2014 — Marco Civil da Internet'],
                en: ['CAN-SPAM Act (USA)', 'GDPR Article 13']
            }
        },
        other: {
            laws: {
                pt: ['Lei aplicável conforme legislação local'],
                en: ['Applicable law per local legislation']
            }
        }
    };

    const allLaws = violations.flatMap(violation => {
        const violationLaws = VIOLATION_LAWS[violation]?.laws;
        if (!violationLaws) return [];

        return violationLaws[lang] || violationLaws.en || [];
    });

    return [...new Set(allLaws)];
}

module.exports = {
    lookupDomain,
    generateReport,
    getVersion,
    WhoisEngine,
    SiteMapper
};
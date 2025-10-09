const chalk = require('chalk');
const { default: boxen } = require('boxen');
const { lookupDomain } = require('../index');
const { validateAndCleanDomain, filterRelevantContacts, formatDateWithTimezone } = require('../core/utils');
const i18n = require('../core/i18n');

function displayWhoisResults(result, lang) {
    const msg = {
        domainInfo: i18n.t('lookup.domain_info', lang),
        domain: i18n.t('lookup.domain', lang),
        registeredOn: i18n.t('lookup.registered_on', lang),
        expiresOn: i18n.t('lookup.expires_on', lang),
        updatedOn: i18n.t('lookup.updated_on', lang),
        registrarInfo: i18n.t('lookup.registrar_info', lang),
        registrar: i18n.t('lookup.registrar', lang),
        abuseEmail: i18n.t('lookup.abuse_email', lang),
        form: i18n.t('lookup.form', lang),
        hostingInfo: i18n.t('lookup.hosting_info', lang),
        hosting: i18n.t('lookup.hosting', lang),
        type: i18n.t('lookup.type', lang),
        suggestedContacts: i18n.t('lookup.suggested_contacts', lang),
        completed: i18n.t('lookup.completed', lang),
        freeHosting: i18n.t('common.free', lang),
        paidHosting: i18n.t('common.paid', lang),
        unknown: i18n.t('common.unknown', lang)
    };
    
    const domainInfo = [
        chalk.white.bold(`${msg.domain}: `) + chalk.cyan(result.query),
        chalk.white.bold(`${msg.registeredOn}: `) + chalk.green(formatDateWithTimezone(result.rdapSummary?.created, lang)),
        chalk.white.bold(`${msg.expiresOn}: `) + chalk.red(formatDateWithTimezone(result.rdapSummary?.expires, lang)),
        chalk.white.bold(`${msg.updatedOn}: `) + chalk.yellow(formatDateWithTimezone(result.rdapSummary?.updated, lang))
    ];
    
    const registrarInfo = [
        chalk.white.bold(`${msg.registrar}: `) + chalk.magenta(result.rdapSummary?.registrar || msg.unknown)
    ];
    
    if (result.rdapSummary?.registrarDetails) {
        const details = result.rdapSummary.registrarDetails;
        if (details.abuseEmail) {
            registrarInfo.push(chalk.white.bold(`${msg.abuseEmail}: `) + chalk.red(details.abuseEmail));
        }
        if (details.website) {
            registrarInfo.push(chalk.white.bold(`${msg.form}: `) + chalk.blue(details.website));
        }
    }
    
    const hostingProvider = result.siteAnalysis?.hostingProvider?.name || msg.unknown;
    const hostingType = result.siteAnalysis?.isFreeHosting ? msg.freeHosting : msg.paidHosting;
    
    const hostingInfo = [
        chalk.white.bold(`${msg.hosting}: `) + chalk.cyan(hostingProvider),
        chalk.white.bold(`${msg.type}: `) + chalk.yellow(hostingType)
    ];
    
    console.log(
        boxen(
            chalk.bold(msg.domainInfo) + '\n' + domainInfo.join('\n'),
            { 
                padding: 1, 
                borderColor: 'blue', 
                borderStyle: 'classic',
                margin: 1
            }
        )
    );
    
    console.log(
        boxen(
            chalk.bold(msg.registrarInfo) + '\n' + registrarInfo.join('\n'),
            { 
                padding: 1, 
                borderColor: 'green', 
                borderStyle: 'classic',
                margin: 1
            }
        )
    );
    
    if (hostingProvider.toLowerCase() !== msg.unknown.toLowerCase() && 
        hostingProvider.toLowerCase() !== 'unknown' &&
        hostingProvider !== 'N/D') {
        console.log(
            boxen(
                chalk.bold(msg.hostingInfo) + '\n' + hostingInfo.join('\n'),
                { 
                    padding: 1, 
                    borderColor: 'magenta', 
                    borderStyle: 'classic',
                    margin: 1
                }
            )
        );
    }
    
    const relevantContacts = filterRelevantContacts(result.suggestedContacts, result);
    
    if (relevantContacts.length > 0) {
        console.log(chalk.bold(`\n${msg.suggestedContacts}`));
        
        for (const contact of relevantContacts) {
            const contactInfo = [
                chalk.cyan.bold(contact.provider.toUpperCase()),
                chalk.white('Tipo: ') + chalk.yellow(contact.type),
                chalk.white('Contato: ') + chalk.green(contact.contact || '—')
            ];
            
            if (contact.message) contactInfo.push(chalk.gray(contact.message));
            
            const contactBox = boxen(
                contactInfo.join('\n'),
                { 
                    padding: 1, 
                    borderColor: 'yellow', 
                    borderStyle: 'round',
                    margin: 1
                }
            );
            console.log(contactBox);
        }
    } else {
        displayNoContactsMessage(lang);
    }
    
    console.log(`\n${chalk.green(msg.completed)}`);
}

function displayNoContactsMessage(lang) {
    const noContactsMsg = i18n.t('lookup.no_contacts_links', lang);
    
    console.log(chalk.yellow(noContactsMsg.warning));
    
    for (let i = 0; i < noContactsMsg.links.length; i++) {
        console.log(
            chalk.yellow(noContactsMsg.links[i]) + 
            chalk.cyanBright(noContactsMsg.urls[i])
        );
    }
    
    console.log(chalk.yellow(noContactsMsg.final));
}

async function quickLookupMode(domain, lang, options = {}) {
    try {
        const cleanDomain = validateAndCleanDomain(domain);
        if (typeof cleanDomain !== 'string') {
            console.log(chalk.red(i18n.t('common.invalid_domain', lang)), cleanDomain);
            process.exit(1);
        }

        console.log(chalk.gray(`\n${i18n.t('common.querying_whois', lang)} ${cleanDomain}...`));
        
        const result = await lookupDomain(cleanDomain, { 
            lang: lang,
            timeout: options.timeout || 30000
        });

        displayWhoisResults(result, lang);
        
    } catch (error) {
        const { handleError } = require('../core/utils');
        handleError(error, lang);
    }
}

module.exports = {
    quickLookupMode,
    displayWhoisResults
};
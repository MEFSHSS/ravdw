const axios = require('axios');
const net = require('net');

class WhoisEngine {
    constructor() {
        this.sources = {
            rdap: 'https://rdap.org/domain/',
            hackertarget: 'https://api.hackertarget.com/whois/',
            whoiscom: 'whoiscom'
        };

        this.tldWhoisServers = {
            '.com': 'whois.verisign-grs.com',
            '.net': 'whois.verisign-grs.com',
            '.org': 'whois.pir.org',
            '.br': 'whois.registro.br',
            '.io': 'whois.nic.io',
            '.dev': 'whois.nic.google',
            '.app': 'whois.nic.google',
            '.xyz': 'whois.nic.xyz',
            '.online': 'whois.nic.online',
            '.site': 'whois.nic.site',
            '.store': 'whois.nic.store',
            '.tech': 'whois.nic.tech',
            '.me': 'whois.nic.me',
            '.co': 'whois.nic.co',
            '.us': 'whois.nic.us',
            '.uk': 'whois.nic.uk',
            '.ca': 'whois.cira.ca',
            '.de': 'whois.denic.de',
            '.fr': 'whois.nic.fr',
            '.jp': 'whois.jprs.jp',
            '.au': 'whois.auda.org.au',
            '.ru': 'whois.tcinet.ru',
            '.ch': 'whois.nic.ch',
            '.it': 'whois.nic.it',
            '.nl': 'whois.domain-registry.nl',
            '.se': 'whois.iis.se',
            '.no': 'whois.norid.no',
            '.es': 'whois.nic.es',
            '.mx': 'whois.mx',
            '.in': 'whois.registry.in',
            '.cn': 'whois.cnnic.cn',
            '.za': 'whois.registry.net.za',
            '.nz': 'whois.srs.net.nz',
            '.pt': 'whois.dns.pt'
        };

        this.registrarContacts = {
            'markmonitor': {
                name: 'MarkMonitor Inc.',
                abuseEmail: 'abusecomplaints@markmonitor.com',
                website: 'https://www.markmonitor.com/contact-us/',
                ianaId: '292'
            },
            'tucows': {
                name: 'Tucows Domains Inc.',
                abuseEmail: 'domainabuse@tucows.com',
                website: 'https://tucowsdomains.com/abuse-form/phishing/'
            },
            'godaddy': {
                name: 'GoDaddy.com, LLC',
                abuseEmail: 'abuse@godaddy.com',
                website: 'https://www.godaddy.com/help/reporting-abuse-27154'
            },
            'namecheap': {
                name: 'NameCheap, Inc.',
                abuseEmail: 'abuse@namecheap.com',
                website: 'https://www.namecheap.com/legal/general/report-abuse/'
            },
            'cloudflare': {
                name: 'Cloudflare, Inc.',
                abuseEmail: 'registrar-abuse@cloudflare.com',
                website: 'https://abuse.cloudflare.com/'
            },
            'google': {
                name: 'Google LLC',
                abuseEmail: 'registrar-abuse@google.com',
                website: 'https://domains.google.com/registrar/'
            },
            'enom': {
                name: 'eNom, LLC',
                abuseEmail: 'abuse@enom.com'
            },
            'namebright': {
                name: 'NameBright.com, Inc.',
                abuseEmail: 'support@namebright.com'
            },
            'webnic': {
                name: 'Webnic.cc',
                abuseEmail: 'compliance_abuse@webnic.cc'
            },
            'public domain registry': {
                name: 'Public Domain Registry',
                abuseEmail: 'abuse@publicdomainregistry.com',
                website: 'https://publicdomainregistry.com/phishing/'
            },
            'epik': {
                name: 'Epik Inc.',
                abuseEmail: 'abuse@epik.com'
            },
            'hostinger': {
                name: 'Hostinger International Limited',
                abuseEmail: 'abuse@hostinger.com',
                website: 'https://www.hostinger.com/report-abuse'
            },
            'hostgator': {
                name: 'HostGator.com, LLC',
                abuseEmail: 'abuse@hostgator.com'
            },
            'bluehost': {
                name: 'Bluehost Inc.',
                abuseEmail: 'abuse@bluehost.com'
            },
            'dreamhost': {
                name: 'DreamHost Web Hosting',
                abuseEmail: 'abuse@dreamhost.com'
            }
        };

        this.timeout = 15000;
        
        try {
            const WhoisComParser = require('./whoisComParser');
            this.whoisComParser = new WhoisComParser();
        } catch (error) {
            this.whoisComParser = null;
        }
    }

    async query(domain, options = {}) {
        const cleanDomain = this.cleanDomain(domain);
        const results = {
            domain: cleanDomain,
            sources: {},
            consolidated: {
                registrar: null,
                registrarDetails: null,
                created: null,
                updated: null,
                expires: null,
                nameServers: [],
                status: [],
                contacts: {},
                relatedDomains: []
            },
            errors: []
        };

        try {
            const queryPromises = [
                this.queryRdap(cleanDomain),
                this.queryRawWhoisEnhanced(cleanDomain),
                this.queryHackerTarget(cleanDomain)
            ];

            if (this.whoisComParser) {
                queryPromises.push(this.queryWhoisCom(cleanDomain));
            }

            const settledResults = await Promise.allSettled(queryPromises);

            const [rdapResult, whoisResult, hackerResult, whoisComResult] = settledResults;

            if (rdapResult.status === 'fulfilled') {
                results.sources.rdap = rdapResult.value;
            } else {
                results.errors.push(`RDAP: ${rdapResult.reason?.message || 'Unknown error'}`);
            }

            if (whoisResult.status === 'fulfilled') {
                results.sources.whois = whoisResult.value;
            } else {
                results.errors.push(`WHOIS: ${whoisResult.reason?.message || 'Unknown error'}`);
            }

            if (hackerResult.status === 'fulfilled') {
                results.sources.hackertarget = hackerResult.value;
            } else {
                results.errors.push(`HackerTarget: ${hackerResult.reason?.message || 'Unknown error'}`);
            }

            if (whoisComResult) {
                if (whoisComResult.status === 'fulfilled') {
                    results.sources.whoiscom = whoisComResult.value;
                } else {
                    results.errors.push(`WHOIS.com: ${whoisComResult.reason?.message || 'Unknown error'}`);
                }
            }

            results.consolidated = this.consolidateResults(
                results.sources.rdap,
                results.sources.whois, 
                results.sources.hackertarget,
                results.sources.whoiscom
            );

            this.enrichWithRegistrarContacts(results.consolidated);
            results.reliability = this.assessReliability(results);

        } catch (error) {
            results.errors.push(`Erro na consulta multi-fonte: ${error.message}`);
        }

        return results;
    }

    async queryRdap(domain) {
        try {
            const response = await axios.get(`${this.sources.rdap}${domain}`, {
                timeout: this.timeout,
                headers: {
                    'Accept': 'application/rdap+json',
                    'User-Agent': 'ravdw/1.0.0'
                }
            });

            return this.parseRdapResponse(response.data, domain);
        } catch (error) {
            throw new Error(`RDAP: ${error.response?.status || error.code || error.message}`);
        }
    }

    async queryRawWhoisEnhanced(domain) {
        try {
            const tld = this.extractTld(domain);
            const whoisServer = this.tldWhoisServers[tld] || 'whois.verisign-grs.com';
            
            return await this.queryRawWhois(domain, whoisServer);
        } catch (error) {
            throw new Error(`WHOIS: ${error.message}`);
        }
    }

    queryRawWhois(domain, server) {
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            let data = '';
            let timeoutId;

            client.setTimeout(this.timeout);
            
            client.connect(43, server, () => {
                client.write(domain + '\r\n');
            });

            client.on('data', (chunk) => {
                data += chunk.toString();
            });

            client.on('close', () => {
                if (timeoutId) clearTimeout(timeoutId);
                resolve(this.parseWhoisResponse(data, domain, server));
            });

            client.on('timeout', () => {
                client.destroy();
                reject(new Error('Timeout'));
            });

            client.on('error', (error) => {
                if (timeoutId) clearTimeout(timeoutId);
                reject(error);
            });

            timeoutId = setTimeout(() => {
                client.destroy();
                reject(new Error('Connection timeout'));
            }, this.timeout + 2000);
        });
    }

    async queryHackerTarget(domain) {
        try {
            const response = await axios.get(`${this.sources.hackertarget}?q=${domain}`, {
                timeout: this.timeout
            });

            return this.parseWhoisResponse(response.data, domain, 'hackertarget');
        } catch (error) {
            throw new Error(`HackerTarget: ${error.message}`);
        }
    }

    async queryWhoisCom(domain) {
        if (!this.whoisComParser) {
            throw new Error('Parser WHOIS.com não disponível');
        }

        try {
            const result = await this.whoisComParser.query(domain);
            return this.parseWhoisComResponse(result);
        } catch (error) {
            throw new Error(`WHOIS.com: ${error.message}`);
        }
    }

    parseWhoisResponse(data, domain, source) {
        const lines = data.split('\n');
        const result = {
            domain: domain,
            source: source,
            registrar: null,
            registrarDetails: null,
            created: null,
            updated: null,
            expires: null,
            nameServers: [],
            status: [],
            contacts: {
                abuse: {}
            },
            raw: data
        };

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            const lowerLine = cleanLine.toLowerCase();

            if (lowerLine.includes('registrar:')) {
                result.registrar = this.extractValue(line, 'Registrar:');
            }
            if (lowerLine.includes('registrar name:')) {
                result.registrar = this.extractValue(line, 'Registrar Name:');
            }
            if (lowerLine.includes('registrar:')) {
                result.registrar = this.extractValue(line, 'Registrar:');
            }
            if (lowerLine.includes('registrar iana id:') || lowerLine.includes('registrar iana id:')) {
                result.registrarDetails = {
                    ...result.registrarDetails,
                    ianaId: this.extractValue(line, 'Registrar IANA ID:') || this.extractValue(line, 'Registrar IANA ID:')
                };
            }

            if (lowerLine.includes('creation date:') || lowerLine.includes('created:')) {
                result.created = this.extractDate(line);
            }
            if (lowerLine.includes('updated date:') || lowerLine.includes('last updated:')) {
                result.updated = this.extractDate(line);
            }
            if (lowerLine.includes('expiry date:') || lowerLine.includes('expires:')) {
                result.expires = this.extractDate(line);
            }
            if (lowerLine.includes('registry expiry date:')) {
                result.expires = this.extractDate(line);
            }

            if ((lowerLine.includes('name server:') || lowerLine.includes('nserver:')) && 
                !lowerLine.includes('http')) {
                const ns = this.extractValue(line, /name server:|nserver:/i);
                if (ns && !result.nameServers.includes(ns.toUpperCase())) {
                    result.nameServers.push(ns.toUpperCase());
                }
            }

            if (lowerLine.includes('abuse contact email:') || lowerLine.includes('abuse email:')) {
                result.contacts.abuse.email = this.extractValue(line, /abuse contact email:|abuse email:/i);
            }
            if (lowerLine.includes('abuse contact phone:') || lowerLine.includes('abuse phone:')) {
                result.contacts.abuse.phone = this.extractValue(line, /abuse contact phone:|abuse phone:/i);
            }

            if (lowerLine.includes('domain status:')) {
                const status = this.extractValue(line, 'Domain Status:');
                if (status && !result.status.includes(status)) {
                    result.status.push(status);
                }
            }
        }

        return result;
    }

    parseRdapResponse(data, domain) {
        try {
            const entities = data.entities || [];
            const registrar = entities.find(e => 
                e.roles && e.roles.includes('registrar')
            );

            return {
                domain: domain,
                registrar: registrar ? this.extractEntityName(registrar) : null,
                registrarDetails: registrar ? {
                    name: this.extractEntityName(registrar),
                    ianaId: registrar.port43
                } : null,
                created: this.findEventDate(data.events, 'registration'),
                updated: this.findEventDate(data.events, 'last changed'),
                expires: this.findEventDate(data.events, 'expiration'),
                status: data.status || [],
                nameServers: data.nameservers ? data.nameservers.map(ns => ns.ldhName) : [],
                raw: data
            };
        } catch (error) {
            throw new Error(`Parse RDAP: ${error.message}`);
        }
    }

    parseWhoisComResponse(data) {
        try {
            const formatted = data.formatted || this.whoisComParser.formatForDisplay(data);
            
            return {
                domain: data.domain,
                registrar: formatted.registrar || null,
                registrarDetails: formatted.registrarDetails || null,
                created: formatted.created || null,
                updated: formatted.updated || null,
                expires: formatted.expires || null,
                nameServers: formatted.nameServers || [],
                status: formatted.status || [],
                contacts: formatted.contacts || {},
                relatedDomains: data.relatedDomains || [],
                source: 'whoiscom',
                raw: 'WHOIS.com data available'
            };
        } catch (error) {
            throw new Error(`Falha ao parsear resposta WHOIS.com: ${error.message}`);
        }
    }

    consolidateResults(rdap, whois, hackertarget, whoiscom) {
        const consolidated = {
            registrar: null,
            registrarDetails: null,
            created: null,
            updated: null,
            expires: null,
            nameServers: [],
            status: [],
            contacts: {},
            relatedDomains: []
        };

        const validSources = [rdap, whois, hackertarget, whoiscom].filter(s => s && typeof s === 'object');

        const allRegistrars = [];
        validSources.forEach(source => {
            if (source.registrar) allRegistrars.push(source.registrar);
        });
        consolidated.registrar = this.mostCommonValue(allRegistrars) || 'N/D';

        const allCreated = validSources.map(s => s.created).filter(Boolean);
        const allUpdated = validSources.map(s => s.updated).filter(Boolean);
        const allExpires = validSources.map(s => s.expires).filter(Boolean);
        
        consolidated.created = this.bestDateValue(allCreated);
        consolidated.updated = this.bestDateValue(allUpdated);
        consolidated.expires = this.bestDateValue(allExpires);

        const allNameServers = validSources.flatMap(s => s.nameServers || []);
        consolidated.nameServers = [...new Set(allNameServers)];

        const allStatus = validSources.flatMap(s => s.status || []);
        consolidated.status = [...new Set(allStatus)];

        const allContacts = validSources.flatMap(s => s.contacts ? [s.contacts] : []);
        consolidated.contacts = this.mergeContacts(allContacts);

        if (whoiscom?.relatedDomains) {
            consolidated.relatedDomains = whoiscom.relatedDomains;
        }

        const registrarDetails = validSources
            .map(s => s.registrarDetails)
            .filter(Boolean)
            .find(details => details.name || details.ianaId || details.abuseEmail);

        if (registrarDetails) {
            consolidated.registrarDetails = registrarDetails;
        }

        return consolidated;
    }

    mergeContacts(contactsList) {
        const merged = {
            abuse: {},
            registrant: {},
            technical: {}
        };

        for (const contacts of contactsList) {
            if (contacts.abuse && typeof contacts.abuse === 'object') {
                merged.abuse = { ...merged.abuse, ...contacts.abuse };
            }
            if (contacts.registrant && typeof contacts.registrant === 'object') {
                merged.registrant = { ...merged.registrant, ...contacts.registrant };
            }
            if (contacts.technical && typeof contacts.technical === 'object') {
                merged.technical = { ...merged.technical, ...contacts.technical };
            }
        }

        return merged;
    }

    enrichWithRegistrarContacts(consolidated) {
        if (!consolidated.registrar) return;

        const registrarName = consolidated.registrar.toLowerCase();
        
        for (const [key, details] of Object.entries(this.registrarContacts)) {
            if (registrarName.includes(key) || key.includes(registrarName)) {
                consolidated.registrarDetails = {
                    ...consolidated.registrarDetails,
                    ...details
                };

                if (!consolidated.contacts.abuse.email && details.abuseEmail) {
                    consolidated.contacts.abuse.email = details.abuseEmail;
                }
                break;
            }
        }
    }

    assessReliability(results) {
        const sources = Object.keys(results.sources).filter(key => 
            results.sources[key] && typeof results.sources[key] === 'object'
        );

        let score = sources.length * 25;
        
        if (results.consolidated.registrarDetails) score += 10;
        if (results.consolidated.contacts.abuse?.email) score += 15;
        if (results.consolidated.nameServers.length > 0) score += 10;
        if (results.consolidated.relatedDomains.length > 0) score += 5;

        const maxScore = 100;
        const finalScore = Math.min(score, maxScore);

        return {
            score: finalScore,
            level: finalScore >= 80 ? 'HIGH' : finalScore >= 60 ? 'MEDIUM' : 'LOW',
            sourcesUsed: sources,
            totalSources: Object.keys(this.sources).length,
            hasAbuseContact: !!results.consolidated.contacts.abuse?.email,
            hasRegistrarDetails: !!results.consolidated.registrarDetails,
            hasRelatedDomains: results.consolidated.relatedDomains.length > 0
        };
    }

    extractValue(line, pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern + '\\s*(.+)', 'i') : pattern;
        const match = line.match(regex);
        return match ? match[1]?.trim() : null;
    }

    cleanDomain(domain) {
        return domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0]
            .toLowerCase()
            .trim();
    }

    extractTld(domain) {
        const parts = domain.split('.');
        if (parts.length < 2) return '';
        
        const tld = '.' + parts[parts.length - 1];
        return tld;
    }

    extractEntityName(entity) {
        if (entity.vcardArray) {
            const vcard = entity.vcardArray[1];
            const fn = vcard.find(item => item[0] === 'fn');
            return fn ? fn[3] : null;
        }
        return entity.name || null;
    }

    findEventDate(events, action) {
        if (!events) return null;
        const event = events.find(e => e.eventAction === action);
        return event ? event.eventDate : null;
    }

    extractDate(line) {
        const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/) || 
                         line.match(/\d{2}-\d{2}-\d{4}/) ||
                         line.match(/\d{2}\/\d{2}\/\d{4}/) ||
                         line.match(/\d{4}\.\d{2}\.\d{2}/);
        return dateMatch ? dateMatch[0] : null;
    }

    mostCommonValue(arr) {
        if (arr.length === 0) return null;
        
        const frequency = {};
        let maxCount = 0;
        let mostCommon = arr[0];

        arr.forEach(value => {
            frequency[value] = (frequency[value] || 0) + 1;
            if (frequency[value] > maxCount) {
                maxCount = frequency[value];
                mostCommon = value;
            }
        });

        return mostCommon;
    }

    bestDateValue(dates) {
        if (dates.length === 0) return null;
        
        const common = this.mostCommonValue(dates);
        if (common) return common;

        return dates[0];
    }
}

module.exports = WhoisEngine;
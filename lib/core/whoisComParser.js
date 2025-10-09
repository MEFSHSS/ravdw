const axios = require('axios');
const cheerio = require('cheerio');

class WhoisComParser {
    constructor() {
        this.baseUrl = 'https://www.whois.com/whois/';
        this.timeout = 10000;
    }

    async query(domain) {
        try {
            const response = await axios.get(`${this.baseUrl}${domain}`, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }

            return this.parseHtml(response.data, domain);
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Timeout - Servidor não respondeu');
            } else if (error.response) {
                throw new Error(`HTTP ${error.response.status}`);
            } else if (error.request) {
                throw new Error('Sem resposta do servidor');
            } else {
                throw new Error(`Falha na conexão: ${error.message}`);
            }
        }
    }

    parseHtml(html, domain) {
        const $ = cheerio.load(html);
        const result = {
            domain: domain,
            domainInfo: {},
            registrarInfo: {},
            registrantContact: {},
            technicalContact: {},
            relatedDomains: [],
            raw: 'HTML parsed successfully'
        };

        try {
            $('.df-block').each((i, block) => {
                const $block = $(block);
                const heading = $block.find('.df-heading').text().trim();

                if (heading.includes('Domain Information')) {
                    result.domainInfo = this.parseBlock($block);
                } else if (heading.includes('Registrar Information')) {
                    result.registrarInfo = this.parseBlock($block);
                } else if (heading.includes('Registrant Contact')) {
                    result.registrantContact = this.parseBlock($block);
                } else if (heading.includes('Technical Contact')) {
                    result.technicalContact = this.parseBlock($block);
                }
            });

            $('.section-related ul li a').each((i, el) => {
                const relatedDomain = $(el).text().trim();
                if (relatedDomain && relatedDomain !== domain && relatedDomain.length > 0) {
                    result.relatedDomains.push(relatedDomain);
                }
            });

            result.formatted = this.formatForDisplay(result);

            return result;

        } catch (parseError) {
            throw new Error(`Erro ao parsear HTML: ${parseError.message}`);
        }
    }

    parseBlock($block) {
        const data = {};
        
        $block.find('.df-row').each((i, row) => {
            const $row = $(row);
            const label = $row.find('.df-label').text().replace(':', '').trim().toLowerCase();
            let value = $row.find('.df-value').html() || $row.find('.df-value').text();
            
            if (label && value) {
                value = value.replace(/<br\s*\/?>/gi, '\n');
                value = value.replace(/<[^>]*>/g, '');
                value = value.trim().replace(/\n\s+/g, '\n');
                data[label] = value;
            }
        });

        return data;
    }

    formatForDisplay(data) {
        const formatted = {
            domain: data.domain,
            created: this.parseDate(data.domainInfo['registered on']),
            expires: this.parseDate(data.domainInfo['expires on']),
            updated: this.parseDate(data.domainInfo['updated on']),
            registrar: data.registrarInfo.registrar || null,
            nameServers: data.domainInfo['name servers'] ? 
                data.domainInfo['name servers'].split('\n').map(ns => ns.trim()).filter(ns => ns.length > 0) : [],
            status: data.domainInfo.status ? 
                data.domainInfo.status.split('\n').map(s => s.trim()).filter(s => s.length > 0) : [],
            registrarDetails: {
                name: data.registrarInfo.registrar,
                ianaId: data.registrarInfo['iana id'],
                abuseEmail: data.registrarInfo['abuse email'],
                abusePhone: data.registrarInfo['abuse phone'],
                website: data.registrarInfo.email
            },
            contacts: {
                registrant: {
                    organization: data.registrantContact.organization,
                    country: data.registrantContact.country
                },
                technical: {
                    email: data.technicalContact.email
                }
            },
            relatedDomains: data.relatedDomains || []
        };

        if (data.registrarInfo['abuse email']) {
            formatted.contacts.abuse = {
                email: data.registrarInfo['abuse email'],
                phone: data.registrarInfo['abuse phone']
            };
        }

        return formatted;
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                const day = parseInt(match[3]);
                
                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                    const date = new Date(year, month, day);
                    return date.toISOString();
                }
            }
            
            return dateString;
        } catch {
            return dateString;
        }
    }

    debugResult(result) {
        return {
            domain: result.domain,
            registrar: result.formatted.registrar,
            created: result.formatted.created,
            expires: result.formatted.expires,
            nameServers: result.formatted.nameServers,
            status: result.formatted.status,
            relatedDomains: result.formatted.relatedDomains,
            hasAbuseContact: !!result.formatted.registrarDetails.abuseEmail
        };
    }
}

module.exports = WhoisComParser;
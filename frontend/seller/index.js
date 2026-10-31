// Universal WHATWG URL polyfill for React Native / Hermes
(function polyfillURL() {
    const OriginalURL = global.URL;
    if (!OriginalURL) return;

    function parseUrl(urlStr) {
        const match = String(urlStr).match(/^(?:([a-zA-Z0-9+-.]+):)?(?:\/\/(?:([^:@]*)(?::([^:@]*))?@)?([^:/?#]*)(?::(\d+))?)?(\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/);
        if (!match) return { protocol: 'http:', hostname: '', port: '', pathname: '/', search: '', hash: '' };
        return {
            protocol: match[1] ? match[1] + ':' : '',
            hostname: match[4] || '',
            port: match[5] || '',
            pathname: match[6] || '/',
            search: match[7] ? '?' + match[7] : '',
            hash: match[8] ? '#' + match[8] : '',
        };
    }

    try {
        const test = new OriginalURL('http://localhost');
        const _ = test.protocol;
        const __ = test.pathname;
    } catch (_) {
        const props = ['protocol', 'pathname', 'port', 'search', 'hash', 'origin', 'host', 'hostname'];
        props.forEach((prop) => {
            Object.defineProperty(OriginalURL.prototype, prop, {
                get() {
                    const parsed = parseUrl(this.href || this.toString());
                    if (prop === 'origin' || prop === 'host') {
                        const hostPart = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
                        return `${parsed.protocol}//${hostPart}`;
                    }
                    return parsed[prop] || '';
                },
                set(val) {
                    const parsed = parseUrl(this.href || this.toString());
                    if (prop === 'protocol') parsed.protocol = val.endsWith(':') ? val : val + ':';
                    if (prop === 'pathname') parsed.pathname = val.startsWith('/') ? val : '/' + val;
                    if (prop === 'port') parsed.port = val;
                    if (prop === 'search') parsed.search = val ? (val.startsWith('?') ? val : '?' + val) : '';
                    if (prop === 'hash') parsed.hash = val ? (val.startsWith('#') ? val : '#' + val) : '';
                    const hostPart = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
                    this.href = `${parsed.protocol}//${hostPart}${parsed.pathname}${parsed.search}${parsed.hash}`;
                },
                configurable: true,
            });
        });
    }
})();

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

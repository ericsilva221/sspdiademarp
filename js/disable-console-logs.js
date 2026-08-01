(function () {
    'use strict';

    // CONFIGURAÇÃO: Mude para false para esconder os logs
    const ENABLE_CONSOLE_LOGS = false;

    // Store original console methods if not already stored
    if (!window._originalConsole) {
        window._originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug,
            trace: console.trace,
            table: console.table,
            group: console.group,
            groupEnd: console.groupEnd,
            time: console.time,
            timeEnd: console.timeEnd,
            clear: console.clear,
            dir: console.dir
        };
    }

    if (ENABLE_CONSOLE_LOGS) {
        // Restaurar logs
        const c = window._originalConsole;
        console.log = c.log;
        console.error = c.error;
        console.warn = c.warn;
        console.info = c.info;
        console.debug = c.debug;
        console.trace = c.trace;
        console.table = c.table;
        console.group = c.group;
        console.groupEnd = c.groupEnd;
        console.time = c.time;
        console.timeEnd = c.timeEnd;
        console.clear = c.clear;
        console.dir = c.dir;

        console.log('✅ Logs do console estão ATIVADOS (via script disable-console-logs.js)');
    } else {
        // Desativar logs
        const noop = function () { };
        console.log = noop;
        console.error = noop;
        console.warn = noop;
        console.info = noop;
        console.debug = noop;
        console.trace = noop;
        console.table = noop;
        console.group = noop;
        console.groupEnd = noop;
        console.time = noop;
        console.timeEnd = noop;
        console.clear = noop;
        console.dir = noop;
    }

})();



(function initAllManagersV2() {

    if (typeof window.cacheCleaner !== 'undefined') {
        window.cacheCleaner.clearAllCache();
    }

    if (typeof dbAPI === 'undefined') {
        setTimeout(initAllManagersV2, 100);
        return;
    }

    if (dbAPI.useLocalStorage) {
        return;
    }

    const managers = [
        { name: 'newsManagerV2', init: () => window.newsManagerV2?.init() },
        { name: 'activitiesManagerV2', init: () => window.activitiesManagerV2?.init() },
        { name: 'concursosManagerV2', init: () => window.concursosManagerV2?.init() },
        { name: 'diarioManagerV2', init: () => window.diarioManagerV2?.init() },
        { name: 'bannerManagerV2', init: () => window.bannerManagerV2?.init() },
        { name: 'pmNumbersManagerV2', init: () => window.pmNumbersManagerV2?.init() },
        { name: 'documentosManagerV2', init: () => window.documentosManagerV2?.init() },
        { name: 'ticketsManagerV2', init: () => window.ticketsManagerV2?.init() }
    ];

    Promise.all(managers.map(m => {
        if (typeof window[m.name] !== 'undefined') {
            return m.init().catch(err => {
            });
        } else {
            return Promise.resolve();
        }
    })).then(() => {
    });
})();

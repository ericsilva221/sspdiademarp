

class CacheManager {
    constructor() {
        this.version = this.getVersion();
        this.managers = [
            'activitiesManagerV2',
            'newsManagerV2',
            'concursosManagerV2',
            'diarioManagerV2',
            'bannerManagerV2',
            'pmNumbersManagerV2'
        ];
    }

    getVersion() {
        
        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        return `v${dateStr}`;
    }

    async clearBrowserCache() {
        
        try {
            
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }
        } catch (error) {
        }

        try {
            const importantKeys = ['currentUser', 'authToken'];
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
                if (!importantKeys.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
        }

        try {
            sessionStorage.clear();
        } catch (error) {
        }

        this.clearManagersCache();

        this.reloadStaticResources();
    }

    clearManagersCache() {
        
        this.managers.forEach(managerName => {
            const manager = window[managerName];
            if (manager) {
                
                if (manager.cache !== undefined) {
                    manager.cache = null;
                }

                if (manager.initialized !== undefined) {
                    manager.initialized = false;
                }

                if (manager._cache) {
                    manager._cache = null;
                }

                if (manager.data) {
                    manager.data = null;
                }
                
            }
        });
        
    }

    async reloadAllManagers() {
        
        const reloadPromises = this.managers.map(async (managerName) => {
            const manager = window[managerName];
            if (manager && typeof manager.loadFromDatabase === 'function') {
                try {
                    
                    if (manager.initialized !== undefined) {
                        manager.initialized = false;
                    }

                    await manager.loadFromDatabase();
                } catch (error) {
                }
            }
        });
        
        await Promise.all(reloadPromises);
    }

    reloadStaticResources() {
        
        const timestamp = `?v=${Date.now()}`;

        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (link.href && !link.href.includes('cdnjs.cloudflare.com')) {
                const href = link.href.split('?')[0];
                link.href = href + timestamp;
            }
        });

        document.querySelectorAll('img[data-reload]').forEach(img => {
            if (img.src) {
                const src = img.src.split('?')[0];
                img.src = src + timestamp;
            }
        });
        
    }

    addCacheBusting(url) {
        if (!url) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${this.version}&t=${Date.now()}`;
    }

    async clearAndReload() {
        
        await this.clearBrowserCache();
        await this.reloadAllManagers();

        setTimeout(() => {
            window.location.reload(true); 
        }, 500);
    }

    async clearAndRefresh() {
        await this.clearBrowserCache();
        await this.reloadAllManagers();

        window.dispatchEvent(new CustomEvent('cacheCleared'));
    }

    autoClearOnReload() {
        
        const navEntry = performance.getEntriesByType('navigation')[0];
        const isReload = navEntry && navEntry.type === 'reload';

        if (isReload) {
            this.clearManagersCache();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.addCacheBustingToImages();
            });
        } else {
            this.addCacheBustingToImages();
        }
    }

    addCacheBustingToImages() {
        
        document.querySelectorAll('img[src*="/uploads/"], img[data-dynamic]').forEach(img => {
            if (img.src && !img.src.includes('?v=')) {
                img.src = this.addCacheBusting(img.src);
            }
        });
    }
}

window.cacheManager = new CacheManager();

window.cacheManager.autoClearOnReload();

let isManualReload = false;
window.addEventListener('beforeunload', () => {
    
    sessionStorage.setItem('_reloadFlag', 'true');
});

window.addEventListener('load', () => {
    
    const reloadFlag = sessionStorage.getItem('_reloadFlag');
    if (reloadFlag === 'true') {
        window.cacheManager.clearManagersCache();
        sessionStorage.removeItem('_reloadFlag');
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}



class PMNumbersManagerV2 {
    constructor() {
        this.cache = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        if (typeof dbAPI === 'undefined' || dbAPI.useLocalStorage) {
            this.cache = { period: '', numbers: [] };
            this.initialized = true;
            return;
        }

        try {
            await this.loadFromDatabase();
            this.initialized = true;
        } catch (error) {
            this.cache = { period: '', numbers: [] };
            this.initialized = true;
        }
    }

    async loadFromDatabase() {
        
        if (typeof dbAPI === 'undefined') {
            this.cache = { period: '', numbers: [] };
            return;
        }

        if (!dbAPI.configChecked && typeof dbAPI.checkConfiguration === 'function') {
            try {
                await dbAPI.checkConfiguration();
            } catch (error) {
                
            }
        }

        if (dbAPI.useLocalStorage) {
            
            if (!dbAPI._recheckAttempted) {
                dbAPI._recheckAttempted = true;
                try {
                    await dbAPI.checkConfiguration();
                } catch (error) {
                    
                }
            }

            if (dbAPI.useLocalStorage) {
                this.cache = { period: '', numbers: [] };
                return;
            }
        }

        try {
            const data = await dbAPI.getPMNumbers();
            this.cache = {
                period: data?.period || '',
                numbers: data?.numbers || []
            };
            return this.cache;
        } catch (error) {
            console.error('Erro ao carregar números PM do banco:', error);
            this.cache = { period: '', numbers: [] };
            throw error;
        }
    }

    getNumbers() {
        return this.cache?.numbers || [];
    }

    getPeriod() {
        return this.cache?.period || '';
    }

    async updateNumbers(numbers, period) {
        if (typeof dbAPI === 'undefined' || dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado.');
        }

        try {
            const result = await dbAPI.updatePMNumbers(period, numbers);
            
            if (result && result.success) {
                await this.loadFromDatabase();
                return { success: true };
            } else {
                throw new Error(result?.error || 'Erro ao atualizar números');
            }
        } catch (error) {
            throw error;
        }
    }
}

window.pmNumbersManagerV2 = new PMNumbersManagerV2();

(function initPMNumbersManagerV2() {
    if (typeof dbAPI !== 'undefined' && !dbAPI.useLocalStorage) {
        window.pmNumbersManagerV2.init();
    } else {
        setTimeout(initPMNumbersManagerV2, 100);
    }
})();

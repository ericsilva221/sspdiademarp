

class DatabaseAPI {
    constructor() {

        this.apiUrl = window.API_URL || '/api/php/mysql-api.php';
        this.useLocalStorage = false;
        this.configChecked = false;
        this.checkingConfig = false;

        this.checkConfiguration().catch(err => {
        });
    }

    async checkConfiguration() {

        if (this.checkingConfig) {

            while (this.checkingConfig) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        if (this.configChecked) {
            return;
        }

        this.checkingConfig = true;

        try {

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(this.apiUrl + '?table=news', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json().catch(() => null);

                if (data !== null && typeof data === 'object') {

                    if (data.success !== false && !data.error) {
                        this.useLocalStorage = false;
                        this.configChecked = true;
                        return;
                    } else if (data.error) {

                        if (data.error.includes('conectar') || data.error.includes('PDOException') || data.error.includes('banco de dados')) {
                            this.useLocalStorage = true;
                            this.configChecked = true;
                            return;
                        }
                    }
                }

                this.useLocalStorage = false;
                this.configChecked = true;
            } else {
                const errorText = await response.text().catch(() => 'Erro desconhecido');

                if (response.status === 500) {
                    if (errorText.includes('conectar') || errorText.includes('PDOException') || errorText.includes('banco de dados')) {
                        console.warn('⚠️ [DatabaseAPI] Erro de conexão com banco detected (500). Usando LocalStorage.');
                        this.useLocalStorage = true;
                        this.configChecked = true;
                        return;
                    }
                }

                // Se recebermos 401, 403, 400, etc., significa que a API EXISTE e está respondendo.
                // NÃO devemos usar LocalStorage neste caso.
                if (response.status !== 500) {
                    console.log(`✅ [DatabaseAPI] API detectada (Status: ${response.status}). MySQL configurado.`);
                    this.useLocalStorage = false;
                    this.configChecked = true;
                    return;
                }

                // Fallback padrão apenas para outros erros 500 não identificados ou se realmente quisermos
                console.warn(`⚠️ [DatabaseAPI] Erro desconhecido da API (${response.status}). Usando LocalStorage por precaução.`);
                this.useLocalStorage = true;
                this.configChecked = true;
            }
        } catch (error) {

            if (error.name === 'AbortError') {
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            } else {
            }
            this.useLocalStorage = true;
            this.configChecked = true;
        } finally {
            this.checkingConfig = false;
        }
    }

    async request(endpoint, options = {}) {

        if (!this.configChecked && this.checkConfiguration && typeof this.checkConfiguration === 'function') {
            try {
                await Promise.race([
                    this.checkConfiguration(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout na verificação de configuração')), 5000))
                ]);
            } catch (configError) {

                this.configChecked = true;
                this.useLocalStorage = false;
            }
        }

        if (this.useLocalStorage) {
            return this.localStorageRequest(endpoint, options);
        }

        const [table, queryString] = endpoint.split('?');
        const params = queryString ? new URLSearchParams(queryString) : new URLSearchParams();

        let id = options.id || params.get('id')?.replace('eq.', '') || null;

        if (!id && queryString && queryString.includes('id=')) {
            const idMatch = queryString.match(/id=([^&]*)/);
            if (idMatch && idMatch[1]) {
                id = idMatch[1].replace('eq.', '').trim();

                if (id === '') {
                    id = null;
                }
            }
        }

        if (id !== null && id !== undefined && table !== 'users') {
            const parsedId = parseInt(id);
            if (!isNaN(parsedId)) {
                id = parsedId;
            } else {

            }
        }

        const method = options.method || 'GET';

        let bodyData = null;
        if (options.body) {
            try {
                bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            } catch (e) {
                bodyData = null;
            }
        }

        // Autenticação via _currentUserId removida - Backend agora usa sessão PHP segura


        // Legacy auth blocks removed


        const body = {
            table: table,
            method: method,
            data: bodyData  // Permite bodyData mesmo para DELETE (para autenticação)
        };



        if (id !== null && id !== undefined && id !== '') {
            body.id = id;
        } else if (method !== 'GET') {

        }

        try {
            if (bodyData) {

                const safeBodyData = { ...bodyData };
                if (safeBodyData.password) {
                    safeBodyData.password = '[SENHA - REMOVIDA POR SEGURANÇA]';
                }

                if (Array.isArray(safeBodyData.data)) {
                    safeBodyData.data = safeBodyData.data.map(item => {
                        const safeItem = { ...item };
                        if (safeItem.password) {
                            safeItem.password = '[SENHA - REMOVIDA POR SEGURANÇA]';
                        }
                        return safeItem;
                    });
                }
            }

            let url = this.apiUrl;
            if (method === 'GET' && id) {
                url += `?table=${table}&id=${id}`;
            } else if (method === 'GET') {
                url += `?table=${table}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 15000);

            let response;
            try {
                response = await fetch(url, {
                    method: method === 'GET' ? 'GET' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',  // Alterado para include para permitir cookies cross-origin 
                    body: method !== 'GET' ? JSON.stringify(body) : undefined,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Timeout: A requisição demorou mais de 15 segundos e foi cancelada');
                }
                throw fetchError;
            }

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Erro desconhecido');

                // Security: If unauthorized/forbidden, clear local session prevents infinite loop
                if (response.status === 401 || response.status === 403) {
                    console.warn('[Security] Sessão inválida ou expirada. Limpando dados locais.');
                    localStorage.removeItem('currentUser');
                    sessionStorage.removeItem('currentUser');
                    // Opcional: Redirecionar para login ou apenas deixar o AuthSystem lidar com isso
                }

                if (response.status === 404) {
                }

                if (response.status === 500 || response.status === 0) {

                    this.configChecked = false;
                    await this.checkConfiguration();

                    if (this.useLocalStorage) {
                        return { success: false, error: 'MySQL não configurado. Configure o banco de dados primeiro.' };
                    }
                }

                let error;
                try {
                    error = JSON.parse(errorText);
                } catch {
                    error = { error: errorText || 'Erro na requisição' };
                }
                throw new Error(error.error || 'Erro na requisição');
            }

            const data = await response.json();

            const removeSensitiveData = (obj) => {
                if (obj === null || obj === undefined) {
                    return obj;
                }

                if (Array.isArray(obj)) {
                    return obj.map(item => removeSensitiveData(item));
                }

                if (typeof obj === 'object') {
                    const safeObj = {};
                    for (const key in obj) {
                        const keyLower = key ? key.toLowerCase() : '';

                        if (keyLower.includes('password') ||
                            keyLower.includes('email') ||
                            keyLower === 'id' ||
                            keyLower.includes('_id')) {
                            continue;
                        }
                        safeObj[key] = removeSensitiveData(obj[key]);
                    }
                    return safeObj;
                }

                return obj;
            };

            const safeData = removeSensitiveData(data);

            const dataString = JSON.stringify(safeData);
            const hasSensitiveData = dataString.includes('"password"') ||
                dataString.toLowerCase().includes('password') ||
                dataString.includes('"email"') ||
                dataString.toLowerCase().includes('email') ||
                dataString.includes('"id"') ||
                dataString.toLowerCase().includes('"id"');

            if (hasSensitiveData) {

                const finalSafeData = removeSensitiveData(JSON.parse(dataString));
            } else {
            }

            return data;
        } catch (error) {

            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {

                this.configChecked = false;
                try {
                    await this.checkConfiguration();
                } catch (configError) {
                }

                if (this.useLocalStorage) {
                    return { success: false, error: 'MySQL não configurado. Configure o banco de dados primeiro.' };
                }
            }

            return { success: false, error: error.message || 'Erro na requisição' };
        }
    }

    localStorageRequest(endpoint, options) {
        const [table, ...rest] = endpoint.split('?');
        const method = options.method || 'GET';

        try {
            if (method === 'GET') {
                const data = JSON.parse(localStorage.getItem(table) || '[]');
                return { success: true, data };
            } else if (method === 'POST') {
                const existing = JSON.parse(localStorage.getItem(table) || '[]');
                const newItem = { ...JSON.parse(options.body), id: existing.length + 1 };
                existing.push(newItem);
                localStorage.setItem(table, JSON.stringify(existing));
                return { success: true, data: [newItem] };
            } else if (method === 'PATCH') {
                const existing = JSON.parse(localStorage.getItem(table) || '[]');
                const updates = JSON.parse(options.body);
                const urlParams = new URLSearchParams(rest.join('?'));
                let id = urlParams.get('id') || urlParams.get('id=eq.');
                if (id && id.startsWith('eq.')) {
                    id = id.replace('eq.', '');
                }
                const index = existing.findIndex(item => item.id === parseInt(id));
                if (index !== -1) {
                    existing[index] = { ...existing[index], ...updates };
                    localStorage.setItem(table, JSON.stringify(existing));
                    return { success: true, data: [existing[index]] };
                }
                return { success: false, error: 'Item não encontrado' };
            } else if (method === 'DELETE') {
                const existing = JSON.parse(localStorage.getItem(table) || '[]');
                const urlParams = new URLSearchParams(rest.join('?'));
                let id = urlParams.get('id') || urlParams.get('id=eq.');
                if (id && id.startsWith('eq.')) {
                    id = id.replace('eq.', '');
                }
                const filtered = existing.filter(item => item.id !== parseInt(id));
                localStorage.setItem(table, JSON.stringify(filtered));
                return { success: true, data: [] };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getUsers() {
        try {
            const result = await this.request('users?select=*');
            if (result && result.success) {
                const users = result.data || [];
                return users;
            }
            return [];
        } catch (error) {

            return [];
        }
    }

    async getUserByUsername(username) {

        const users = await this.getUsers();
        return users.find(u => u.username === username) || null;
    }

    async createUser(userData) {
        return await this.request('users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(id, userData) {



        return await this.request(`users?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(id) {



        return await this.request(`users?id=eq.${id}`, {
            method: 'DELETE',
            body: Object.keys(deleteData).length > 0 ? JSON.stringify(deleteData) : undefined
        });
    }

    async getNews() {
        const result = await this.request('news?select=*&order=created_at.desc');
        if (result.success) {
            return result.data;
        }
        return [];
    }

    async getNewsById(id) {
        const result = await this.request(`news?id=eq.${id}&select=*`);
        if (result.success && result.data.length > 0) {
            return result.data[0];
        }
        return null;
    }

    async createNews(newsData) {
        const cleanData = { ...newsData };
        delete cleanData.id;



        try {
            const result = await this.request('news', {
                method: 'POST',
                body: JSON.stringify(cleanData)
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    async updateNews(id, newsData) {
        const cleanData = { ...newsData };
        Object.keys(cleanData).forEach(key => {
            if (cleanData[key] === undefined) {
                delete cleanData[key];
            }
        });



        return await this.request('news', {
            method: 'PATCH',
            id: id,
            body: JSON.stringify(cleanData)
        });
    }

    async deleteNews(id) {

        const newsId = parseInt(id);
        if (isNaN(newsId)) {
            return { success: false, error: 'ID inválido' };
        }

        const deleteData = {};

        return await this.request('news', {
            method: 'DELETE',
            id: newsId,
            body: Object.keys(deleteData).length > 0 ? JSON.stringify(deleteData) : undefined
        });
    }

    async getActivities(type = null) {
        let result;
        if (type) {

            result = await this.request('activities?select=*');
            if (result.success) {
                result.data = result.data.filter(a => a.type === type);
            }
        } else {
            result = await this.request('activities?select=*');
        }
        if (result.success) {
            return result.data;
        }
        return [];
    }

    async getActivityById(id) {
        const result = await this.request(`activities?id=eq.${id}&select=*`);
        if (result.success && result.data.length > 0) {
            return result.data[0];
        }
        return null;
    }

    async createActivity(activityData) {
        const cleanData = { ...activityData };
        delete cleanData.id;



        return await this.request('activities', {
            method: 'POST',
            body: JSON.stringify(cleanData)
        });
    }

    async updateActivity(id, activityData) {
        const cleanData = { ...activityData };



        return await this.request('activities', {
            method: 'PATCH',
            id: id,
            body: JSON.stringify(cleanData)
        });
    }

    async deleteActivity(id) {

        const activityId = parseInt(id);
        if (isNaN(activityId)) {
            return { success: false, error: 'ID inválido' };
        }

        const deleteData = {};

        return await this.request('activities', {
            method: 'DELETE',
            id: activityId,
            body: Object.keys(deleteData).length > 0 ? JSON.stringify(deleteData) : undefined
        });
    }

    async getConcursos() {
        const result = await this.request('concursos?select=*&order=created_at.desc');
        if (result.success) {
            return result.data;
        }
        return [];
    }

    async getConcursoById(id) {
        const result = await this.request(`concursos?id=eq.${id}&select=*`);
        if (result.success && result.data.length > 0) {
            return result.data[0];
        }
        return null;
    }

    async createConcurso(concursoData) {
        const cleanData = { ...concursoData };
        delete cleanData.id;

        return await this.request('concursos', {
            method: 'POST',
            body: JSON.stringify(cleanData)
        });
    }

    async updateConcurso(id, concursoData) {

        return await this.request('concursos', {
            method: 'PATCH',
            id: id,
            body: JSON.stringify(concursoData)
        });
    }

    async deleteConcurso(id) {

        return await this.request('concursos', {
            method: 'DELETE',
            id: id
        });
    }

    async getDiarioPosts() {

        const result = await this.request('diario_posts');
        if (result.success && result.data) {
            return result.data;
        }
        return [];
    }

    async getDiarioPostById(id) {
        const result = await this.request(`diario_posts?id=eq.${id}&select=*`);
        if (result.success && result.data.length > 0) {
            return result.data[0];
        }
        return null;
    }

    async createDiarioPost(postData) {
        const cleanData = { ...postData };
        delete cleanData.id;

        return await this.request('diario_posts', {
            method: 'POST',
            body: JSON.stringify(cleanData)
        });
    }

    async updateDiarioPost(id, postData) {

        return await this.request('diario_posts', {
            method: 'PATCH',
            id: id,
            body: JSON.stringify(postData)
        });
    }

    async deleteDiarioPost(id) {

        return await this.request('diario_posts', {
            method: 'DELETE',
            id: id
        });
    }

    async getDocumentos() {
        return await this.request('documentos?select=*');
    }

    async getDocumentoById(id) {
        const result = await this.request(`documentos?id=eq.${id}&select=*`);
        if (result.success && result.data.length > 0) {
            return result.data[0];
        }
        return null;
    }

    async createDocumento(documentoData) {
        const cleanData = { ...documentoData };
        delete cleanData.id;

        return await this.request('documentos', {
            method: 'POST',
            body: JSON.stringify(cleanData)
        });
    }

    async updateDocumento(id, documentoData) {
        return await this.request('documentos', {
            method: 'PATCH',
            id: id,
            body: JSON.stringify(documentoData)
        });
    }

    async deleteDocumento(id) {
        return await this.request('documentos', {
            method: 'DELETE',
            id: id
        });
    }

    async getPMNumbers() {
        try {
            const result = await this.request('pm_numbers?select=*');
            if (result.success && result.data.length > 0) {
                const numbersData = result.data[0];
                const itemsResult = await this.request('pm_number_items?select=*');
                if (itemsResult.success) {
                    const filteredItems = itemsResult.data.filter(item => item.pm_numbers_id == numbersData.id);
                    return {
                        period: numbersData.period || '',
                        numbers: filteredItems.map(item => ({
                            id: item.id,
                            value: item.value || '',
                            label: item.label || '',
                            description: item.description || ''
                        }))
                    };
                }
                return {
                    period: numbersData.period || '',
                    numbers: []
                };
            }
            return { period: '', numbers: [] };
        } catch (error) {
            return { period: '', numbers: [] };
        }
    }

    async updatePMNumbers(period, numbers) {
        try {
            const existing = await this.getPMNumbers();

            if (existing.period) {

                const numbersData = await this.request('pm_numbers?select=*');
                if (!numbersData.success || !numbersData.data || numbersData.data.length === 0) {
                    throw new Error('Não foi possível buscar dados existentes');
                }

                const id = numbersData.data[0].id;

                const updateResult = await this.request(`pm_numbers?id=eq.${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ period })
                });

                if (!updateResult.success) {
                    throw new Error(updateResult.error || 'Erro ao atualizar período');
                }

                const items = await this.request('pm_number_items?select=*');
                if (items.success && items.data) {
                    for (const item of items.data.filter(i => i.pm_numbers_id == id)) {
                        const deleteResult = await this.request('pm_number_items', {
                            method: 'DELETE',
                            id: item.id
                        });
                        if (!deleteResult.success) {
                            console.warn('Erro ao deletar item:', deleteResult.error);
                        }
                    }
                }

                for (const number of numbers) {
                    const insertResult = await this.request('pm_number_items', {
                        method: 'POST',
                        body: JSON.stringify({
                            pm_numbers_id: id,
                            value: number.value || '',
                            label: number.label || '',
                            description: number.description || ''
                        })
                    });

                    if (!insertResult.success) {
                        throw new Error(insertResult.error || 'Erro ao inserir número: ' + JSON.stringify(number));
                    }
                }
            } else {

                const createResult = await this.request('pm_numbers', {
                    method: 'POST',
                    body: JSON.stringify({ period })
                });

                if (!createResult.success || !createResult.data || createResult.data.length === 0) {
                    throw new Error(createResult.error || 'Erro ao criar registro de números PM');
                }

                const id = createResult.data[0].id;

                for (const number of numbers) {
                    const insertResult = await this.request('pm_number_items', {
                        method: 'POST',
                        body: JSON.stringify({
                            pm_numbers_id: id,
                            value: number.value || '',
                            label: number.label || '',
                            description: number.description || ''
                        })
                    });

                    if (!insertResult.success) {
                        throw new Error(insertResult.error || 'Erro ao inserir número: ' + JSON.stringify(number));
                    }
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Erro em updatePMNumbers:', error);
            return {
                success: false,
                error: error.message || 'Erro desconhecido ao atualizar números PM'
            };
        }
    }

    async getBannerConfig() {
        const result = await this.request('banner_config?select=*');
        if (result.success && result.data.length > 0) {
            return result.data[0];
        }
        return null;
    }

    async updateBannerConfig(bannerImage, texts) {
        const existing = await this.getBannerConfig();

        const configData = {
            banner_image: bannerImage || null,
            logo_text: texts.logoText || 'POLÍCIA MILITAR',
            rumo_text: texts.rumoText || 'RUMO AOS',
            number_text: texts.numberText || '200',
            anos_text: texts.anosText || 'ANOS',
            slogan_text: texts.sloganText || 'VAMOS TODOS JUNTOS. NINGUÉM FICA PARA TRÁS.'
        };

        if (existing && existing.id) {

            const existingId = parseInt(existing.id);
            if (!isNaN(existingId)) {
                return await this.request('banner_config', {
                    method: 'PATCH',
                    id: existingId,
                    body: JSON.stringify(configData)
                });
            }
        }

        return await this.request('banner_config', {
            method: 'POST',
            body: JSON.stringify(configData)
        });
    }

    async getSiteConfig() {
        try {
            const result = await this.request('site_config?select=*');
            if (result.success && result.data) {

                const config = {};
                result.data.forEach(item => {
                    config[item.config_key] = item.config_value;

                    if (item.config_key === 'primary_color') config.primary_color = item.config_value;
                    if (item.config_key === 'secondary_color') config.secondary_color = item.config_value;
                    if (item.config_key === 'accent_color') config.accent_color = item.config_value;
                    if (item.config_key === 'dark_gray') config.dark_gray = item.config_value;
                    if (item.config_key === 'darker_gray') config.darker_gray = item.config_value;
                    if (item.config_key === 'logo_pm_url') config.logo_pm_url = item.config_value;
                    if (item.config_key === 'logo_ssp_url') config.logo_ssp_url = item.config_value;
                    if (item.config_key === 'site_title') config.site_title = item.config_value;
                    if (item.config_key === 'site_subtitle') config.site_subtitle = item.config_value;

                    if (item.config_key === 'texto_governo') config.texto_governo = item.config_value;
                    if (item.config_key === 'texto_slogan') config.texto_slogan = item.config_value;
                    if (item.config_key === 'texto_titulo_principal') config.texto_titulo_principal = item.config_value;
                    if (item.config_key === 'texto_subtitulo') config.texto_subtitulo = item.config_value;
                });
                return config;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async updateSiteConfig(key, value, type = 'string', description = null) {
        try {

            const result = await this.request(`site_config?config_key=eq.${encodeURIComponent(key)}`);

            const configData = {
                config_key: key,
                config_value: value,
                config_type: type
            };

            if (description) {
                configData.description = description;
            }

            if (result.success && result.data && result.data.length > 0) {

                const existingId = result.data[0].id;
                return await this.request('site_config', {
                    method: 'PATCH',
                    id: existingId,
                    body: JSON.stringify(configData)
                });
            } else {

                return await this.request('site_config', {
                    method: 'POST',
                    body: JSON.stringify(configData)
                });
            }
        } catch (error) {
            throw error;
        }
    }

    async getEditableElements(pagePath = '/pages/index.html') {
        try {
            const result = await this.request(`editable_elements?page_path=eq.${encodeURIComponent(pagePath)}&select=*&order=display_order`);
            if (result.success && result.data) {
                return result.data;
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async saveEditableElement(selector, content, style, elementType = 'text', pagePath = '/pages/index.html') {
        try {

            const result = await this.request(`editable_elements?element_selector=eq.${encodeURIComponent(selector)}&page_path=eq.${encodeURIComponent(pagePath)}`);

            const elementData = {
                element_selector: selector,
                element_type: elementType,
                element_content: content,
                element_style: style,
                page_path: pagePath
            };

            if (result.success && result.data && result.data.length > 0) {

                const existingId = result.data[0].id;
                return await this.request('editable_elements', {
                    method: 'PATCH',
                    id: existingId,
                    body: JSON.stringify(elementData)
                });
            } else {

                return await this.request('editable_elements', {
                    method: 'POST',
                    body: JSON.stringify(elementData)
                });
            }
        } catch (error) {
            throw error;
        }
    }

    async getTickets() {
        const result = await this.request('tickets');
        if (result.success) {
            return result.data;
        }
        return [];
    }

    async getTicketById(id) {
        const result = await this.request(`tickets?id=${id}`);
        if (result.success && result.data.length > 0) {
            return result.data[0];
        }
        return null;
    }

    async getTicketsByUserId(userId) {

        const url = `${this.apiUrl}?table=tickets&user_id=${encodeURIComponent(userId)}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async getTicketsByUnidade(unidade) {

        const url = `${this.apiUrl}?table=tickets&unidade=${encodeURIComponent(unidade)}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async createTicket(ticketData) {
        const cleanData = { ...ticketData };
        delete cleanData.id;



        return await this.request('tickets', {
            method: 'POST',
            body: JSON.stringify(cleanData)
        });
    }

    async updateTicket(id, ticketData) {
        const dataWithAuth = { ...ticketData };

        console.log('[updateTicket] Dados a serem enviados:', { ...dataWithAuth, _currentUserId: dataWithAuth._currentUserId });

        return await this.request('tickets', {
            method: 'PATCH',
            id: id,
            body: JSON.stringify(dataWithAuth)
        });
    }

    async deleteTicket(id) {
        // Adiciona _currentUserId para autenticação
        const deleteData = {};

        return await this.request('tickets', {
            method: 'DELETE',
            id: id,
            body: Object.keys(deleteData).length > 0 ? JSON.stringify(deleteData) : undefined
        });
    }

    async getTicketMessages(ticketId) {

        const url = `${this.apiUrl}?table=ticket_messages&ticket_id=${encodeURIComponent(ticketId)}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async createTicketMessage(messageData) {
        const cleanData = { ...messageData };
        delete cleanData.id;



        return await this.request('ticket_messages', {
            method: 'POST',
            body: JSON.stringify(cleanData)
        });
    }

    async addUserToTicket(ticketId, userId, addedBy = null) {
        const data = {
            ticket_id: parseInt(ticketId),
            user_id: userId,
            added_by: addedBy
        };

        return await this.request('ticket_users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async removeUserFromTicket(ticketId, userId) {
        const deleteData = {};

        const url = `${this.apiUrl}?table=ticket_users&ticket_id=${ticketId}&user_id=${encodeURIComponent(userId)}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                const ticketUser = result.data[0];
                return await this.request('ticket_users', {
                    method: 'DELETE',
                    id: ticketUser.id,
                    body: Object.keys(deleteData).length > 0 ? JSON.stringify(deleteData) : undefined
                });
            } else {
                return { success: false, error: 'Usuário não encontrado no ticket' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getTicketUsers(ticketId) {
        const url = `${this.apiUrl}?table=ticket_users&ticket_id=${ticketId}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const result = await response.json();

            if (result.success) {
                return { success: true, data: result.data || [] };
            }
            return { success: false, data: [] };
        } catch (error) {
            return { success: false, data: [] };
        }
    }

    async getTicketsByAddedUserId(userId) {
        const url = `${this.apiUrl}?table=ticket_users&user_id=${encodeURIComponent(userId)}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                const data = result.data || [];
                return data;
            } else {
                return [];
            }
        } catch (error) {
            return [];
        }
    }

    async getDenuncias() {
        const url = `${this.apiUrl}?table=denuncias`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                const data = result.data || [];

                return data.map(d => {
                    if (typeof d.manter_anonimato === 'number') d.manter_anonimato = Boolean(d.manter_anonimato);
                    if (typeof d.declaracoes_aceitas === 'number') d.declaracoes_aceitas = Boolean(d.declaracoes_aceitas);
                    return d;
                });
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async getDenunciasByUserId(userId) {
        const url = `${this.apiUrl}?table=denuncias&user_id=${encodeURIComponent(userId)}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('getDenunciasByUserId: Erro HTTP', response.status);
                return [];
            }

            const result = await response.json();

            if (result.success) {
                const data = result.data || [];

                const denuncias = data.map(d => {
                    if (typeof d.manter_anonimato === 'number') d.manter_anonimato = Boolean(d.manter_anonimato);
                    if (typeof d.declaracoes_aceitas === 'number') d.declaracoes_aceitas = Boolean(d.declaracoes_aceitas);
                    return d;
                });
                console.log('getDenunciasByUserId: Denúncias criadas pelo usuário encontradas:', denuncias.length);
                return denuncias;
            }
            console.log('getDenunciasByUserId: Nenhuma denúncia criada pelo usuário encontrada');
            return [];
        } catch (error) {
            console.error('getDenunciasByUserId: Erro ao buscar denúncias:', error);
            return [];
        }
    }

    async createDenuncia(denunciaData) {
        try {
            const response = await fetch('/api/php/create-denuncia.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(denunciaData)
            });

            const result = await response.json();
            return result;
        } catch (error) {
            return {
                success: false,
                error: 'Erro ao comunicar com o servidor: ' + error.message
            };
        }
    }

    async updateDenuncia(id, denunciaData) {
        return await this.request('denuncias', {
            method: 'PATCH',
            id: id,
            body: JSON.stringify(denunciaData)
        });
    }

    async getDenunciaMessages(denunciaId) {
        const url = `${this.apiUrl}?table=denuncia_messages&denuncia_id=${encodeURIComponent(denunciaId)}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                return result.data || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async createDenunciaMessage(messageData) {
        const cleanData = { ...messageData };
        delete cleanData.id;

        return await this.request('denuncia_messages', {
            method: 'POST',
            body: JSON.stringify(cleanData)
        });
    }

    async addUserToDenuncia(denunciaId, userId, addedBy = null) {
        const data = {
            denuncia_id: parseInt(denunciaId),
            user_id: userId,
            added_by: addedBy
        };

        return await this.request('denuncia_users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async removeUserFromDenuncia(denunciaId, userId) {

        const url = `${this.apiUrl}?table=denuncia_users&denuncia_id=${denunciaId}&user_id=${encodeURIComponent(userId)}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return { success: false, error: `Erro ao buscar registro: ${response.status}` };
            }

            const result = await response.json();

            if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
                const denunciaUser = result.data[0];

                if (!denunciaUser || !denunciaUser.id) {
                    return { success: false, error: 'ID do registro não encontrado' };
                }

                const deleteResult = await this.request('denuncia_users', {
                    method: 'DELETE',
                    id: denunciaUser.id
                });

                return deleteResult;
            } else {
                return { success: false, error: 'Usuário não encontrado na denúncia' };
            }
        } catch (error) {
            console.error('Erro ao remover usuário da denúncia:', error);
            return { success: false, error: error.message || 'Erro desconhecido ao remover usuário' };
        }
    }

    async getDenunciaUsers(denunciaId) {
        const url = `${this.apiUrl}?table=denuncia_users&denuncia_id=${encodeURIComponent(denunciaId)}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    data: result.data || []
                };
            }
            return { success: false, data: [] };
        } catch (error) {
            return { success: false, data: [] };
        }
    }

    async getDenunciasByAddedUserId(userId) {
        const url = `${this.apiUrl}?table=denuncia_users&user_id=${encodeURIComponent(userId)}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return { success: false, data: [] };
            }

            const result = await response.json();

            if (result.success) {
                const data = result.data || [];

                return { success: true, data: data };
            }
            return { success: false, data: [] };
        } catch (error) {
            console.error('Erro ao buscar denúncias adicionadas:', error);
            return { success: false, data: [] };
        }
    }
}

if (typeof window.dbAPI === 'undefined') {
    window.dbAPI = new DatabaseAPI();
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.dbAPI)).filter(name => name !== 'constructor');

    const proto = Object.getPrototypeOf(window.dbAPI);
    if (proto && typeof proto.login === 'function') {

        window.dbAPI.login = proto.login.bind(window.dbAPI);
    } else {
    }

    const protoDoc = Object.getPrototypeOf(window.dbAPI);
    const docMethods = ['getDocumentos', 'createDocumento', 'updateDocumento', 'deleteDocumento'];
    docMethods.forEach(methodName => {
        if (protoDoc && typeof protoDoc[methodName] === 'function') {
            if (typeof window.dbAPI[methodName] !== 'function') {
                window.dbAPI[methodName] = protoDoc[methodName].bind(window.dbAPI);
            }
        } else {
        }
    });

    const protoTickets = Object.getPrototypeOf(window.dbAPI);
    const ticketMethods = ['createTicket', 'updateTicket', 'deleteTicket', 'createTicketMessage', 'getTicketMessages', 'getTicketsByUserId', 'getTicketsByUnidade', 'addUserToTicket', 'removeUserFromTicket'];
    ticketMethods.forEach(methodName => {
        if (protoTickets && typeof protoTickets[methodName] === 'function') {
            if (typeof window.dbAPI[methodName] !== 'function') {
                window.dbAPI[methodName] = protoTickets[methodName].bind(window.dbAPI);
            }
        }
    });
} else {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.dbAPI)).filter(name => name !== 'constructor');

    const protoExisting = Object.getPrototypeOf(window.dbAPI);
    if (protoExisting && typeof protoExisting.login === 'function') {
        if (typeof window.dbAPI.login !== 'function') {
            window.dbAPI.login = protoExisting.login.bind(window.dbAPI);
        }
    } else {
    }

    const docMethodsExisting = ['getDocumentos', 'createDocumento', 'updateDocumento', 'deleteDocumento'];
    docMethodsExisting.forEach(methodName => {
        if (protoExisting && typeof protoExisting[methodName] === 'function') {
            if (typeof window.dbAPI[methodName] !== 'function') {
                window.dbAPI[methodName] = protoExisting[methodName].bind(window.dbAPI);
            }
        } else {
        }
    });

    const ticketMethodsExisting = ['createTicket', 'updateTicket', 'deleteTicket', 'createTicketMessage', 'getTicketMessages', 'getTicketsByUserId', 'getTicketsByUnidade', 'addUserToTicket', 'removeUserFromTicket'];
    ticketMethodsExisting.forEach(methodName => {
        if (protoExisting && typeof protoExisting[methodName] === 'function') {
            if (typeof window.dbAPI[methodName] !== 'function') {
                window.dbAPI[methodName] = protoExisting[methodName].bind(window.dbAPI);
            }
        }
    });

}

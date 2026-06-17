// ============================================
// CONFIGURACIÓN DE GOOGLE SHEETS CON GIS (Google Identity Services)
// ============================================

const CLIENT_ID = '1038997880728-v5dg34jpandsrvnprtkvm3atd9tldhmc.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAJgw0PQKO4qhby7mYDkopJPUXJBu79rGk';

const SHEETS_CONFIG = {
    spreadsheetId: '14xD_209wbWswASj3uFTBnTPC_NLf3_dKtDoIeP-Q3hE',
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    sheets: {
        orders: 'Pedidos',
        products: 'Productos',
        deliverers: 'Entregadores'
    }
};

console.log('📊 Configuración de Google Sheets cargada');

// ============================================
// CLASE GOOGLE SHEETS MANAGER CON GIS
// ============================================
class GoogleSheetsManager {
    constructor(config) {
        this.spreadsheetId = config.spreadsheetId;
        this.apiKey = config.apiKey;
        this.clientId = config.clientId;
        this.scopes = config.scopes;
        this.discoveryDocs = config.discoveryDocs;
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values`;
        
        this.tokenClient = null;
        this.accessToken = null;
        this.gapiInitialized = false;
        this.gisLoaded = false;
        
        console.log('✅ GoogleSheetsManager inicializado');
    }

    // ===== CARGAR SCRIPTS DE GOOGLE =====
    async _loadScripts() {
        return new Promise((resolve, reject) => {
            let scriptsLoaded = 0;
            const totalScripts = 2;
            
            const checkComplete = () => {
                scriptsLoaded++;
                if (scriptsLoaded === totalScripts) resolve();
            };

            // 1. Cargar gapi (api.js)
            if (typeof gapi !== 'undefined') {
                checkComplete();
            } else {
                const gapiScript = document.createElement('script');
                gapiScript.src = 'https://apis.google.com/js/api.js';
                gapiScript.onload = checkComplete;
                gapiScript.onerror = () => reject(new Error('No se pudo cargar api.js'));
                document.head.appendChild(gapiScript);
            }

            // 2. Cargar GIS (accounts.google.com/gsi/client)
            if (typeof google !== 'undefined' && google.accounts) {
                this.gisLoaded = true;
                checkComplete();
            } else {
                const gsiScript = document.createElement('script');
                gsiScript.src = 'https://accounts.google.com/gsi/client';
                gsiScript.onload = () => {
                    this.gisLoaded = true;
                    checkComplete();
                };
                gsiScript.onerror = () => reject(new Error('No se pudo cargar GIS'));
                document.head.appendChild(gsiScript);
            }
        });
    }

    // ===== INICIALIZAR GAPI CLIENT =====
    async _initGapiClient() {
        return new Promise((resolve, reject) => {
            if (this.gapiInitialized) {
                resolve();
                return;
            }

            try {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.apiKey,
                            discoveryDocs: this.discoveryDocs
                        });
                        this.gapiInitialized = true;
                        console.log('✅ gapi.client inicializado');
                        resolve();
                    } catch (err) {
                        console.error('❌ Error en gapi.client.init:', err);
                        reject(err);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    // ===== INICIALIZAR TOKEN CLIENT (GIS) =====
    _initTokenClient() {
        if (!this.gisLoaded) {
            throw new Error('GIS no está cargado');
        }

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: this.scopes,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;
                    console.log('✅ Token de acceso obtenido');
                }
            },
            error_callback: (error) => {
                console.error('❌ Error en token client:', error);
            }
        });
    }

    // ===== AUTENTICAR =====
    async authenticate() {
        try {
            console.log('🔐 Iniciando autenticación...');
            
            // Cargar scripts si no están
            await this._loadScripts();
            
            // Inicializar gapi.client
            await this._initGapiClient();
            
            // Inicializar token client
            this._initTokenClient();

            // Solicitar token (abre popup de login si es necesario)
            return new Promise((resolve, reject) => {
                this.tokenClient.callback = (response) => {
                    if (response.error) {
                        console.error('❌ Error de autenticación:', response.error);
                        reject(response.error);
                        return;
                    }
                    this.accessToken = response.access_token;
                    console.log('✅ Autenticación exitosa');
                    resolve(true);
                };
                
                this.tokenClient.error_callback = (error) => {
                    console.error('❌ Error en callback:', error);
                    reject(error);
                };

                // Pedir el token
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            });

        } catch (error) {
            console.error('❌ Error en authenticate():', error);
            throw error;
        }
    }

    // ===== ASEGURAR AUTENTICACIÓN =====
    async ensureAuthenticated() {
        if (!this.accessToken) {
            await this.authenticate();
        }
        return !!this.accessToken;
    }

    // ===== HACER REQUEST AUTENTICADO =====
    async _authenticatedFetch(url, options = {}) {
        await this.ensureAuthenticated();
        
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return response.json();
    }

    // ============================================
    // PEDIDOS
    // ============================================

    async saveOrder(order) {
        try {
            console.log('📦 Guardando pedido:', order);

            const values = [[
                order.id || 'order-' + Date.now(),
                order.fecha || new Date().toISOString(),
                order.cliente || 'Cliente',
                order.telefono || '11 0000-0000',
                order.tipo_entrega || 'Envío',
                order.direccion || '',
                order.items || '',
                order.total || 0,
                order.pago || 'efectivo',
                order.notas || '',
                order.estado || 'pendiente',
                order.entregador || 'Sin asignar'
            ]];

            const url = `${this.baseUrl}/Pedidos:append?valueInputOption=USER_ENTERED`;
            const data = await this._authenticatedFetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    range: 'Pedidos',
                    majorDimension: 'ROWS',
                    values: values
                })
            });

            console.log('✅ Pedido guardado:', data);
            this.saveToLocalStorage('orders', order);
            return data;

        } catch (error) {
            console.error('❌ Error al guardar pedido:', error);
            this.saveToLocalStorage('orders', order);
            throw error;
        }
    }

    async getOrders() {
        try {
            const url = `${this.baseUrl}/Pedidos?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            
            if (!data.values || data.values.length < 2) {
                return this.getFromLocalStorage('orders') || [];
            }

            const headers = data.values[0];
            const rows = data.values.slice(1);

            const orders = rows.map(row => {
                const order = {};
                headers.forEach((header, index) => {
                    order[header.toLowerCase().trim()] = row[index] || '';
                });
                order.total = parseFloat(order.total) || 0;
                return order;
            });

            localStorage.setItem('orders', JSON.stringify(orders));
            return orders;

        } catch (error) {
            console.error('❌ Error al obtener pedidos:', error);
            return this.getFromLocalStorage('orders') || [];
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const orders = await this.getOrders();
            const orderIndex = orders.findIndex(o => o.id === orderId);
            
            if (orderIndex === -1) throw new Error('Pedido no encontrado');

            const rowIndex = orderIndex + 2;
            const url = `${this.baseUrl}/Pedidos!K${rowIndex}?valueInputOption=USER_ENTERED`;
            
            const data = await this._authenticatedFetch(url, {
                method: 'PUT',
                body: JSON.stringify({ values: [[newStatus]] })
            });

            console.log('✅ Estado actualizado:', data);
            return data;

        } catch (error) {
            console.error('❌ Error al actualizar estado:', error);
            throw error;
        }
    }

    // ============================================
    // PRODUCTOS
    // ============================================

    async getProductsFromSheets() {
        try {
            console.log('📦 Obteniendo productos...');
            
            const url = `${this.baseUrl}/Productos?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`⚠️ Error HTTP ${response.status}`);
                return [];
            }

            const data = await response.json();
            
            if (!data.values || data.values.length < 2) {
                console.log('⚠️ No hay productos');
                return [];
            }

            const headers = data.values[0];
            const rows = data.values.slice(1);

            const productos = rows.map(row => {
                const product = {};
                headers.forEach((header, index) => {
                    product[header.toLowerCase().trim()] = row[index] || '';
                });
                product.precio = parseFloat(product.precio) || 0;
                product.id = parseInt(product.id) || Date.now();
                return product;
            });

            console.log(`✅ ${productos.length} productos cargados`);
            return productos;

        } catch (error) {
            console.error('❌ Error al obtener productos:', error);
            return [];
        }
    }

    async saveProductToSheets(product) {
        try {
            console.log('📦 Guardando producto:', product);
            
            const values = [[
                product.id || Date.now(),
                product.nombre || '',
                product.descripcion || '',
                product.precio || 0,
                product.imagen || '',
                product.categoria || ''
            ]];
            
            const url = `${this.baseUrl}/Productos:append?valueInputOption=USER_ENTERED`;
            const data = await this._authenticatedFetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    range: 'Productos',
                    majorDimension: 'ROWS',
                    values: values
                })
            });

            console.log('✅ Producto guardado:', data);
            return data;

        } catch (error) {
            console.error('❌ Error al guardar producto:', error);
            throw error;
        }
    }

    // ============================================
    // ENTREGADORES
    // ============================================

    async getDeliverersFromSheets() {
        try {
            console.log('📦 Obteniendo entregadores...');
            
            const url = `${this.baseUrl}/Entregadores?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`⚠️ Error HTTP ${response.status}`);
                return [];
            }

            const data = await response.json();
            
            if (!data.values || data.values.length < 2) {
                console.log('⚠️ No hay entregadores');
                return [];
            }

            const headers = data.values[0];
            const rows = data.values.slice(1);

            const entregadores = rows.map(row => {
                const deliverer = {};
                headers.forEach((header, index) => {
                    deliverer[header.toLowerCase().trim()] = row[index] || '';
                });
                deliverer.disponible = deliverer.disponible === 'Sí' || deliverer.disponible === 'true';
                deliverer.id = deliverer.id || Date.now().toString();
                return deliverer;
            });

            console.log(`✅ ${entregadores.length} entregadores cargados`);
            return entregadores;

        } catch (error) {
            console.error('❌ Error al obtener entregadores:', error);
            return [];
        }
    }

    async saveDelivererToSheets(deliverer) {
        try {
            console.log('📦 Guardando entregador:', deliverer);
            
            const values = [[
                deliverer.id || Date.now().toString(),
                deliverer.nombre || '',
                deliverer.telefono || '',
                deliverer.vehiculo || '',
                deliverer.disponible ? 'Sí' : 'No'
            ]];
            
            const url = `${this.baseUrl}/Entregadores:append?valueInputOption=USER_ENTERED`;
            const data = await this._authenticatedFetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    range: 'Entregadores',
                    majorDimension: 'ROWS',
                    values: values
                })
            });

            console.log('✅ Entregador guardado:', data);
            return data;

        } catch (error) {
            console.error('❌ Error al guardar entregador:', error);
            throw error;
        }
    }

    async updateDelivererInSheets(delivererId, updatedData) {
        try {
            const deliverers = await this.getDeliverersFromSheets();
            const index = deliverers.findIndex(d => d.id === delivererId);
            
            if (index === -1) throw new Error('Entregador no encontrado');

            const rowIndex = index + 2;
            const url = `${this.baseUrl}/Entregadores!A${rowIndex}:E${rowIndex}?valueInputOption=USER_ENTERED`;
            
            const values = [[
                delivererId,
                updatedData.nombre || '',
                updatedData.telefono || '',
                updatedData.vehiculo || '',
                updatedData.disponible ? 'Sí' : 'No'
            ]];
            
            const data = await this._authenticatedFetch(url, {
                method: 'PUT',
                body: JSON.stringify({ values: values })
            });

            console.log('✅ Entregador actualizado:', data);
            return data;

        } catch (error) {
            console.error('❌ Error al actualizar entregador:', error);
            throw error;
        }
    }

    // ============================================
    // LOCAL STORAGE
    // ============================================

    saveToLocalStorage(key, data) {
        try {
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const index = existing.findIndex(o => o.id === data.id);
            if (index !== -1) {
                existing[index] = data;
            } else {
                existing.push(data);
            }
            localStorage.setItem(key, JSON.stringify(existing));
        } catch (error) {
            console.error('Error en localStorage:', error);
        }
    }

    getFromLocalStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (error) {
            return [];
        }
    }

    // ===== CERRAR SESIÓN =====
    async logout() {
        try {
            if (this.accessToken && google && google.accounts) {
                google.accounts.oauth2.revoke(this.accessToken, () => {
                    console.log('🔴 Token revocado');
                });
            }
            this.accessToken = null;
            console.log('🔴 Sesión cerrada');
            return true;
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            return false;
        }
    }
}

// ============================================
// INSTANCIA GLOBAL
// ============================================
console.log('🚀 Inicializando GoogleSheets...');
const GoogleSheets = new GoogleSheetsManager(SHEETS_CONFIG);
window.GoogleSheets = GoogleSheets;

// Funciones globales
window.authenticateGoogle = async () => await GoogleSheets.authenticate();
window.logoutGoogle = async () => await GoogleSheets.logout();
window.saveOrderToSheets = async (order) => await GoogleSheets.saveOrder(order);
window.getOrdersFromSheets = async () => await GoogleSheets.getOrders();
window.updateOrderStatusInSheets = async (id, status) => await GoogleSheets.updateOrderStatus(id, status);
window.getProductsFromSheets = async () => await GoogleSheets.getProductsFromSheets();
window.saveProductToSheets = async (product) => await GoogleSheets.saveProductToSheets(product);
window.getDeliverersFromSheets = async () => await GoogleSheets.getDeliverersFromSheets();
window.saveDelivererToSheets = async (deliverer) => await GoogleSheets.saveDelivererToSheets(deliverer);
window.updateDelivererInSheets = async (id, data) => await GoogleSheets.updateDelivererInSheets(id, data);

console.log('✅ GoogleSheets disponible globalmente');
console.log('🔐 GIS (Google Identity Services) configurado');

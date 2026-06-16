// ============================================
// CONFIGURACIÓN DE GOOGLE SHEETS CON OAUTH2
// ============================================

// 🔴 REEMPLAZÁ CON TU CLIENT ID DE OAuth2
const CLIENT_ID = '1038997880728-v5dg34jpandsrvnprtkvm3atd9tldhmc.apps.googleusercontent.com';  // ← PEGA TU CLIENT ID AQUÍ
const API_KEY = 'AIzaSyAJgw0PQKO4qhby7mYDkopJPUXJBu79rGk';

const SHEETS_CONFIG = {
    spreadsheetId: '14xD_209wbWswASj3uFTBnTPC_NLf3_dKtDoIeP-Q3hE',
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
    sheets: {
        orders: 'Pedidos',
        products: 'Productos',
        deliverers: 'Entregadores'
    }
};

console.log('📊 Configuración de Google Sheets cargada');
console.log('📊 Spreadsheet ID:', SHEETS_CONFIG.spreadsheetId);

// ============================================
// TOKEN DE AUTENTICACIÓN
// ============================================
let authToken = null;

// ============================================
// CLASE PARA MANEJAR GOOGLE SHEETS CON OAUTH
// ============================================
class GoogleSheetsManager {
    constructor(config) {
        this.spreadsheetId = config.spreadsheetId;
        this.apiKey = config.apiKey;
        this.clientId = config.clientId;
        this.scopes = config.scopes;
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values`;
        this.isAuthenticated = false;
        console.log('✅ GoogleSheetsManager inicializado');
    }

    // ===== INICIAR SESIÓN CON GOOGLE =====
    async authenticate() {
        return new Promise((resolve, reject) => {
            try {
                // Si ya está cargado gapi, usar directamente
                if (typeof gapi !== 'undefined' && gapi.client) {
                    this._initGapi(resolve, reject);
                    return;
                }

                // Cargar la librería de Google OAuth
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    this._initGapi(resolve, reject);
                };
                script.onerror = () => {
                    reject(new Error('No se pudo cargar la librería de Google'));
                };
                document.head.appendChild(script);
            } catch (error) {
                console.error('❌ Error en autenticación:', error);
                reject(error);
            }
        });
    }

    async _initGapi(resolve, reject) {
        try {
            await gapi.client.init({
                apiKey: this.apiKey,
                clientId: this.clientId,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                scope: this.scopes
            });
            
            const auth = gapi.auth2.getAuthInstance();
            const isSignedIn = auth.isSignedIn.get();
            
            if (isSignedIn) {
                this.isAuthenticated = true;
                authToken = auth.currentUser.get().getAuthResponse().access_token;
                console.log('✅ Ya autenticado con Google');
                resolve(true);
            } else {
                // Mostrar popup de login
                try {
                    await auth.signIn();
                    this.isAuthenticated = true;
                    authToken = auth.currentUser.get().getAuthResponse().access_token;
                    console.log('✅ Autenticación exitosa');
                    resolve(true);
                } catch (signInError) {
                    console.error('❌ Error al iniciar sesión:', signInError);
                    reject(signInError);
                }
            }
        } catch (initError) {
            console.error('❌ Error al inicializar gapi:', initError);
            reject(initError);
        }
    }

    // ===== VERIFICAR AUTENTICACIÓN =====
    async ensureAuthenticated() {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }
        return this.isAuthenticated;
    }

    // ===== OBTENER TOKEN =====
    getAuthToken() {
        if (gapi && gapi.auth2) {
            const auth = gapi.auth2.getAuthInstance();
            if (auth && auth.isSignedIn.get()) {
                return auth.currentUser.get().getAuthResponse().access_token;
            }
        }
        return null;
    }

    // ============================================
    // ===== PEDIDOS =====
    // ============================================

    // ===== GUARDAR PEDIDO =====
    async saveOrder(order) {
        try {
            await this.ensureAuthenticated();
            
            console.log('📦 Guardando pedido en Google Sheets:', order);

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

            const token = this.getAuthToken();
            const url = `${this.baseUrl}/Pedidos:append?valueInputOption=USER_ENTERED`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    range: 'Pedidos',
                    majorDimension: 'ROWS',
                    values: values
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error HTTP:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Pedido guardado en Google Sheets:', data);
            
            this.saveToLocalStorage('orders', order);
            return data;

        } catch (error) {
            console.error('❌ Error al guardar en Google Sheets:', error);
            this.saveToLocalStorage('orders', order);
            throw error;
        }
    }

    // ===== OBTENER PEDIDOS (lectura pública) =====
    async getOrders() {
        try {
            const url = `${this.baseUrl}/Pedidos?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.values || data.values.length < 2) {
                return this.getFromLocalStorage('orders') || [];
            }

            const headers = data.values[0];
            const rows = data.values.slice(1);

            const orders = rows.map(row => {
                const order = {};
                headers.forEach((header, index) => {
                    order[header.toLowerCase()] = row[index] || '';
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

    // ===== ACTUALIZAR ESTADO DEL PEDIDO =====
    async updateOrderStatus(orderId, newStatus) {
        try {
            await this.ensureAuthenticated();
            
            const orders = await this.getOrders();
            const orderIndex = orders.findIndex(o => o.id === orderId);
            
            if (orderIndex === -1) {
                throw new Error('Pedido no encontrado');
            }

            const rowIndex = orderIndex + 2;
            const token = this.getAuthToken();
            const url = `${this.baseUrl}/Pedidos!K${rowIndex}?valueInputOption=USER_ENTERED`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: [[newStatus]]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Estado actualizado en Google Sheets:', data);
            
            const localOrders = this.getFromLocalStorage('orders');
            const localOrder = localOrders.find(o => o.id === orderId);
            if (localOrder) {
                localOrder.estado = newStatus;
                localStorage.setItem('orders', JSON.stringify(localOrders));
            }
            
            return data;

        } catch (error) {
            console.error('❌ Error al actualizar estado:', error);
            throw error;
        }
    }

    // ============================================
    // ===== PRODUCTOS =====
    // ============================================

    // ===== OBTENER PRODUCTOS (lectura pública) =====
    async getProductsFromSheets() {
        try {
            console.log('📦 Obteniendo productos de Google Sheets...');
            
            const url = `${this.baseUrl}/Productos?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`⚠️ Error HTTP ${response.status} al obtener productos`);
                return [];
            }

            const data = await response.json();
            
            if (!data.values || data.values.length < 2) {
                console.log('⚠️ No hay productos en la planilla');
                return [];
            }

            const headers = data.values[0];
            const rows = data.values.slice(1);

            const productos = rows.map(row => {
                const product = {};
                headers.forEach((header, index) => {
                    const key = header.toLowerCase().trim();
                    product[key] = row[index] || '';
                });
                product.precio = parseFloat(product.precio) || 0;
                product.id = parseInt(product.id) || Date.now();
                return product;
            });

            console.log(`✅ ${productos.length} productos cargados desde Sheets`);
            return productos;

        } catch (error) {
            console.error('❌ Error al obtener productos:', error.message);
            return [];
        }
    }

    // ===== GUARDAR PRODUCTO =====
    async saveProductToSheets(product) {
        try {
            await this.ensureAuthenticated();
            
            console.log('📦 Guardando producto en Google Sheets:', product);
            
            const values = [[
                product.id || Date.now(),
                product.nombre || '',
                product.descripcion || '',
                product.precio || 0,
                product.imagen || '',
                product.categoria || ''
            ]];
            
            const token = this.getAuthToken();
            const url = `${this.baseUrl}/Productos:append?valueInputOption=USER_ENTERED`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    range: 'Productos',
                    majorDimension: 'ROWS',
                    values: values
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error HTTP:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Producto guardado en Google Sheets:', data);
            return data;

        } catch (error) {
            console.error('❌ Error al guardar producto:', error);
            throw error;
        }
    }

    // ============================================
    // ===== ENTREGADORES =====
    // ============================================

    // ===== OBTENER ENTREGADORES (lectura pública) =====
    async getDeliverersFromSheets() {
        try {
            console.log('📦 Obteniendo entregadores de Google Sheets...');
            
            const url = `${this.baseUrl}/Entregadores?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`⚠️ Error HTTP ${response.status} al obtener entregadores`);
                return [];
            }

            const data = await response.json();
            
            if (!data.values || data.values.length < 2) {
                console.log('⚠️ No hay entregadores en la planilla');
                return [];
            }

            const headers = data.values[0];
            const rows = data.values.slice(1);

            const entregadores = rows.map(row => {
                const deliverer = {};
                headers.forEach((header, index) => {
                    const key = header.toLowerCase().trim();
                    deliverer[key] = row[index] || '';
                });
                deliverer.disponible = deliverer.disponible === 'Sí' || deliverer.disponible === 'true';
                deliverer.id = deliverer.id || Date.now().toString();
                return deliverer;
            });

            console.log(`✅ ${entregadores.length} entregadores cargados desde Sheets`);
            return entregadores;

        } catch (error) {
            console.error('❌ Error al obtener entregadores:', error.message);
            return [];
        }
    }

    // ===== GUARDAR ENTREGADOR =====
    async saveDelivererToSheets(deliverer) {
        try {
            await this.ensureAuthenticated();
            
            console.log('📦 Guardando entregador en Google Sheets:', deliverer);
            
            const values = [[
                deliverer.id || Date.now().toString(),
                deliverer.nombre || '',
                deliverer.telefono || '',
                deliverer.vehiculo || '',
                deliverer.disponible ? 'Sí' : 'No'
            ]];
            
            const token = this.getAuthToken();
            const url = `${this.baseUrl}/Entregadores:append?valueInputOption=USER_ENTERED`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    range: 'Entregadores',
                    majorDimension: 'ROWS',
                    values: values
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error HTTP:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Entregador guardado en Google Sheets:', data);
            return data;

        } catch (error) {
            console.error('❌ Error al guardar entregador:', error);
            throw error;
        }
    }

    // ===== ACTUALIZAR ENTREGADOR =====
    async updateDelivererInSheets(delivererId, updatedData) {
        try {
            await this.ensureAuthenticated();
            
            console.log('📦 Actualizando entregador en Google Sheets:', delivererId);
            
            const deliverers = await this.getDeliverersFromSheets();
            const index = deliverers.findIndex(d => d.id === delivererId);
            
            if (index === -1) {
                throw new Error('Entregador no encontrado');
            }

            const rowIndex = index + 2;
            const token = this.getAuthToken();
            const url = `${this.baseUrl}/Entregadores!A${rowIndex}:E${rowIndex}?valueInputOption=USER_ENTERED`;
            
            const values = [[
                delivererId,
                updatedData.nombre || '',
                updatedData.telefono || '',
                updatedData.vehiculo || '',
                updatedData.disponible ? 'Sí' : 'No'
            ]];
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: values
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error HTTP:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Entregador actualizado en Google Sheets:', data);
            return data;

        } catch (error) {
            console.error('❌ Error al actualizar entregador:', error);
            throw error;
        }
    }

    // ============================================
    // ===== LOCAL STORAGE (FALLBACK) =====
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
            console.log(`💾 Guardado en localStorage: ${key}`);
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
            if (gapi && gapi.auth2) {
                const auth = gapi.auth2.getAuthInstance();
                await auth.signOut();
                this.isAuthenticated = false;
                authToken = null;
                console.log('🔴 Sesión cerrada');
                return true;
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
        return false;
    }
}

// ============================================
// CREAR INSTANCIA GLOBAL
// ============================================
console.log('🚀 Inicializando GoogleSheets...');

const GoogleSheets = new GoogleSheetsManager(SHEETS_CONFIG);
window.GoogleSheets = GoogleSheets;

// ============================================
// FUNCIONES GLOBALES
// ============================================

// Autenticación
window.authenticateGoogle = async () => await GoogleSheets.authenticate();
window.logoutGoogle = async () => await GoogleSheets.logout();

// Pedidos
window.saveOrderToSheets = async (order) => await GoogleSheets.saveOrder(order);
window.getOrdersFromSheets = async () => await GoogleSheets.getOrders();
window.updateOrderStatusInSheets = async (id, status) => await GoogleSheets.updateOrderStatus(id, status);

// Productos
window.getProductsFromSheets = async () => await GoogleSheets.getProductsFromSheets();
window.saveProductToSheets = async (product) => await GoogleSheets.saveProductToSheets(product);

// Entregadores
window.getDeliverersFromSheets = async () => await GoogleSheets.getDeliverersFromSheets();
window.saveDelivererToSheets = async (deliverer) => await GoogleSheets.saveDelivererToSheets(deliverer);
window.updateDelivererInSheets = async (id, data) => await GoogleSheets.updateDelivererInSheets(id, data);

console.log('✅ GoogleSheets disponible globalmente');
console.log('📊 Spreadsheet:', SHEETS_CONFIG.spreadsheetId);
console.log('📋 Pestañas:', SHEETS_CONFIG.sheets);
console.log('🔐 OAuth2 configurado. Llamá a authenticateGoogle() para iniciar sesión.');

// ============================================
// CONFIGURACIÓN DE GOOGLE SHEETS
// ============================================
const SHEETS_CONFIG = {
    // 🔴 TU SPREADSHEET ID
    spreadsheetId: '14xD_209wbWswASj3uFTBnTPC_NLf3_dKtDoIeP-Q3hE',
    // 🔴 TU API KEY
    apiKey: 'AIzaSyAJgw0PQKO4qhby7mYDkopJPUXJBu79rGk',
    sheets: {
        orders: 'Pedidos',
        products: 'Productos',
        deliverers: 'Entregadores'
    }
};

console.log('📊 Configuración de Google Sheets cargada');
console.log('📊 Spreadsheet ID:', SHEETS_CONFIG.spreadsheetId);

// ============================================
// CLASE PARA MANEJAR GOOGLE SHEETS
// ============================================
class GoogleSheetsManager {
    constructor(config) {
        this.spreadsheetId = config.spreadsheetId;
        this.apiKey = config.apiKey;
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values`;
        console.log('✅ GoogleSheetsManager inicializado');
        console.log('📊 Spreadsheet ID:', this.spreadsheetId);
        console.log('🔑 API Key:', this.apiKey ? '✅ Configurada' : '❌ No configurada');
    }

    // ============================================
    // ===== PEDIDOS =====
    // ============================================

    // ===== GUARDAR PEDIDO =====
    async saveOrder(order) {
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

        const url = `${this.baseUrl}/Pedidos:append?valueInputOption=USER_ENTERED&key=${this.apiKey}`;

        try {
            console.log('📤 Enviando a Google Sheets...');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
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
            
            // Guardar en localStorage como respaldo
            this.saveToLocalStorage('orders', order);
            
            return data;

        } catch (error) {
            console.error('❌ Error al guardar en Google Sheets:', error);
            this.saveToLocalStorage('orders', order);
            throw error;
        }
    }

    // ===== OBTENER PEDIDOS =====
    async getOrders() {
        try {
            const response = await fetch(`${this.baseUrl}/Pedidos?key=${this.apiKey}`);
            
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
            const orders = await this.getOrders();
            const orderIndex = orders.findIndex(o => o.id === orderId);
            
            if (orderIndex === -1) {
                throw new Error('Pedido no encontrado');
            }

            const rowIndex = orderIndex + 2;
            const url = `${this.baseUrl}/Pedidos!K${rowIndex}?valueInputOption=USER_ENTERED&key=${this.apiKey}`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
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
            
            // Actualizar en localStorage
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

    // ===== OBTENER PRODUCTOS =====
    async getProductsFromSheets() {
        try {
            console.log('📦 Obteniendo productos de Google Sheets...');
            
            const response = await fetch(`${this.baseUrl}/Productos?key=${this.apiKey}`);
            
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
            console.log('📦 Guardando producto en Google Sheets:', product);
            
            const values = [[
                product.id || Date.now(),
                product.nombre || '',
                product.descripcion || '',
                product.precio || 0,
                product.imagen || '',
                product.categoria || ''
            ]];
            
            const response = await fetch(`${this.baseUrl}/Productos:append?valueInputOption=USER_ENTERED&key=${this.apiKey}`, {
                method: 'POST',
                headers: {
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

    // ===== OBTENER ENTREGADORES =====
    async getDeliverersFromSheets() {
        try {
            console.log('📦 Obteniendo entregadores de Google Sheets...');
            
            const response = await fetch(`${this.baseUrl}/Entregadores?key=${this.apiKey}`);
            
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
            console.log('📦 Guardando entregador en Google Sheets:', deliverer);
            
            const values = [[
                deliverer.id || Date.now().toString(),
                deliverer.nombre || '',
                deliverer.telefono || '',
                deliverer.vehiculo || '',
                deliverer.disponible ? 'Sí' : 'No'
            ]];
            
            const response = await fetch(`${this.baseUrl}/Entregadores:append?valueInputOption=USER_ENTERED&key=${this.apiKey}`, {
                method: 'POST',
                headers: {
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
            console.log('📦 Actualizando entregador en Google Sheets:', delivererId);
            
            const deliverers = await this.getDeliverersFromSheets();
            const index = deliverers.findIndex(d => d.id === delivererId);
            
            if (index === -1) {
                throw new Error('Entregador no encontrado');
            }

            const rowIndex = index + 2;
            const url = `${this.baseUrl}/Entregadores!A${rowIndex}:E${rowIndex}?valueInputOption=USER_ENTERED&key=${this.apiKey}`;
            
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

    // ===== ELIMINAR ENTREGADOR =====
    async deleteDelivererFromSheets(delivererId) {
        try {
            console.log('📦 Eliminando entregador de Google Sheets:', delivererId);
            
            // No podemos eliminar filas directamente con la API de Sheets
            // Marcamos como no disponible en su lugar
            const deliverers = await this.getDeliverersFromSheets();
            const index = deliverers.findIndex(d => d.id === delivererId);
            
            if (index === -1) {
                throw new Error('Entregador no encontrado');
            }

            // Actualizar a "No disponible"
            const updatedData = {
                ...deliverers[index],
                disponible: false
            };
            
            return await this.updateDelivererInSheets(delivererId, updatedData);

        } catch (error) {
            console.error('❌ Error al eliminar entregador:', error);
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
}

// ============================================
// CREAR INSTANCIA GLOBAL
// ============================================
console.log('🚀 Inicializando GoogleSheets...');

const GoogleSheets = new GoogleSheetsManager(SHEETS_CONFIG);

// Hacerla global
window.GoogleSheets = GoogleSheets;

// ============================================
// FUNCIONES GLOBALES
// ============================================

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
window.deleteDelivererFromSheets = async (id) => await GoogleSheets.deleteDelivererFromSheets(id);

console.log('✅ GoogleSheets disponible globalmente');
console.log('📊 Spreadsheet:', SHEETS_CONFIG.spreadsheetId);
console.log('🔑 API Key:', SHEETS_CONFIG.apiKey ? '✅ Configurada' : '❌ No configurada');
console.log('📋 Pestañas:', SHEETS_CONFIG.sheets);

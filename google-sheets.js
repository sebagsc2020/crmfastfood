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
            console.log('📤 URL:', url);
            
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
            
            // También guardar en localStorage como respaldo
            this.saveToLocalStorage('orders', order);
            
            return data;

        } catch (error) {
            console.error('❌ Error al guardar en Google Sheets:', error);
            // Fallback: guardar en localStorage
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

            // Guardar en localStorage como respaldo
            localStorage.setItem('orders', JSON.stringify(orders));
            
            return orders;

        } catch (error) {
            console.error('❌ Error al obtener pedidos:', error);
            return this.getFromLocalStorage('orders') || [];
        }
    }

    // ===== OBTENER PRODUCTOS DE SHEETS =====
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

    // ===== LOCAL STORAGE (FALLBACK) =====
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
// INSTANCIA GLOBAL
// ============================================
console.log('🚀 Inicializando GoogleSheets...');
const GoogleSheets = new GoogleSheetsManager(SHEETS_CONFIG);
window.GoogleSheets = GoogleSheets;

// Funciones globales
window.saveOrderToSheets = async (order) => await GoogleSheets.saveOrder(order);
window.getOrdersFromSheets = async () => await GoogleSheets.getOrders();
window.updateOrderStatusInSheets = async (id, status) => await GoogleSheets.updateOrderStatus(id, status);
window.getProductsFromSheets = async () => await GoogleSheets.getProductsFromSheets();

console.log('✅ GoogleSheets listo!');
console.log(`📊 Spreadsheet: ${SHEETS_CONFIG.spreadsheetId}`);
console.log(`🔑 API Key: ${SHEETS_CONFIG.apiKey ? '✅ Configurada' : '❌ No configurada'}`);

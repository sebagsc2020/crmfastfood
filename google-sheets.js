// ============================================
// CONFIGURACIÓN
// ============================================
const SHEETS_CONFIG = {
    spreadsheetId: '14xD_209wbWswASj3uFTBnTPC_NLf3_dKtDoIeP-Q3hE',
    apiKey: 'AIzaSyAJgw0PQKO4qhby7mYDkopJPUXJBu79rGk',
    sheets: {
        orders: 'Pedidos',
        products: 'Productos',
        deliverers: 'Entregadores'
    }
};

// ============================================
// CLASE PRINCIPAL CON MODO OFFLINE
// ============================================
class GoogleSheetsManager {
    constructor(config) {
        this.spreadsheetId = config.spreadsheetId;
        this.apiKey = config.apiKey;
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values`;
        
        // Detectar si estamos online
        this.isOnline = navigator.onLine;
        
        // Escuchar cambios de conectividad
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🟢 Conexión restaurada. Sincronizando...');
            this.syncPendingOrders();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('🔴 Modo offline activado. Los pedidos se guardarán localmente.');
        });

        console.log(`📡 Modo: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
        this.initializeLocalStorage();
    }

    // ===== INICIALIZAR STORAGE LOCAL =====
    initializeLocalStorage() {
        ['orders', 'products', 'deliverers', 'pending_sync'].forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
            }
        });
    }

    // ===== GUARDAR PEDIDO (CON FALLBACK OFFLINE) =====
    async saveOrder(order) {
        console.log('📦 Guardando pedido:', order);
        
        // Primero guardar en localStorage SIEMPRE
        this.saveToLocalStorage('orders', order);
        
        // Si estamos online, intentar guardar en Sheets
        if (this.isOnline) {
            try {
                const result = await this.saveToSheets(order);
                console.log('✅ Pedido guardado en Google Sheets');
                
                // Verificar si hay pedidos pendientes de sincronizar
                await this.syncPendingOrders();
                
                return result;
            } catch (error) {
                console.warn('⚠️ Error al guardar en Sheets, queda en pendiente:', error);
                this.addToPendingSync(order);
                throw new Error('Pedido guardado localmente. Se sincronizará cuando vuelva la conexión.');
            }
        } else {
            // Modo offline
            this.addToPendingSync(order);
            console.log('💾 Pedido guardado en modo OFFLINE');
            throw new Error('Modo offline: El pedido se guardó localmente y se sincronizará automáticamente.');
        }
    }

    // ===== GUARDAR EN SHEETS (INTERNO) =====
    async saveToSheets(order) {
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
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                range: 'Pedidos',
                majorDimension: 'ROWS',
                values: values
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    }

    // ===== OBTENER PEDIDOS (LOCAL + SHEETS) =====
    async getOrders() {
        // Siempre devolver los pedidos locales primero
        const localOrders = this.getFromLocalStorage('orders');
        
        // Si estamos online, intentar obtener de Sheets y fusionar
        if (this.isOnline) {
            try {
                const sheetOrders = await this.getOrdersFromSheets();
                // Combinar y eliminar duplicados por ID
                const allOrders = [...localOrders, ...sheetOrders];
                const unique = Array.from(new Map(allOrders.map(o => [o.id, o])).values());
                
                // Actualizar localStorage con los datos más recientes
                localStorage.setItem('orders', JSON.stringify(unique));
                
                return unique;
            } catch (error) {
                console.warn('⚠️ Error al obtener de Sheets, usando datos locales:', error);
                return localOrders;
            }
        }
        
        return localOrders;
    }

    // ===== OBTENER DE SHEETS (INTERNO) =====
    async getOrdersFromSheets() {
        const response = await fetch(`${this.baseUrl}/Pedidos?key=${this.apiKey}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.values || data.values.length < 2) {
            return [];
        }

        const headers = data.values[0];
        const rows = data.values.slice(1);

        return rows.map(row => {
            const order = {};
            headers.forEach((header, index) => {
                order[header.toLowerCase()] = row[index] || '';
            });
            order.total = parseFloat(order.total) || 0;
            return order;
        });
    }

    // ===== ACTUALIZAR ESTADO =====
    async updateOrderStatus(orderId, newStatus) {
        // Actualizar localmente
        const orders = this.getFromLocalStorage('orders');
        const localOrder = orders.find(o => o.id === orderId);
        if (localOrder) {
            localOrder.estado = newStatus;
            localStorage.setItem('orders', JSON.stringify(orders));
        }

        // Si estamos online, actualizar en Sheets
        if (this.isOnline) {
            try {
                const result = await this.updateStatusInSheets(orderId, newStatus);
                console.log('✅ Estado actualizado en Google Sheets');
                return result;
            } catch (error) {
                console.warn('⚠️ Error al actualizar en Sheets, pendiente de sincronización:', error);
                this.addToPendingSync({ id: orderId, action: 'update_status', newStatus });
                throw new Error('Estado actualizado localmente. Se sincronizará cuando vuelva la conexión.');
            }
        } else {
            this.addToPendingSync({ id: orderId, action: 'update_status', newStatus });
            console.log('💾 Estado actualizado en modo OFFLINE');
            throw new Error('Modo offline: El estado se actualizó localmente.');
        }
    }

    // ===== ACTUALIZAR EN SHEETS (INTERNO) =====
    async updateStatusInSheets(orderId, newStatus) {
        const orders = await this.getOrdersFromSheets();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            throw new Error('Pedido no encontrado en Sheets');
        }

        const rowIndex = orderIndex + 2;
        const url = `${this.baseUrl}/Pedidos!K${rowIndex}?valueInputOption=USER_ENTERED&key=${this.apiKey}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [[newStatus]] })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    }

    // ===== SISTEMA DE PENDIENTES DE SINCRONIZACIÓN =====
    addToPendingSync(data) {
        const pending = JSON.parse(localStorage.getItem('pending_sync') || '[]');
        pending.push({
            ...data,
            timestamp: Date.now(),
            synced: false
        });
        localStorage.setItem('pending_sync', JSON.stringify(pending));
        console.log(`📦 ${pending.length} operaciones pendientes de sincronizar`);
    }

    async syncPendingOrders() {
        if (!this.isOnline) return;

        const pending = JSON.parse(localStorage.getItem('pending_sync') || '[]');
        const unsynced = pending.filter(p => !p.synced);
        
        if (unsynced.length === 0) return;

        console.log(`🔄 Sincronizando ${unsynced.length} operaciones pendientes...`);

        for (const item of unsynced) {
            try {
                if (item.action === 'update_status') {
                    await this.updateStatusInSheets(item.id, item.newStatus);
                } else {
                    await this.saveToSheets(item);
                }
                item.synced = true;
                console.log(`✅ Sincronizado: ${item.id}`);
            } catch (error) {
                console.error(`❌ Error sincronizando ${item.id}:`, error);
            }
        }

        // Guardar estado actualizado
        localStorage.setItem('pending_sync', JSON.stringify(pending));
        
        // Limpiar los que ya se sincronizaron
        const remaining = pending.filter(p => !p.synced);
        localStorage.setItem('pending_sync', JSON.stringify(remaining));
        
        console.log(`✅ Sincronización completada. ${remaining.length} pendientes restantes.`);
    }

    // ===== LOCAL STORAGE =====
    saveToLocalStorage(key, data) {
        try {
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            // Evitar duplicados por ID
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

console.log('✅ GoogleSheets listo!');
console.log(`📡 Estado: ${GoogleSheets.isOnline ? 'ONLINE 🌐' : 'OFFLINE 💾'}`);
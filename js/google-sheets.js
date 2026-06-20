// ============================================
// CONFIGURACIÓN - API PÚBLICA (SIN OAUTH)
// ============================================
const CONFIG = {
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzno9_b1xIrGpBB5MZcXvH2XukxAx4inrG-3HIdM0ZSRsnxyR0YrzfQ_sUqibM_1rsWug/exec'
};

// ============================================
// CLASE PRINCIPAL (SIN OAUTH)
// ============================================
class GoogleSheetsAPI {
    constructor() {
        this.token = null;
    }

    // ⭐ Autenticación simple (sin OAuth)
    async authenticate() {
        console.log('✅ Autenticación simple completada');
        return Promise.resolve();
    }

    async logout() {
        this.token = null;
        console.log('🚪 Sesión cerrada');
    }

    // ⭐ CARGAR PRODUCTOS
    async getProductsFromSheets() {
        try {
            const response = await fetch(`${CONFIG.WEB_APP_URL}?accion=obtenerProductos`);
            const data = await response.json();
            
            if (data.products) {
                console.log(`✅ ${data.products.length} productos cargados`);
                return data.products;
            }
            return [];
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            return [];
        }
    }

    // ⭐ CARGAR ENTREGADORES
    async getDeliverersFromSheets() {
        try {
            const response = await fetch(`${CONFIG.WEB_APP_URL}?accion=obtenerEntregadores`);
            const data = await response.json();
            
            if (data.deliverers) {
                console.log(`✅ ${data.deliverers.length} entregadores cargados`);
                return data.deliverers;
            }
            return [];
        } catch (error) {
            console.error('❌ Error cargando entregadores:', error);
            return [];
        }
    }

    // ⭐ CARGAR PEDIDOS
    async getOrders() {
        try {
            const response = await fetch(`${CONFIG.WEB_APP_URL}?accion=obtenerPedidos`);
            const data = await response.json();
            
            if (data.orders) {
                console.log(`✅ ${data.orders.length} pedidos cargados`);
                return data.orders;
            }
            return [];
        } catch (error) {
            console.error('❌ Error cargando pedidos:', error);
            return [];
        }
    }

    // ⭐ ACTUALIZAR ESTADO DE PEDIDO
    async updateOrderStatus(orderId, newStatus) {
        try {
            await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accion: 'actualizarEstadoPedido',
                    order_id: orderId,
                    nuevo_estado: newStatus
                })
            });
            
            console.log(`✅ Estado actualizado a: ${newStatus}`);
        } catch (error) {
            console.error('❌ Error actualizando estado:', error);
            throw error;
        }
    }

    // ⭐ GUARDAR PRODUCTO
    async saveProductToSheets(product) {
        try {
            await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accion: 'guardarProducto',
                    product: product
                })
            });
            
            console.log('✅ Producto guardado');
        } catch (error) {
            console.error('❌ Error guardando producto:', error);
            throw error;
        }
    }

    // ⭐ GUARDAR ENTREGADOR
    async saveDelivererToSheets(deliverer) {
        try {
            await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accion: 'guardarEntregador',
                    deliverer: deliverer
                })
            });
            
            console.log('✅ Entregador guardado');
        } catch (error) {
            console.error('❌ Error guardando entregador:', error);
            throw error;
        }
    }

    // ⭐ ELIMINAR PRODUCTO
    async deleteProductFromSheets(productId) {
        try {
            await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accion: 'eliminarProducto',
                    product_id: productId
                })
            });
            
            console.log('✅ Producto eliminado');
        } catch (error) {
            console.error('❌ Error eliminando producto:', error);
            throw error;
        }
    }

    // ⭐ ELIMINAR ENTREGADOR
    async deleteDelivererFromSheets(delivererId) {
        try {
            await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accion: 'eliminarEntregador',
                    deliverer_id: delivererId
                })
            });
            
            console.log('✅ Entregador eliminado');
        } catch (error) {
            console.error('❌ Error eliminando entregador:', error);
            throw error;
        }
    }
}

// ============================================
// EXPORTAR
// ============================================
window.GoogleSheets = new GoogleSheetsAPI();
console.log('🚀 google-sheets.js cargado (SIN OAuth)');

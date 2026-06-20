function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    // ⭐ Auto-refresh cada 10 segundos
    autoRefreshInterval = setInterval(async () => {
        try {
            if (window.GoogleSheets) {
                const sheetOrders = await window.GoogleSheets.getOrders();
                
                if (sheetOrders) {
                    const newOrders = sheetOrders.map(o => ({
                        ...o,
                        estado: o.estado === 'pendiente_pago' ? 'pendiente' : o.estado
                    }));
                    
                    // ⭐ Detectar cambios
                    if (newOrders.length !== orders.length) {
                        console.log(`🔄 Nuevo pedido detectado! (${orders.length} → ${newOrders.length})`);
                        orders = newOrders;
                        renderOrders();
                        updateStats();
                        showNotification('📦 ¡Nuevo pedido recibido!', 'success');
                    } else {
                        // ⭐ Verificar si algún pedido cambió de estado
                        let changed = false;
                        for (let i = 0; i < newOrders.length; i++) {
                            if (newOrders[i].estado !== orders[i]?.estado) {
                                changed = true;
                                break;
                            }
                        }
                        
                        if (changed) {
                            console.log('🔄 Cambios en pedidos detectados');
                            orders = newOrders;
                            renderOrders();
                            updateStats();
                        }
                    }
                }
            }
        } catch (e) { 
            console.error('Error auto-refresh:', e); 
        }
    }, 10000); // 10 segundos
    
    console.log('🔄 Auto-refresh activado (cada 10 segundos)');
}

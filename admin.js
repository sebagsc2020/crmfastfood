// ===== ESTADO ADMIN =====
let orders = [];
let deliverers = [];
let menuItems = [];
let currentTab = 'orders';
let isLoggedIn = false;

// ===== CREDENCIALES (hardcodeadas para demo) =====
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// ===== LOGIN =====
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const user = document.getElementById('loginUser')?.value;
    const pass = document.getElementById('loginPass')?.value;
    
    if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
        isLoggedIn = true;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'block';
        loadDashboardData();
        showNotification('✅ Bienvenido al panel de administración', 'success');
    } else {
        showNotification('❌ Usuario o contraseña incorrectos', 'error');
    }
});

// ===== LOGOUT =====
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    isLoggedIn = false;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
    showNotification('Sesión cerrada', 'info');
});

// ===== NAVEGACIÓN ENTRE TABS =====
document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', function() {
        const tab = this.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tab) {
    currentTab = tab;
    
    // Actualizar botones
    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}Tab`);
    });
    
    // Cargar datos según tab
    if (tab === 'orders') renderOrders();
    if (tab === 'deliverers') renderDeliverers();
    if (tab === 'menu') renderMenuAdmin();
    if (tab === 'stats') updateStats();
}

// ===== CARGAR DATOS =====
function loadDashboardData() {
    loadOrders();
    loadDeliverers();
    loadMenuItems();
}

function loadOrders() {
    // Cargar desde Google Sheets o localStorage
    const saved = localStorage.getItem('orders');
    orders = saved ? JSON.parse(saved) : generateMockOrders();
    renderOrders();
}

function loadDeliverers() {
    const saved = localStorage.getItem('deliverers');
    deliverers = saved ? JSON.parse(saved) : [
        { id: '1', nombre: 'Carlos Gómez', telefono: '11 2222-3333', vehiculo: 'Moto', disponible: true },
        { id: '2', nombre: 'María López', telefono: '11 4444-5555', vehiculo: 'Bicicleta', disponible: true }
    ];
    renderDeliverers();
}

function loadMenuItems() {
    const saved = localStorage.getItem('menuItems');
    menuItems = saved ? JSON.parse(saved) : PRODUCTOS;
    renderMenuAdmin();
}

// ===== GENERAR PEDIDOS DE EJEMPLO =====
function generateMockOrders() {
    return [
        {
            id: '1',
            fecha: new Date(Date.now() - 3600000 * 2).toISOString(),
            cliente: 'Juan Pérez',
            telefono: '11 1234-5678',
            tipo_entrega: 'Envío a domicilio',
            direccion: 'Av. Siempreviva 123',
            items: '2x Pizza Muzzarella, 1x Papas Fritas',
            total: 11000,
            pago: 'transferencia',
            notas: 'Sin cebolla',
            estado: 'pendiente',
            entregador: 'Sin asignar'
        },
        {
            id: '2',
            fecha: new Date(Date.now() - 3600000).toISOString(),
            cliente: 'Ana Martínez',
            telefono: '11 8765-4321',
            tipo_entrega: 'Retiro en local',
            direccion: 'Retira en local',
            items: '1x Hamburgesa Completa, 1x Salsa Barbacoa',
            total: 5300,
            pago: 'efectivo',
            notas: '',
            estado: 'en-preparacion',
            entregador: 'Sin asignar'
        },
        {
            id: '3',
            fecha: new Date(Date.now() - 1800000).toISOString(),
            cliente: 'Roberto Sánchez',
            telefono: '11 5555-6666',
            tipo_entrega: 'Envío a domicilio',
            direccion: 'Calle Falsa 456',
            items: '3x Empanadas de Carne, 1x Empanada de Jamón',
            total: 4800,
            pago: 'mercadoPago',
            notas: 'Con mucha salsa',
            estado: 'en-camino',
            entregador: 'Carlos Gómez'
        }
    ];
}

// ===== RENDERIZAR PEDIDOS (KANBAN) =====
function renderOrders() {
    const statuses = ['pendiente', 'en-preparacion', 'en-camino', 'entregado'];
    const statusLabels = {
        'pendiente': 'pendiente',
        'en-preparacion': 'preparacion',
        'en-camino': 'camino',
        'entregado': 'entregado'
    };
    
    statuses.forEach(status => {
        const container = document.getElementById(`col-${statusLabels[status]}`);
        const countEl = document.getElementById(`count-${statusLabels[status]}`);
        
        if (!container) return;
        
        const filtered = orders.filter(o => o.estado === status);
        
        if (countEl) countEl.textContent = filtered.length;
        
        container.innerHTML = filtered.length === 0 
            ? '<p style="text-align:center;color:#999;padding:1rem;">Sin pedidos</p>'
            : filtered.map(order => `
                <div class="order-card" data-id="${order.id}">
                    <div class="order-time">
                        <i class="far fa-clock"></i> ${new Date(order.fecha).toLocaleTimeString()}
                    </div>
                    <div class="order-customer">${order.cliente}</div>
                    <div class="order-detail">${order.items}</div>
                    <div class="order-address">
                        <i class="fas fa-map-marker-alt"></i> ${order.direccion}
                    </div>
                    <div class="order-total">$${order.total.toLocaleString()}</div>
                    <div style="font-size:0.8rem;color:#999;margin:0.3rem 0;">
                        ${order.entregador !== 'Sin asignar' ? `🛵 ${order.entregador}` : '📦 Sin entregador'}
                    </div>
                    <div class="order-actions">
                        <button class="btn-whatsapp" onclick="contactCustomer('${order.telefono}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        ${status !== 'entregado' && status !== 'cancelado' ? `
                            <button class="btn-status" onclick="changeOrderStatus('${order.id}')">
                                <i class="fas fa-arrow-right"></i> Avanzar
                            </button>
                            <button class="btn-assign" onclick="assignDeliverer('${order.id}')">
                                <i class="fas fa-motorcycle"></i> Asignar
                            </button>
                            <button class="btn-cancel" onclick="cancelOrder('${order.id}')">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
    });
}

// ===== CAMBIAR ESTADO DEL PEDIDO =====
function changeOrderStatus(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const statusFlow = {
        'pendiente': 'en-preparacion',
        'en-preparacion': 'en-camino',
        'en-camino': 'entregado'
    };
    
    const nextStatus = statusFlow[order.estado];
    if (!nextStatus) return;
    
    order.estado = nextStatus;
    saveOrders();
    renderOrders();
    showNotification(`✅ Pedido actualizado a: ${nextStatus}`, 'success');
}

// ===== ASIGNAR ENTREGADOR =====
function assignDeliverer(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Mostrar modal con lista de entregadores disponibles
    const available = deliverers.filter(d => d.disponible);
    if (available.length === 0) {
        showNotification('⚠️ No hay entregadores disponibles', 'warning');
        return;
    }
    
    // Por simplicidad, asignar el primero disponible
    order.entregador = available[0].nombre;
    order.estado = 'en-camino';
    saveOrders();
    renderOrders();
    showNotification(`✅ Pedido asignado a ${order.entregador}`, 'success');
}

// ===== CANCELAR PEDIDO =====
function cancelOrder(orderId) {
    if (!confirm('¿Estás seguro de cancelar este pedido?')) return;
    
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.estado = 'cancelado';
        saveOrders();
        renderOrders();
        showNotification('❌ Pedido cancelado', 'info');
    }
}

// ===== CONTACTAR POR WHATSAPP =====
function contactCustomer(phone) {
    const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
    window.open(`https://wa.me/54${cleanPhone}`, '_blank');
}

// ===== GUARDAR PEDIDOS =====
function saveOrders() {
    localStorage.setItem('orders', JSON.stringify(orders));
    // También guardar en Google Sheets
    syncOrdersWithSheets();
}

async function syncOrdersWithSheets() {
    // Implementar sincronización con Google Sheets
    console.log('Sincronizando con Google Sheets...');
}

// ===== RENDERIZAR ENTREGADORES =====
function renderDeliverers() {
    const container = document.getElementById('deliverersGrid');
    if (!container) return;
    
    container.innerHTML = deliverers.map(d => `
        <div class="deliverer-card">
            <h4>${d.nombre}</h4>
            <p><i class="fas fa-phone"></i> ${d.telefono}</p>
            <p><i class="fas fa-bicycle"></i> ${d.vehiculo}</p>
            <span class="status-badge ${d.disponible ? 'available' : 'unavailable'}">
                ${d.disponible ? '🟢 Disponible' : '🔴 No disponible'}
            </span>
            <div class="deliverer-actions">
                <button class="btn-edit" onclick="editDeliverer('${d.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="deleteDeliverer('${d.id}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
                <button class="btn-status" onclick="toggleDelivererStatus('${d.id}')">
                    <i class="fas fa-sync"></i> Cambiar
                </button>
            </div>
        </div>
    `).join('');
}

// ===== CRUD ENTREGADORES =====
function openDelivererModal(delivererId = null) {
    const modal = document.getElementById('delivererModal');
    const title = document.getElementById('delivererModalTitle');
    const form = document.getElementById('delivererForm');
    
    if (!modal || !title || !form) return;
    
    if (delivererId) {
        const d = deliverers.find(item => item.id === delivererId);
        if (d) {
            title.textContent = '✏️ Editar Entregador';
            document.getElementById('delivererId').value = d.id;
            document.getElementById('delivererName').value = d.nombre;
            document.getElementById('delivererPhone').value = d.telefono;
            document.getElementById('delivererVehicle').value = d.vehiculo;
            document.getElementById('delivererAvailable').value = d.disponible ? 'true' : 'false';
        }
    } else {
        title.textContent = '➕ Agregar Entregador';
        form.reset();
        document.getElementById('delivererId').value = '';
    }
    
    modal.classList.add('active');
}

function closeDelivererModal() {
    document.getElementById('delivererModal')?.classList.remove('active');
}

document.getElementById('delivererForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('delivererId').value;
    const nombre = document.getElementById('delivererName').value;
    const telefono = document.getElementById('delivererPhone').value;
    const vehiculo = document.getElementById('delivererVehicle').value;
    const disponible = document.getElementById('delivererAvailable').value === 'true';
    
    if (id) {
        // Editar
        const index = deliverers.findIndex(d => d.id === id);
        if (index !== -1) {
            deliverers[index] = { ...deliverers[index], nombre, telefono, vehiculo, disponible };
        }
    } else {
        // Agregar
        deliverers.push({
            id: Date.now().toString(),
            nombre,
            telefono,
            vehiculo,
            disponible
        });
    }
    
    localStorage.setItem('deliverers', JSON.stringify(deliverers));
    renderDeliverers();
    closeDelivererModal();
    showNotification('✅ Entregador guardado correctamente', 'success');
});

function editDeliverer(id) {
    openDelivererModal(id);
}

function deleteDeliverer(id) {
    if (!confirm('¿Eliminar este entregador?')) return;
    deliverers = deliverers.filter(d => d.id !== id);
    localStorage.setItem('deliverers', JSON.stringify(deliverers));
    renderDeliverers();
    showNotification('Entregador eliminado', 'info');
}

function toggleDelivererStatus(id) {
    const d = deliverers.find(item => item.id === id);
    if (d) {
        d.disponible = !d.disponible;
        localStorage.setItem('deliverers', JSON.stringify(deliverers));
        renderDeliverers();
        showNotification(`Estado actualizado: ${d.disponible ? 'Disponible' : 'No disponible'}`, 'info');
    }
}

// ===== RENDERIZAR MENÚ ADMIN =====
function renderMenuAdmin() {
    const container = document.getElementById('menuAdminGrid');
    if (!container) return;
    
    container.innerHTML = menuItems.map(item => `
        <div class="menu-admin-item">
            <img src="${item.imagen}" alt="${item.nombre}">
            <div class="info">
                <h4>${item.nombre}</h4>
                <p style="font-size:0.8rem;color:#999;">${item.descripcion}</p>
                <div class="price">$${item.precio.toLocaleString()}</div>
            </div>
            <div class="actions">
                <button class="btn-edit" onclick="editProduct(${item.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="deleteProduct(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ===== CRUD PRODUCTOS =====
function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    
    if (!modal || !title) return;
    
    if (productId) {
        const p = menuItems.find(item => item.id === productId);
        if (p) {
            title.textContent = '✏️ Editar Producto';
            document.getElementById('productId').value = p.id;
            document.getElementById('productName').value = p.nombre;
            document.getElementById('productDescription').value = p.descripcion;
            document.getElementById('productPrice').value = p.precio;
            document.getElementById('productImage').value = p.imagen;
            document.getElementById('productCategory').value = p.categoria;
        }
    } else {
        title.textContent = '➕ Agregar Producto';
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
    }
    
    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal')?.classList.remove('active');
}

document.getElementById('productForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('productId').value;
    const nombre = document.getElementById('productName').value;
    const descripcion = document.getElementById('productDescription').value;
    const precio = parseInt(document.getElementById('productPrice').value);
    const imagen = document.getElementById('productImage').value || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300';
    const categoria = document.getElementById('productCategory').value;
    
    if (id) {
        const index = menuItems.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            menuItems[index] = { ...menuItems[index], nombre, descripcion, precio, imagen, categoria };
        }
    } else {
        menuItems.push({
            id: Date.now(),
            nombre,
            descripcion,
            precio,
            imagen,
            categoria
        });
    }
    
    localStorage.setItem('menuItems', JSON.stringify(menuItems));
    renderMenuAdmin();
    closeProductModal();
    showNotification('✅ Producto guardado correctamente', 'success');
});

function editProduct(id) {
    openProductModal(id);
}

function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    menuItems = menuItems.filter(p => p.id !== id);
    localStorage.setItem('menuItems', JSON.stringify(menuItems));
    renderMenuAdmin();
    showNotification('Producto eliminado', 'info');
}

// ===== ESTADÍSTICAS =====
function updateStats() {
    const total = orders.length;
    const pending = orders.filter(o => o.estado === 'pendiente' || o.estado === 'en-preparacion' || o.estado === 'en-camino').length;
    const today = orders.filter(o => new Date(o.fecha).toDateString() === new Date().toDateString()).length;
    const revenue = orders.reduce((sum, o) => o.estado !== 'cancelado' ? sum + o.total : sum, 0);
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statToday').textContent = today;
    document.getElementById('statRevenue').textContent = `$${revenue.toLocaleString()}`;
}

// ===== NOTIFICACIONES (reusar la misma función de main.js) =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        background: ${type === 'success' ? '#2e7d32' : type === 'warning' ? '#f57c00' : type === 'error' ? '#c62828' : '#1976d2'};
        color: white;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideUp 0.3s;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.style.transition = 'all 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}
// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    SHEET_ID: '14xD_209wbWswASj3uFTBnTPC_NLf3_dKtDoIeP-Q3hE',
    API_KEY: 'AIzaSyAJgw0PQKO4qhby7mYDkopJPUXJBu79rGk',
    SHEETS_API: 'https://sheets.googleapis.com/v4/spreadsheets/'
};

// ⭐ URL DE GOOGLE APPS SCRIPT
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzno9_b1xIrGpBB5MZcXvH2XukxAx4inrG-3HIdM0ZSRsnxyR0YrzfQ_sUqibM_1rsWug/exec';

// ⭐ MODO SANDBOX
const MP_SANDBOX = true;

// ============================================
// DATOS DE PRODUCTOS (FALLBACK MÍNIMO - Solo si falla TODO)
// ============================================
const PRODUCTOS_FALLBACK = [
    { id: 1, nombre: 'Pizza Muzzarella', descripcion: 'Clásica con salsa, muzzarella y orégano', precio: 4500, imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300', categoria: 'pizzas', disponible: true },
    { id: 2, nombre: 'Pizza Especial', descripcion: 'Muzzarella, jamón, morrones y aceitunas', precio: 5200, imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300', categoria: 'pizzas', disponible: true },
    { id: 3, nombre: 'Hamburguesa Clásica', descripcion: 'Carne, lechuga, tomate y salsa especial', precio: 3800, imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300', categoria: 'hamburguesas', disponible: true },
    { id: 4, nombre: 'Empanada de Carne', descripcion: 'Carne cortada a cuchillo', precio: 1500, imagen: 'https://images.unsplash.com/photo-1625943553852-b2aa1393c3b5?w=300', categoria: 'empanadas', disponible: true }
];

// ============================================
// ESTADO GLOBAL
// ============================================
let cart = [];
let totalItems = 0;
let totalPrice = 0;
let productosActuales = [];
let categoriaActual = 'all';

// ============================================
// ⭐ CARGAR PRODUCTOS USANDO GET (SIN CORS ISSUES)
// ============================================
async function loadProductsFromSheets() {
    try {
        console.log('📦 Cargando productos desde Apps Script (GET)...');
        
        // ⭐ USAR GET EN LUGAR DE POST (evita problemas de CORS)
        const url = `${WEB_APP_URL}?accion=obtenerProductos`;
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors'
        });
        
        const data = await response.json();
        
        if (data.products && data.products.length > 0) {
            console.log(`✅ ${data.products.length} productos cargados desde Google Sheets`);
            console.log('📊 Productos:', data.products.map(p => p.nombre).join(', '));
            return data.products;
        } else {
            console.log('⚠️ No hay productos en Sheets');
        }
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
    }
    
    // Fallback: usar datos mínimos locales
    console.log('⚠️ Usando productos de fallback (mínimo)');
    return PRODUCTOS_FALLBACK;
}

// ============================================
// FUNCIÓN PARA ORDENAR PRODUCTOS
// ============================================
function sortProducts(products) {
    if (!products || products.length === 0) return [];
    
    const palabrasBebida = [
        'coca', 'sprite', 'fanta', 'agua', 'cerveza', 'vino',
        'gaseosa', 'jugo', 'pepsi', 'seven', 'schweppes',
        'fernet', 'ron', 'vodka', 'whisky', 'licor',
        'energizante', 'monster', 'red bull', 'speed',
        'latón', 'botella', 'vaso', 'copa', 'trago',
        'gancia', 'campari', 'cinzano', 'soda'
    ];
    
    const esBebida = (producto) => {
        const cat = (producto.categoria || '').toLowerCase().trim();
        const nom = (producto.nombre || '').toLowerCase();
        
        if (cat === 'bebidas' || cat === 'bebida' || cat === 'drinks') return true;
        return palabrasBebida.some(palabra => nom.includes(palabra));
    };
    
    const bebidas = products.filter(esBebida);
    const otros = products.filter(p => !esBebida(p));
    
    const comparar = (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
    otros.sort(comparar);
    bebidas.sort(comparar);
    
    return [...otros, ...bebidas];
}

// ============================================
// FUNCIÓN PARA FILTRAR POR CATEGORÍA
// ============================================
function filterCategory(category, element) {
    categoriaActual = category;
    
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    if (element) element.classList.add('active');
    
    renderMenu();
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
    const grid = document.getElementById('menuGrid');
    if (grid) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary);"></i>
                <p style="color: #999; margin-top: 1rem;">Cargando productos...</p>
            </div>
        `;
    }
    
    productosActuales = await loadProductsFromSheets();
    productosActuales = sortProducts(productosActuales);
    
    window.PRODUCTOS_ACTUALES = productosActuales;
    
    renderMenu();
    updateCartUI();
    setupEventListeners();
    
    console.log(`✅ ${productosActuales.length} productos disponibles (ordenados)`);
});

// ============================================
// RENDERIZAR MENÚ (CON STOCK DISPONIBLE/NO DISPONIBLE)
// ============================================
function renderMenu() {
    const grid = document.getElementById('menuGrid');
    if (!grid) {
        console.error('❌ No se encontró el elemento #menuGrid');
        return;
    }
    
    let items = window.PRODUCTOS_ACTUALES || PRODUCTOS_FALLBACK;
    items = sortProducts(items);
    
    if (categoriaActual && categoriaActual !== 'all') {
        items = items.filter(p => {
            const cat = (p.categoria || '').toLowerCase().trim();
            return cat === categoriaActual.toLowerCase();
        });
    }
    
    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc;"></i>
                <p style="color: #999; margin-top: 1rem;">No hay productos disponibles en esta categoría</p>
                <p style="color: #ccc; font-size: 0.9rem;">Probá con otra categoría o volvé más tarde</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = items.map(producto => {
        const isAvailable = producto.disponible !== false && 
                           producto.disponible !== 'false' && 
                           producto.disponible !== 'No';
        
        return `
            <div class="product-card ${!isAvailable ? 'unavailable' : ''}" 
                 data-id="${producto.id}" 
                 data-category="${producto.categoria || ''}">
                
                ${!isAvailable ? '<div class="unavailable-badge"><i class="fas fa-ban"></i> AGOTADO</div>' : ''}
                
                <img src="${producto.imagen || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300'}" 
                     alt="${producto.nombre}" 
                     class="product-image"
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300'">
                
                <div class="product-info">
                    <div class="product-name">${producto.nombre}</div>
                    <div class="product-description">${producto.descripcion || ''}</div>
                    <div class="product-price">$${parseInt(producto.precio).toLocaleString()}</div>
                    
                    ${isAvailable ? `
                        <div class="product-actions">
                            <div class="quantity-control">
                                <button class="quantity-btn" onclick="changeQuantity(${producto.id}, -1)">−</button>
                                <span class="quantity-display" id="qty-${producto.id}">0</span>
                                <button class="quantity-btn" onclick="changeQuantity(${producto.id}, 1)">+</button>
                            </div>
                            <button class="add-to-cart" onclick="addToCart(${producto.id})">
                                <i class="fas fa-plus"></i> Agregar
                            </button>
                        </div>
                    ` : `
                        <div class="unavailable-message">
                            <i class="fas fa-ban"></i> No disponible temporalmente
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// MANEJAR CANTIDADES
// ============================================
function changeQuantity(productId, delta) {
    const display = document.getElementById(`qty-${productId}`);
    if (!display) return;
    
    let current = parseInt(display.textContent) || 0;
    current = Math.max(0, current + delta);
    display.textContent = current;
}

// ============================================
// AGREGAR AL CARRITO
// ============================================
function addToCart(productId) {
    const display = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(display.textContent) || 0;
    
    if (quantity === 0) {
        showNotification('⚠️ Seleccioná una cantidad primero', 'warning');
        return;
    }
    
    const products = window.PRODUCTOS_ACTUALES || PRODUCTOS_FALLBACK;
    const product = products.find(p => parseInt(p.id) === parseInt(productId));
    
    if (!product) {
        showNotification('❌ Producto no encontrado', 'error');
        return;
    }
    
    const isAvailable = product.disponible !== false && 
                       product.disponible !== 'false' && 
                       product.disponible !== 'No';
    
    if (!isAvailable) {
        showNotification('❌ Este producto no está disponible', 'error');
        return;
    }
    
    const existing = cart.find(item => parseInt(item.id) === parseInt(productId));
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: parseInt(productId),
            ...product,
            quantity: quantity
        });
    }
    
    display.textContent = '0';
    updateCartUI();
    showNotification(`✅ ${quantity}x ${product.nombre} agregado al carrito`, 'success');
}

// ============================================
// ACTUALIZAR UI DEL CARRITO
// ============================================
function updateCartUI() {
    const count = document.getElementById('cartCount');
    const total = document.getElementById('cartTotal');
    const itemsContainer = document.getElementById('cartItems');
    
    if (!count || !total || !itemsContainer) return;
    
    totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    totalPrice = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
    
    count.textContent = totalItems;
    total.textContent = `$${totalPrice.toLocaleString()}`;
    
    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p class="empty-cart" style="color: #999; text-align: center; padding: 2rem 0;">Tu carrito está vacío</p>';
        return;
    }
    
    itemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.nombre}</div>
                <div class="cart-item-qty">${item.quantity}x $${item.precio.toLocaleString()}</div>
            </div>
            <div class="cart-item-price">$${(item.precio * item.quantity).toLocaleString()}</div>
            <button class="remove-item" onclick="removeFromCart(${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// ============================================
// ELIMINAR DEL CARRITO
// ============================================
function removeFromCart(productId) {
    cart = cart.filter(item => parseInt(item.id) !== parseInt(productId));
    updateCartUI();
    showNotification('🗑️ Producto eliminado del carrito', 'info');
}

// ============================================
// TOGGLE CARRITO
// ============================================
function toggleCart() {
    const overlay = document.getElementById('cartOverlay');
    const panel = document.querySelector('.cart-panel');
    
    if (!overlay || !panel) return;
    
    overlay.classList.toggle('active');
    panel.classList.toggle('open');
}

// ============================================
// ABRIR CHECKOUT
// ============================================
function openCheckout() {
    if (cart.length === 0) {
        showNotification('⚠️ Agregá productos al carrito primero', 'warning');
        return;
    }
    
    toggleCart();
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    
    const summary = document.getElementById('orderSummary');
    if (summary) {
        summary.innerHTML = cart.map(item => `
            <div class="order-item">
                <span>${item.quantity}x ${item.nombre}</span>
                <span>$${(item.precio * item.quantity).toLocaleString()}</span>
            </div>
        `).join('');
    }
    
    const totalDisplay = document.getElementById('modalTotal');
    if (totalDisplay) {
        totalDisplay.textContent = `$${totalPrice.toLocaleString()}`;
    }
    
    modal.classList.add('active');
}

// ============================================
// CERRAR CHECKOUT
// ============================================
function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// ENVIAR PEDIDO VIA APPS SCRIPT (POST con no-cors)
// ============================================
document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('customerName')?.value;
    const telefono = document.getElementById('customerPhone')?.value;
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
    const direccion = document.getElementById('deliveryAddress')?.value;
    const payment = document.querySelector('input[name="payment"]:checked')?.value;
    const notas = document.getElementById('orderNotes')?.value;
    
    if (!nombre || !telefono) {
        showNotification('⚠️ Completá tus datos de contacto', 'warning');
        return;
    }
    
    if (deliveryType === 'delivery' && !direccion) {
        showNotification('⚠️ Ingresá la dirección de entrega', 'warning');
        return;
    }
    
    const order = {
        id: 'order-' + Date.now(),
        fecha: new Date().toISOString(),
        cliente: nombre,
        telefono: telefono,
        tipo_entrega: deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en local',
        direccion: direccion || 'Retira en local',
        items: cart.map(item => `${item.quantity}x ${item.nombre}`).join(', '),
        total: totalPrice,
        pago: payment,
        notas: notas || '',
        estado: 'pendiente',
        entregador: 'Sin asignar'
    };
    
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accion: 'crearPedido',
                ...order
            })
        });
        
        showNotification('🎉 ¡Pedido confirmado! Lo recibirás en breve.', 'success');
        
        cart = [];
        updateCartUI();
        closeCheckout();
        e.target.reset();
        
    } catch (error) {
        console.error('Error al guardar pedido:', error);
        showNotification('❌ Error al procesar el pedido. Intentá de nuevo.', 'error');
    }
});

// ============================================
// VERIFICAR ESTADO DEL PAGO AL VOLVER DE MP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const collectionStatus = urlParams.get('collection_status');
    const externalReference = urlParams.get('external_reference');
    
    if (collectionStatus && externalReference) {
        handlePaymentReturn(collectionStatus, externalReference);
    }
});

function handlePaymentReturn(status, orderId) {
    const messages = {
        'approved': '✅ ¡Pago aprobado! Tu pedido está confirmado.',
        'pending': '⏳ Pago pendiente de aprobación. Te avisaremos cuando se confirme.',
        'rejected': '❌ Pago rechazado. Intentá con otro método de pago.'
    };
    
    const message = messages[status] || 'Estado de pago desconocido.';
    showNotification(message, status === 'approved' ? 'success' : status === 'pending' ? 'warning' : 'error');
    
    if (status === 'approved') {
        cart = [];
        updateCartUI();
        localStorage.removeItem('pendingOrder');
        
        const form = document.getElementById('orderForm');
        if (form) form.reset();
        
        closeCheckout();
    }
}

// ============================================
// NOTIFICACIONES
// ============================================
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

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    document.querySelectorAll('input[name="deliveryType"]').forEach(input => {
        input.addEventListener('change', function() {
            const addressField = document.getElementById('addressField');
            if (addressField) {
                addressField.style.display = this.value === 'delivery' ? 'block' : 'none';
            }
        });
    });
    
    document.getElementById('checkoutModal')?.addEventListener('click', function(e) {
        if (e.target === this) closeCheckout();
    });
    
    console.log('✅ Event listeners configurados');
}

console.log('🚀 main.js cargado correctamente');

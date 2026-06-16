// ===== CONFIGURACIÓN =====
const CONFIG = {
    SHEET_ID: '14xD_209wbWswASj3uFTBnTPC_NLf3_dKtDoIeP-Q3hE',
    API_KEY: 'AIzaSyAJgw0PQKO4qhby7mYDkopJPUXJBu79rGk',
    SHEETS_API: 'https://sheets.googleapis.com/v4/spreadsheets/'
};

// ===== DATOS DE PRODUCTOS (FALLBACK) =====
const PRODUCTOS = [
    {
        id: 1,
        nombre: 'Pizza Muzzarella',
        descripcion: 'Clásica con salsa, muzzarella y orégano',
        precio: 4500,
        imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300',
        categoria: 'pizzas'
    },
    {
        id: 2,
        nombre: 'Pizza Especial',
        descripcion: 'Muzzarella, jamón, morrones y aceitunas',
        precio: 5200,
        imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
        categoria: 'pizzas'
    },
    {
        id: 3,
        nombre: 'Hamburguesa Clásica',
        descripcion: 'Carne, lechuga, tomate y salsa especial',
        precio: 3800,
        imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
        categoria: 'hamburguesas'
    },
    {
        id: 4,
        nombre: 'Hamburguesa Completa',
        descripcion: 'Doble carne, cheddar, panceta y huevo',
        precio: 4800,
        imagen: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300',
        categoria: 'hamburguesas'
    },
    {
        id: 5,
        nombre: 'Lomito Completo',
        descripcion: 'Lomo, lechuga, tomate, huevo y jamón',
        precio: 5200,
        imagen: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=300',
        categoria: 'lomitos'
    },
    {
        id: 6,
        nombre: 'Empanada de Carne',
        descripcion: 'Carne cortada a cuchillo, huevo y aceitunas',
        precio: 1200,
        imagen: 'https://images.unsplash.com/photo-1625943553852-b2aa1393c3b5?w=300',
        categoria: 'empanadas'
    },
    {
        id: 7,
        nombre: 'Empanada de Jamón y Queso',
        descripcion: 'Jamón cocido y queso cremoso',
        precio: 1200,
        imagen: 'https://images.unsplash.com/photo-1625943553852-b2aa1393c3b5?w=300',
        categoria: 'empanadas'
    },
    {
        id: 8,
        nombre: 'Papas Fritas',
        descripcion: 'Papas cortadas, fritas y saladas',
        precio: 2000,
        imagen: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=300',
        categoria: 'papas'
    },
    {
        id: 9,
        nombre: 'Salsa de Ajo',
        descripcion: 'Aderezo cremoso con ajo y perejil',
        precio: 500,
        imagen: 'https://images.unsplash.com/photo-1702685662011-1d1a4ba2ee52?w=300',
        categoria: 'aderezos'
    },
    {
        id: 10,
        nombre: 'Salsa Barbacoa',
        descripcion: 'Barbacoa ahumada para tus platos',
        precio: 500,
        imagen: 'https://images.unsplash.com/photo-1702685662011-1d1a4ba2ee52?w=300',
        categoria: 'aderezos'
    }
];

// ===== ESTADO GLOBAL =====
let cart = [];
let totalItems = 0;
let totalPrice = 0;
let productosActuales = [];

// ============================================
// CARGAR PRODUCTOS DESDE GOOGLE SHEETS
// ============================================
async function loadProductsFromSheets() {
    try {
        console.log('📦 Cargando productos desde Google Sheets...');
        
        // Intentar obtener productos de Google Sheets
        if (window.GoogleSheets) {
            const sheetProducts = await window.GoogleSheets.getProductsFromSheets();
            
            if (sheetProducts && sheetProducts.length > 0) {
                console.log(`✅ ${sheetProducts.length} productos cargados desde Sheets`);
                return sheetProducts;
            } else {
                console.log('⚠️ No hay productos en Sheets, usando datos locales');
            }
        } else {
            console.warn('⚠️ GoogleSheets no disponible, usando datos locales');
        }
        
        // Si no hay datos en Sheets, usar los datos locales
        return PRODUCTOS;
        
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
        // Fallback a datos locales
        return PRODUCTOS;
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
    // Mostrar indicador de carga
    const grid = document.getElementById('menuGrid');
    if (grid) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary);"></i>
                <p style="color: #999; margin-top: 1rem;">Cargando productos...</p>
            </div>
        `;
    }
    
    // Cargar productos desde Google Sheets
    productosActuales = await loadProductsFromSheets();
    
    // Guardar en variable global para usar en otras funciones
    window.PRODUCTOS_ACTUALES = productosActuales;
    
    // Renderizar menú
    renderMenu();
    updateCartUI();
    setupEventListeners();
    
    console.log(`✅ ${productosActuales.length} productos disponibles`);
});

// ===== RENDERIZAR MENÚ =====
function renderMenu() {
    const grid = document.getElementById('menuGrid');
    if (!grid) {
        console.error('❌ No se encontró el elemento #menuGrid');
        return;
    }
    
    const items = window.PRODUCTOS_ACTUALES || PRODUCTOS;
    
    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc;"></i>
                <p style="color: #999; margin-top: 1rem;">No hay productos disponibles</p>
                <p style="color: #ccc; font-size: 0.9rem;">Agregá productos desde el panel de administración</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = items.map(producto => `
        <div class="product-card" data-id="${producto.id}">
            <img src="${producto.imagen || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300'}" 
                 alt="${producto.nombre}" 
                 class="product-image"
                 loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300'">
            <div class="product-info">
                <div class="product-name">${producto.nombre}</div>
                <div class="product-description">${producto.descripcion || ''}</div>
                <div class="product-price">$${parseInt(producto.precio).toLocaleString()}</div>
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
            </div>
        </div>
    `).join('');
}

// ===== MANEJAR CANTIDADES =====
function changeQuantity(productId, delta) {
    const display = document.getElementById(`qty-${productId}`);
    if (!display) return;
    
    let current = parseInt(display.textContent) || 0;
    current = Math.max(0, current + delta);
    display.textContent = current;
}

// ===== AGREGAR AL CARRITO =====
function addToCart(productId) {
    const display = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(display.textContent) || 0;
    
    if (quantity === 0) {
        showNotification('Seleccioná una cantidad primero', 'warning');
        return;
    }
    
    // Usar productos actuales (de Sheets o locales)
    const products = window.PRODUCTOS_ACTUALES || PRODUCTOS;
    const product = products.find(p => parseInt(p.id) === parseInt(productId));
    
    if (!product) {
        showNotification('❌ Producto no encontrado', 'error');
        return;
    }
    
    // Buscar si ya existe en el carrito
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

// ===== ACTUALIZAR UI DEL CARRITO =====
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
        itemsContainer.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
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

// ===== ELIMINAR DEL CARRITO =====
function removeFromCart(productId) {
    cart = cart.filter(item => parseInt(item.id) !== parseInt(productId));
    updateCartUI();
    showNotification('Producto eliminado del carrito', 'info');
}

// ===== TOGGLE CARRITO =====
function toggleCart() {
    const overlay = document.getElementById('cartOverlay');
    const panel = document.querySelector('.cart-panel');
    
    if (!overlay || !panel) return;
    
    overlay.classList.toggle('active');
    panel.classList.toggle('open');
}

// ===== ABRIR CHECKOUT =====
function openCheckout() {
    if (cart.length === 0) {
        showNotification('⚠️ Agregá productos al carrito primero', 'warning');
        return;
    }
    
    toggleCart();
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    
    // Cargar resumen del pedido
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

// ===== CERRAR CHECKOUT =====
function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.remove('active');
}

// ===== ENVIAR PEDIDO =====
document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('customerName')?.value;
    const telefono = document.getElementById('customerPhone')?.value;
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
    const direccion = document.getElementById('deliveryAddress')?.value;
    const payment = document.querySelector('input[name="payment"]:checked')?.value;
    const notas = document.getElementById('orderNotes')?.value;
    
    // Validar
    if (!nombre || !telefono) {
        showNotification('⚠️ Completá tus datos de contacto', 'warning');
        return;
    }
    
    if (deliveryType === 'delivery' && !direccion) {
        showNotification('⚠️ Ingresá la dirección de entrega', 'warning');
        return;
    }
    
    // Construir pedido
    const order = {
        id: Date.now().toString(),
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
        // Guardar en Google Sheets
        if (window.GoogleSheets) {
            await window.GoogleSheets.saveOrder(order);
            showNotification('🎉 Pedido confirmado! Se guardó en Google Sheets', 'success');
        } else {
            // Fallback: guardar localmente
            console.log('📦 Pedido guardado localmente:', order);
            showNotification('🎉 Pedido confirmado! (guardado localmente)', 'success');
        }
        
        // Limpiar carrito
        cart = [];
        updateCartUI();
        closeCheckout();
        
        // Resetear formulario
        e.target.reset();
        
    } catch (error) {
        console.error('Error al guardar pedido:', error);
        showNotification('❌ Error al procesar el pedido. Intentá de nuevo.', 'error');
    }
});

// ===== NOTIFICACIONES =====
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

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Cambio entre envío y retiro
    document.querySelectorAll('input[name="deliveryType"]').forEach(input => {
        input.addEventListener('change', function() {
            const addressField = document.getElementById('addressField');
            if (addressField) {
                addressField.style.display = this.value === 'delivery' ? 'block' : 'none';
            }
        });
    });
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('checkoutModal')?.addEventListener('click', function(e) {
        if (e.target === this) closeCheckout();
    });
    
    console.log('✅ Event listeners configurados');
}
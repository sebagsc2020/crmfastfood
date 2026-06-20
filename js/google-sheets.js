// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    SHEET_ID: '14xD_209wbWswASj3uFTBnTPC_NLf3_dKtDoIeP-Q3hE',
    API_KEY: 'AIzaSyAJgw0PQKO4qhby7mYDkopJPUXJBu79rGk',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};

// ============================================
// CLASE PRINCIPAL
// ============================================
class GoogleSheetsAPI {
    constructor() {
        this.token = null;
        this.client = null;
    }

    async authenticate() {
        return new Promise((resolve, reject) => {
            gapi.load('client:auth2', async () => {
                try {
                    await gapi.client.init({
                        apiKey: CONFIG.API_KEY,
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                        scope: CONFIG.SCOPES
                    });
                    
                    await gapi.auth2.getAuthInstance().signIn();
                    this.token = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
                    this.client = gapi.client;
                    console.log('✅ gapi.client inicializado');
                    resolve();
                } catch (error) {
                    console.error('❌ Error de autenticación:', error);
                    reject(error);
                }
            });
        });
    }

    async logout() {
        if (gapi.auth2) {
            await gapi.auth2.getAuthInstance().signOut();
        }
        this.token = null;
        this.client = null;
    }

    async getProductsFromSheets() {
        try {
            const response = await this.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Productos!A2:G'
            });
            
            const rows = response.result.values || [];
            return rows.map(row => ({
                id: row[0] || Date.now().toString(),
                nombre: row[1] || '',
                descripcion: row[2] || '',
                precio: parseFloat(row[3]) || 0,
                imagen: row[4] || '',
                categoria: row[5] || '',
                disponible: row[6] !== 'No' && row[6] !== 'false' && row[6] !== ''
            }));
        } catch (error) {
            console.error('Error obteniendo productos:', error);
            return [];
        }
    }

    async getDeliverersFromSheets() {
        try {
            const response = await this.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Entregadores!A2:E'
            });
            
            const rows = response.result.values || [];
            return rows.map(row => ({
                id: row[0] || Date.now().toString(),
                nombre: row[1] || '',
                telefono: row[2] || '',
                vehiculo: row[3] || '',
                disponible: row[4] === 'Sí' || row[4] === 'true' || row[4] === true
            }));
        } catch (error) {
            console.error('Error obteniendo entregadores:', error);
            return [];
        }
    }

    async getOrders() {
        try {
            const response = await this.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Pedidos!A2:L'
            });
            
            const rows = response.result.values || [];
            return rows.map(row => ({
                id: row[0] || '',
                fecha: row[1] || '',
                cliente: row[2] || '',
                telefono: row[3] || '',
                tipo_entrega: row[4] || '',
                direccion: row[5] || '',
                items: row[6] || '',
                total: parseFloat(row[7]) || 0,
                pago: row[8] || '',
                notas: row[9] || '',
                estado: row[10] || 'pendiente',
                entregador: row[11] || 'Sin asignar'
            })).reverse();
        } catch (error) {
            console.error('Error obteniendo pedidos:', error);
            return [];
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const response = await this.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Pedidos!A:A'
            });
            
            const rows = response.result.values || [];
            let rowIndex = -1;
            
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][0] === orderId) {
                    rowIndex = i + 2; // +2 porque A2 es la primera fila de datos
                    break;
                }
            }
            
            if (rowIndex > 0) {
                await this.client.sheets.spreadsheets.values.update({
                    spreadsheetId: CONFIG.SHEET_ID,
                    range: `Pedidos!K${rowIndex}`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[newStatus]]
                    }
                });
                console.log(`✅ Estado actualizado a: ${newStatus}`);
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            throw error;
        }
    }

    async saveProductToSheets(product) {
        try {
            const response = await this.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Productos!A:A'
            });
            
            const rows = response.result.values || [];
            let rowIndex = -1;
            
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][0] === product.id) {
                    rowIndex = i + 2;
                    break;
                }
            }
            
            const values = [
                product.id,
                product.nombre,
                product.descripcion || '',
                product.precio,
                product.imagen || '',
                product.categoria || '',
                product.disponible ? 'Sí' : 'No'
            ];
            
            if (rowIndex > 0) {
                await this.client.sheets.spreadsheets.values.update({
                    spreadsheetId: CONFIG.SHEET_ID,
                    range: `Productos!A${rowIndex}:G${rowIndex}`,
                    valueInputOption: 'RAW',
                    resource: { values: [values] }
                });
            } else {
                await this.client.sheets.spreadsheets.values.append({
                    spreadsheetId: CONFIG.SHEET_ID,
                    range: 'Productos!A:G',
                    valueInputOption: 'RAW',
                    insertDataOption: 'INSERT_ROWS',
                    resource: { values: [values] }
                });
            }
            
            console.log('✅ Producto guardado');
        } catch (error) {
            console.error('Error guardando producto:', error);
            throw error;
        }
    }

    async saveDelivererToSheets(deliverer) {
        try {
            const response = await this.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Entregadores!A:A'
            });
            
            const rows = response.result.values || [];
            let rowIndex = -1;
            
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][0] === deliverer.id) {
                    rowIndex = i + 2;
                    break;
                }
            }
            
            const values = [
                deliverer.id,
                deliverer.nombre,
                deliverer.telefono,
                deliverer.vehiculo || '',
                deliverer.disponible ? 'Sí' : 'No'
            ];
            
            if (rowIndex > 0) {
                await this.client.sheets.spreadsheets.values.update({
                    spreadsheetId: CONFIG.SHEET_ID,
                    range: `Entregadores!A${rowIndex}:E${rowIndex}`,
                    valueInputOption: 'RAW',
                    resource: { values: [values] }
                });
            } else {
                await this.client.sheets.spreadsheets.values.append({
                    spreadsheetId: CONFIG.SHEET_ID,
                    range: 'Entregadores!A:E',
                    valueInputOption: 'RAW',
                    insertDataOption: 'INSERT_ROWS',
                    resource: { values: [values] }
                });
            }
            
            console.log('✅ Entregador guardado');
        } catch (error) {
            console.error('Error guardando entregador:', error);
            throw error;
        }
    }

    async deleteProductFromSheets(productId) {
        try {
            const response = await this.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Productos!A:A'
            });
            
            const rows = response.result.values || [];
            let rowIndex = -1;
            
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][0] === productId) {
                    rowIndex = i + 1; // 0-based para batchUpdate
                    break;
                }
            }
            
            if (rowIndex > 0) {
                await this.client.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: CONFIG.SHEET_ID,
                    resource: {
                        requests: [{
                            deleteDimension: {
                                range: {
                                    sheetId: 0,
                                    dimension: 'ROWS',
                                    startIndex: rowIndex,
                                    endIndex: rowIndex + 1
                                }
                            }
                        }]
                    }
                });
                console.log('✅ Producto eliminado');
            }
        } catch (error) {
            console.error('Error eliminando producto:', error);
            throw error;
        }
    }

    async deleteDelivererFromSheets(delivererId) {
        try {
            const response = await this.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEET_ID,
                range: 'Entregadores!A:A'
            });
            
            const rows = response.result.values || [];
            let rowIndex = -1;
            
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][0] === delivererId) {
                    rowIndex = i + 1;
                    break;
                }
            }
            
            if (rowIndex > 0) {
                await this.client.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: CONFIG.SHEET_ID,
                    resource: {
                        requests: [{
                            deleteDimension: {
                                range: {
                                    sheetId: 1,
                                    dimension: 'ROWS',
                                    startIndex: rowIndex,
                                    endIndex: rowIndex + 1
                                }
                            }
                        }]
                    }
                });
                console.log('✅ Entregador eliminado');
            }
        } catch (error) {
            console.error('Error eliminando entregador:', error);
            throw error;
        }
    }
}

// ============================================
// EXPORTAR
// ============================================
window.GoogleSheets = new GoogleSheetsAPI();

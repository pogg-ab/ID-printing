const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    
    // Get current user for optional backend auth mapping
    let currentUser = null;
    try {
        const stored = localStorage.getItem('currentUser');
        if (stored) currentUser = JSON.parse(stored);
    } catch (e) {}

    // Set headers
    const headers = {
        'Accept': 'application/json',
        ...options.headers,
    };

    if (currentUser) {
        headers['X-User-Id'] = currentUser.id;
        headers['X-User-Role'] = currentUser.role;
    }

    // If body is not FormData, treat as JSON
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Request failed');
        }

        return response.json();
    } catch (error) {
        console.error(`API Error on ${path}:`, error);
        throw error;
    }
}

export const api = {
    organizations: {
        list: () => request('/organizations'),
        get: (id) => request(`/organizations/${id}`),
        create: (data) => request('/organizations', { method: 'POST', body: data }),
        update: (id, data) => request(`/organizations/${id}`, { method: 'PUT', body: data }),
        delete: (id) => request(`/organizations/${id}`, { method: 'DELETE' }),
        cardTypes: (id) => request(`/organizations/${id}/card-types`),
        createCardType: (id, data) => request(`/organizations/${id}/card-types`, { method: 'POST', body: data }),
        uploadLogo: (formData) => request('/organizations/upload-logo', { method: 'POST', body: formData }),
    },
    cardTypes: {
        update: (id, data) => request(`/card-types/${id}`, { method: 'PUT', body: data }),
        delete: (id) => request(`/card-types/${id}`, { method: 'DELETE' }),
    },
    templates: {
        list: (orgId) => request(`/templates${orgId ? `?organization_id=${orgId}` : ''}`),
        get: (id) => request(`/templates/${id}`),
        create: (data) => request('/templates', { method: 'POST', body: data }),
        update: (id, data) => request(`/templates/${id}`, { method: 'PUT', body: data }),
        delete: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
        saveElements: (id, elements) => request(`/templates/${id}/elements`, { method: 'POST', body: { elements } }),
        uploadBackground: (formData) => request('/templates/upload-background', { method: 'POST', body: formData }),
    },
    cardholders: {
        list: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/cardholders?${query}`);
        },
        get: (id) => request(`/cardholders/${id}`),
        create: (data) => request('/cardholders', { method: 'POST', body: data }),
        update: (id, data) => request(`/cardholders/${id}`, { method: 'PUT', body: data }),
        delete: (id) => request(`/cardholders/${id}`, { method: 'DELETE' }),
        uploadImage: (formData) => request('/cardholders/upload-image', { method: 'POST', body: formData }),
        bulkImport: (formData) => request('/cardholders/bulk-import', { method: 'POST', body: formData }),
    },
    batches: {
        list: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/print-batches?${query}`);
        },
        get: (id) => request(`/print-batches/${id}`),
        create: (data) => request('/print-batches', { method: 'POST', body: data }),
        updateStatus: (id, status) => request(`/print-batches/${id}/status`, { method: 'PUT', body: { status } }),
        delete: (id) => request(`/print-batches/${id}`, { method: 'DELETE' }),
    },
    reprints: {
        list: (status) => request(`/reprint-requests${status ? `?status=${status}` : ''}`),
        create: (cardholderId, reason, dateIssued = null, expiryDate = null) => 
            request('/reprint-requests', { 
                method: 'POST', 
                body: { 
                    cardholder_id: cardholderId, 
                    reason,
                    date_issued: dateIssued,
                    expiry_date: expiryDate
                } 
            }),
        approve: (id) => request(`/reprint-requests/${id}/approve`, { method: 'PUT' }),
        reject: (id) => request(`/reprint-requests/${id}/reject`, { method: 'PUT' }),
        markPrinted: (id) => request(`/reprint-requests/${id}/print`, { method: 'PUT' }),
    },
    deliveries: {
        list: () => request('/deliveries'),
        get: (id) => request(`/deliveries/${id}`),
        create: (data) => request('/deliveries', { method: 'POST', body: data }),
    },
    auditLogs: {
        list: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/audit-logs?${query}`);
        },
    },
    auth: {
        login: (email, password) => request('/login', { method: 'POST', body: { email, password } }),
    },
    users: {
        list: () => request('/users'),
        create: (data) => request('/users', { method: 'POST', body: data }),
        update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
        delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
        updatePermissions: (id, permissions) => request(`/users/${id}/permissions`, { method: 'PUT', body: { permissions } }),
        
        // Organization Assignments
        listOrganizations: (id) => request(`/users/${id}/organizations`),
        assignOrganization: (id, orgId, isActive = true) => 
            request(`/users/${id}/organizations`, { method: 'POST', body: { organization_id: orgId, is_active: isActive } }),
        removeOrganization: (id, orgId) => request(`/users/${id}/organizations/${orgId}`, { method: 'DELETE' }),
    },
};

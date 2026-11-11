import axios from "axios";
import { API_BASE_URL } from "./apiConfig.js";

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const addItem = async (itemData) => {
    return await axios.post(`${API_BASE_URL}/admin/items`, itemData, {
        headers: getAuthHeaders()
    });
};

export const deleteItem = async (itemId) => {
    return await axios.delete(`${API_BASE_URL}/admin/items/${itemId}`, {
        headers: getAuthHeaders()
    });
};

export const fetchItems = async () => {
    return await axios.get(`${API_BASE_URL}/items`, {
        headers: getAuthHeaders()
    });
};

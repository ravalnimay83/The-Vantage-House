import axios from "axios";
import { API_BASE_URL } from "./apiConfig.js";

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const createOrder = async (orderData) => {
    return await axios.post(`${API_BASE_URL}/orders`, orderData, {
        headers: getAuthHeaders()
    });
};

export const fetchOrders = async () => {
    return await axios.get(`${API_BASE_URL}/orders`, {
        headers: getAuthHeaders()
    });
};

export const fetchOrderById = async (orderId) => {
    return await axios.get(`${API_BASE_URL}/orders/${orderId}`, {
        headers: getAuthHeaders()
    });
};

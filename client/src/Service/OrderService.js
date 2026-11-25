import axios from "axios";
import { API_BASE_URL } from "./apiConfig.js";

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createOrder = async (orderData) => {
    return await axios.post(`${API_BASE_URL}/orders`, orderData, {
        headers: getAuthHeaders(),
    });
};

export const createRazorpayOrder = async (orderData) => {
    return await axios.post(`${API_BASE_URL}/orders/razorpay/create`, orderData, {
        headers: getAuthHeaders(),
    });
};

export const verifyRazorpayPayment = async (verifyData) => {
    return await axios.post(`${API_BASE_URL}/orders/razorpay/verify`, verifyData, {
        headers: getAuthHeaders(),
    });
};

export const updateOrderStatus = async (orderId, statusData) => {
    return await axios.patch(`${API_BASE_URL}/orders/${orderId}/status`, statusData, {
        headers: getAuthHeaders(),
    });
};

export const fetchOrders = async () => {
    return await axios.get(`${API_BASE_URL}/orders`, {
        headers: getAuthHeaders(),
    });
};

export const fetchMyOrders = async () => {
    return await axios.get(`${API_BASE_URL}/orders/my-orders`, {
        headers: getAuthHeaders(),
    });
};

export const fetchOrderById = async (orderId) => {
    return await axios.get(`${API_BASE_URL}/orders/${orderId}`, {
        headers: getAuthHeaders(),
    });
};

export const fetchServerCart = async () => {
    return await axios.get(`${API_BASE_URL}/cart`, {
        headers: getAuthHeaders(),
    });
};

export const syncServerCart = async (items) => {
    return await axios.put(`${API_BASE_URL}/cart`, items, {
        headers: getAuthHeaders(),
    });
};

export const clearServerCart = async () => {
    return await axios.delete(`${API_BASE_URL}/cart`, {
        headers: getAuthHeaders(),
    });
};

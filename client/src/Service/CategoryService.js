import axios from "axios";
import { API_BASE_URL } from "./apiConfig.js";

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const addCategory = async (categoryFormData) => {
    return await axios.post(`${API_BASE_URL}/admin/categories`, categoryFormData, {
        headers: getAuthHeaders(),
    });
};

export const updateCategory = async (categoryId, categoryFormData) => {
    return await axios.put(`${API_BASE_URL}/admin/categories/${categoryId}`, categoryFormData, {
        headers: getAuthHeaders(),
    });
};

export const deleteCategory = async (categoryId) => {
    return await axios.delete(`${API_BASE_URL}/admin/categories/${categoryId}`, {
        headers: getAuthHeaders(),
    });
};

export const fetchCategory = async () => {
    return await axios.get(`${API_BASE_URL}/categories`, {
        headers: getAuthHeaders(),
    });
};

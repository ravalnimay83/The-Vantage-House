import axios from "axios";
import { API_BASE_URL } from "./apiConfig.js";

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const checkIdentifier = async (identifier) => {
    return await axios.post(`${API_BASE_URL}/auth/check-identifier`, { identifier });
};

export const login = async (data) => {
    return await axios.post(`${API_BASE_URL}/login`, data);
};

export const register = async (data) => {
    return await axios.post(`${API_BASE_URL}/register`, data);
};

export const sendSignupOtp = async ({ email, phoneNumber }) => {
    return await axios.post(`${API_BASE_URL}/auth/send-signup-otp`, { email, phoneNumber });
};

export const verifySignupOtp = async ({ name, email, phoneNumber, password, code }) => {
    return await axios.post(`${API_BASE_URL}/auth/verify-signup-otp`, {
        name,
        email,
        phoneNumber,
        password,
        code,
    });
};

export const googleLogin = async (payload) => {
    return await axios.post(`${API_BASE_URL}/auth/google`, payload);
};

export const setSpareKey = async ({ password, confirmPassword }) => {
    return await axios.post(
        `${API_BASE_URL}/auth/set-spare-key`,
        { password, confirmPassword },
        { headers: getAuthHeaders() }
    );
};

export const sendForgotPasswordCode = async (email) => {
    return await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
};

export const verifyResetCode = async (email, code) => {
    return await axios.post(`${API_BASE_URL}/auth/verify-reset-code`, { email, code });
};

export const resetPassword = async ({ email, code, newPassword, confirmPassword }) => {
    return await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email,
        code,
        newPassword,
        confirmPassword,
    });
};

export const fetchProfile = async () => {
    return await axios.get(`${API_BASE_URL}/profile`, {
        headers: getAuthHeaders(),
    });
};

export const updateProfile = async (data) => {
    return await axios.put(`${API_BASE_URL}/profile`, data, {
        headers: getAuthHeaders(),
    });
};

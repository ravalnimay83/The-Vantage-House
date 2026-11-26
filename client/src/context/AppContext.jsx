import { AppContext } from "./AppContextDefinition";
import { useEffect, useState, useCallback, useRef } from "react";
import { fetchCategory } from "../Service/CategoryService.js";
import { fetchItems } from "../Service/ItemService.js";
import { fetchProfile } from "../Service/AuthService.js";
import { fetchServerCart, syncServerCart, clearServerCart } from "../Service/OrderService.js";

const EMPTY_AUTH = {
    token: null,
    role: null,
    email: null,
    name: null,
    userId: null,
    phoneNumber: null,
    provider: null,
    avatarUrl: null,
    passwordSet: true,
    xp: 0,
};

const getStoredAuth = () => {
    const token = localStorage.getItem("token");
    if (!token) return EMPTY_AUTH;
    try {
        const storedUser = localStorage.getItem("bizbill_user");
        const parsed = storedUser ? JSON.parse(storedUser) : {};
        return {
            ...EMPTY_AUTH,
            ...parsed,
            token,
            role: parsed.role || localStorage.getItem("role") || null,
            email: parsed.email || localStorage.getItem("email") || null,
        };
    } catch {
        return {
            ...EMPTY_AUTH,
            token,
            role: localStorage.getItem("role") || null,
            email: localStorage.getItem("email") || null,
        };
    }
};

const getStoredJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

export const AppContextProvider = (props) => {
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [auth, setAuth] = useState(getStoredAuth);
    const [cart, setCart] = useState(() => getStoredJson("bizbill_cart", []));
    const [wishlist, setWishlist] = useState(() => getStoredJson("bizbill_wishlist", []));
    const cartHydratedRef = useRef(false);

    const loadCatalogData = useCallback(async () => {
        try {
            const [catRes, itemsRes] = await Promise.allSettled([
                fetchCategory(),
                fetchItems(),
            ]);

            if (catRes.status === "fulfilled" && Array.isArray(catRes.value.data)) {
                setCategories(catRes.value.data);
            }
            if (itemsRes.status === "fulfilled" && Array.isArray(itemsRes.value.data)) {
                setItems(itemsRes.value.data);
            }
        } catch (error) {
            console.error("Failed to load catalog data:", error);
        }
    }, []);

    useEffect(() => {
        loadCatalogData();
    }, [loadCatalogData]);

    // Sync profile on startup if logged in (skip while pendingGoogle spare-key setup)
    useEffect(() => {
        if (!auth.token || auth.passwordSet === false) return;
        fetchProfile()
            .then((res) => {
                if (res.data) {
                    setAuth((prev) => {
                        const updated = { ...prev, ...res.data, token: prev.token };
                        localStorage.setItem("bizbill_user", JSON.stringify(updated));
                        return updated;
                    });
                }
            })
            .catch((err) => {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    logout();
                }
            });
    }, [auth.token]);

    useEffect(() => {
        localStorage.setItem("bizbill_cart", JSON.stringify(cart));
        if (auth.token && auth.passwordSet !== false && cartHydratedRef.current) {
            syncServerCart(cart).catch(() => {});
        }
    }, [cart, auth.token, auth.passwordSet]);

    // Load & merge saved cart from user's account on login/startup
    useEffect(() => {
        if (!auth.token || auth.passwordSet === false) {
            cartHydratedRef.current = false;
            return;
        }
        let cancelled = false;
        fetchServerCart()
            .then((res) => {
                if (cancelled) return;
                const serverItems = Array.isArray(res.data) ? res.data : [];
                setCart((localItems) => {
                    if (serverItems.length === 0 && localItems.length > 0) {
                        syncServerCart(localItems).catch(() => {});
                        return localItems;
                    }
                    if (localItems.length === 0) {
                        return serverItems;
                    }
                    const merged = [...serverItems];
                    for (const li of localItems) {
                        const liSize = li.size || "M";
                        const idx = merged.findIndex(
                            (si) => si.itemId === li.itemId && (si.size || "M") === liSize
                        );
                        if (idx > -1) {
                            merged[idx] = {
                                ...merged[idx],
                                quantity: Math.max(merged[idx].quantity || 1, li.quantity || 1),
                            };
                        } else {
                            merged.push({ ...li, size: liSize });
                        }
                    }
                    syncServerCart(merged).catch(() => {});
                    return merged;
                });
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) cartHydratedRef.current = true;
            });
        return () => {
            cancelled = true;
        };
    }, [auth.token]);

    useEffect(() => {
        localStorage.setItem("bizbill_wishlist", JSON.stringify(wishlist));
    }, [wishlist]);

    const setAuthData = (authPayloadOrToken, roleArg, emailArg) => {
        let nextAuth;
        if (typeof authPayloadOrToken === "object" && authPayloadOrToken !== null) {
            nextAuth = { ...EMPTY_AUTH, ...authPayloadOrToken };
        } else {
            nextAuth = {
                ...EMPTY_AUTH,
                token: authPayloadOrToken || null,
                role: roleArg || null,
                email: emailArg || null,
            };
        }

        if (nextAuth.token) {
            localStorage.setItem("token", nextAuth.token);
            if (nextAuth.role) localStorage.setItem("role", nextAuth.role);
            if (nextAuth.email) localStorage.setItem("email", nextAuth.email);
            localStorage.setItem("bizbill_user", JSON.stringify(nextAuth));
        }
        setAuth(nextAuth);
    };

    const updateUserProfile = (profileData) => {
        setAuth((prev) => {
            const updated = { ...prev, ...profileData, token: prev.token };
            if (updated.email) localStorage.setItem("email", updated.email);
            localStorage.setItem("bizbill_user", JSON.stringify(updated));
            return updated;
        });
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        localStorage.removeItem("bizbill_user");
        setAuth(EMPTY_AUTH);
    };

    const addToCart = (item, qty = 1, size = "M") => {
        const chosenSize = size || item.size || "M";
        setCart((prevCart) => {
            const existingIndex = prevCart.findIndex(
                (ci) => ci.itemId === item.itemId && (ci.size || "M") === chosenSize
            );
            if (existingIndex > -1) {
                const updated = [...prevCart];
                const maxStock = item.stock != null ? Number(item.stock) : updated[existingIndex].stock;
                const nextQty = updated[existingIndex].quantity + qty;
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: maxStock != null ? Math.min(nextQty, maxStock) : nextQty,
                    stock: maxStock,
                };
                return updated;
            }
            return [
                ...prevCart,
                {
                    itemId: item.itemId,
                    name: item.name,
                    price: Number(item.price || 0),
                    quantity: qty,
                    size: chosenSize,
                    color: item.color || "Classic",
                    imageUrl: item.imageUrl || item.imgUrl,
                    categoryName: item.categoryName,
                    stock: item.stock != null ? Number(item.stock) : undefined,
                },
            ];
        });
    };

    const updateCartQuantity = (itemId, delta, size) => {
        setCart((prevCart) =>
            prevCart
                .map((item) => {
                    const matchesSize = size ? (item.size || "M") === size : true;
                    if (item.itemId === itemId && matchesSize) {
                        const newQty = item.quantity + delta;
                        if (newQty <= 0) return null;
                        if (item.stock != null && newQty > item.stock) {
                            return { ...item, quantity: item.stock };
                        }
                        return { ...item, quantity: newQty };
                    }
                    return item;
                })
                .filter(Boolean)
        );
    };

    const removeFromCart = (itemId, size) => {
        setCart((prevCart) =>
            prevCart.filter((item) => {
                if (item.itemId !== itemId) return true;
                if (size && (item.size || "M") !== size) return true;
                return false;
            })
        );
    };

    const restoreCartItem = (item) => {
        if (!item) return;
        addToCart(item, item.quantity || 1, item.size || "M");
    };

    const clearCart = () => {
        setCart([]);
        if (auth.token) {
            clearServerCart().catch(() => {});
        }
    };

    const toggleWishlist = (itemId) => {
        setWishlist((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
        );
    };

    const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const contextValue = {
        categories,
        setCategories,
        items,
        setItems,
        reloadCatalog: loadCatalogData,
        auth,
        setAuthData,
        updateUserProfile,
        logout,
        cart,
        setCart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        restoreCartItem,
        clearCart,
        cartCount,
        wishlist,
        toggleWishlist,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {props.children}
        </AppContext.Provider>
    );
};

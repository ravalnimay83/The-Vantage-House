import Menubar from "./components/menubar/Menubar.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import ManageCategory from "./pages/ManageCategory/ManageCategory.jsx";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ManageUsers from "./pages/ManageUsers/ManageUsers.jsx";
import ManageItems from "./pages/ManageItems/ManageItems.jsx";
import Explore from "./pages/Explore/Explore.jsx";
import Products from "./pages/Products/Products.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import AdminRoute from "./components/Auth/AdminRoute.jsx";
import CreateSpareKey from "./pages/Login/CreateSpareKey.jsx";
import CreateAccount from "./pages/Login/CreateAccount.jsx";
import SplashScreen from "./components/Splash/SplashScreen.jsx";
import InstallAppPrompt from "./components/InstallPrompt/InstallAppPrompt.jsx";
import RememberMePrompt from "./components/Auth/RememberMePrompt.jsx";
import VantageAiDrawer from "./components/VantageAi/VantageAiDrawer.jsx";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login/Login.jsx";
import { useContext, useEffect } from "react";
import { AppContext } from "./context/AppContextDefinition.js";
import { assets } from "./assets/assets.js";

const App = () => {
    const location = useLocation();
    const { auth } = useContext(AppContext);

    useEffect(() => {
        const critical = [
            assets.monogram,
            assets.homeTopTextLogo,
            assets.appLogo,
            assets.pixieIcon,
            assets.pixieSticker,
            assets.pixieSignInRequired,
        ];
        critical.forEach((src) => {
            if (!src) return;
            const img = new Image();
            img.src = src;
            img.decode?.().catch(() => {});
        });
    }, []);

    const needsSpareKey = Boolean(auth?.token && auth?.passwordSet === false);

    // Mandatory guard: Google users who haven't set a spare key cannot access any other page
    if (needsSpareKey && location.pathname !== "/create-spare-key") {
        return <Navigate to="/create-spare-key" replace />;
    }

    const hideNavbar =
        location.pathname === "/login" ||
        location.pathname === "/signup" ||
        location.pathname === "/create-spare-key";

    return (
        <div>
            <SplashScreen />
            <RememberMePrompt />
            <InstallAppPrompt auth={auth} />
            <VantageAiDrawer />
            {!hideNavbar && <Menubar />}
            <Toaster position="top-right" />
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/create-spare-key" element={<CreateSpareKey />} />
                <Route
                    path="/category"
                    element={
                        <AdminRoute>
                            <ManageCategory />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/items"
                    element={
                        <AdminRoute>
                            <ManageItems />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/users"
                    element={
                        <AdminRoute>
                            <ManageUsers />
                        </AdminRoute>
                    }
                />
                <Route path="/login" element={<Login initialMode="identifier" />} />
                <Route path="/signup" element={<CreateAccount />} />
            </Routes>
        </div>
    );
};

export default App;

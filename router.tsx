import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { CustomerHome } from '../customer/pages/CustomerHome';
import { CustomerDashboard } from '../customer/pages/CustomerDashboard';
import { ProfilePage } from '../customer/pages/ProfilePage';
import { ShopPage } from '../customer/pages/ShopPage';
import { CenterProfilePage } from '../customer/pages/CenterProfilePage';
import { BusinessDashboard } from '../business/pages/BusinessDashboard';
import { AdminDashboard } from '../super-admin/pages/AdminDashboard';
import { SuperAdminLogin } from '../super-admin/pages/SuperAdminLogin';
import { AuthForm } from '../shared/components/AuthForm';
import { ForgotPassword } from '../shared/pages/ForgotPassword';
import { Terms } from '../shared/pages/Terms';
import { ContactPage } from '../shared/pages/ContactPage';
import { ResetPassword } from '../shared/pages/ResetPassword';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export const AppRouter: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const [audience, setAudience] = React.useState<'INDIVIDUALS' | 'BUSINESSES'>('INDIVIDUALS');

  // Mock state for dashboards (normally this would be in a global store or fetched)
  const [offers, setOffers] = React.useState([]);
  const [branches, setBranches] = React.useState([
    { id: 1, name: 'Main Branch - Riyadh', address: 'Al Olaya St', commercialRegistration: '1010000000', mapLink: 'https://maps.google.com/?q=Al+Olaya+St+Riyadh', branchNumber: '001', isMain: true },
    { id: 2, name: 'North Branch - Riyadh', address: 'King Fahd Rd', commercialRegistration: '1010000001', mapLink: 'https://maps.google.com/?q=King+Fahd+Rd+Riyadh', branchNumber: '002', isMain: false },
  ]);
  const [giftCards, setGiftCards] = React.useState([]);
  const [plans, setPlans] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [purchases, setPurchases] = React.useState([]);
  const [activeSubView, setActiveSubView] = React.useState('main');

  const setNotification = (notif: any) => {
    console.log('Notification:', notif);
    // In a real app, this would trigger a toast
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <RootLayout audience={audience} setAudience={setAudience}>
            <CustomerHome audience={audience} setAudience={setAudience} />
          </RootLayout>
        } />

        <Route path="/login" element={<AuthForm audience={audience} />} />

        <Route path="/admin/login" element={<SuperAdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/terms" element={
          <RootLayout audience={audience} setAudience={setAudience}>
            <Terms />
          </RootLayout>
        } />

        <Route path="/contact" element={
          <RootLayout audience={audience} setAudience={setAudience}>
            <ContactPage />
          </RootLayout>
        } />

        <Route path="/shop/:shopId" element={
          <RootLayout audience="INDIVIDUALS" setAudience={() => {}}>
            <ShopPage t={t} lang={lang} isRtl={isRtl} />
          </RootLayout>
        } />

        <Route path="/center/:centerId" element={
          <CenterProfilePage />
        } />

        <Route path="/center/:centerId/services" element={
          <RootLayout audience="INDIVIDUALS" setAudience={() => {}}>
            <ShopPage t={t} lang={lang} isRtl={isRtl} />
          </RootLayout>
        } />

        <Route path="/shop/:shopId/dashboard" element={
          isAuthenticated ? (
            user?.role === 'CUSTOMER' ? (
              <CustomerDashboard />
            ) : (
              <Navigate to="/" />
            )
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/profile" element={
          isAuthenticated ? (
            user?.role === 'CUSTOMER' ? (
              <ProfilePage />
            ) : (
              <Navigate to="/" />
            )
          ) : (
            <Navigate to="/login" />
          )
        } />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={
          isAuthenticated ? (
            user?.role === 'CUSTOMER' ? (
              <CustomerDashboard />
            ) : user?.role === 'SUPER_ADMIN' ? (
              <DashboardLayout activeSubView={activeSubView} setActiveSubView={setActiveSubView}>
                <AdminDashboard 
                  activeView={activeSubView as any} 
                  setActiveView={setActiveSubView as any}
                  t={t} lang={lang} isRtl={isRtl} 
                />
              </DashboardLayout>
            ) : (
              <DashboardLayout activeSubView={activeSubView} setActiveSubView={setActiveSubView}>
                {(user?.role === 'BUSINESS_OWNER' || user?.role === 'ADMIN') && (
                  <BusinessDashboard 
                    offers={offers} setOffers={setOffers}
                    branches={branches} setBranches={setBranches}
                    giftCards={giftCards} setGiftCards={setGiftCards}
                    plans={plans} setPlans={setPlans}
                    services={services} setServices={setServices}
                    purchases={purchases} setPurchases={setPurchases}
                    activeSubView={activeSubView} setActiveSubView={setActiveSubView}
                    t={t} lang={lang} isRtl={isRtl}
                    setNotification={setNotification}
                  />
                )}
              </DashboardLayout>
            )
          ) : (
            <Navigate to="/login" />
          )
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

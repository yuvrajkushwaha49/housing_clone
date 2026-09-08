import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, markInitialized, syncAuthFromStorage } from './redux/slices/authSlice';
import { setTheme } from './redux/slices/uiSlice';
import { installButtonDisableOnClick } from './utils/buttonDisableOnClick';
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import PanelLayout from './layouts/PanelLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OtpLoginPage from './pages/auth/OtpLoginPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import VerifyEmailPendingPage from './pages/auth/VerifyEmailPendingPage';
import AccountPendingPage from './pages/auth/AccountPendingPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import BuyerDashboardPage from './pages/buyer/BuyerDashboardPage';
import UsersPage from './pages/super-admin/UsersPage';
import UserDetailPage from './pages/super-admin/UserDetailPage';
import RolesPage from './pages/super-admin/RolesPage';
import PermissionsPage from './pages/super-admin/PermissionsPage';
import LocationsPage from './pages/super-admin/LocationsPage';
import AmenitiesPage from './pages/super-admin/AmenitiesPage';
import CategoriesPage from './pages/super-admin/CategoriesPage';
import PropertiesListPage from './pages/properties/PropertiesListPage';
import PropertyFormPage from './pages/properties/PropertyFormPage';
import PropertySearchPage from './pages/public/PropertySearchPage';
import PropertyDetailPage from './pages/public/PropertyDetailPage';
import SavedPropertiesPage from './pages/buyer/SavedPropertiesPage';
import LeadsPage from './pages/leads/LeadsPage';
import InquiriesPage from './pages/leads/InquiriesPage';
import VisitsPage from './pages/leads/VisitsPage';
import PropertyApprovalPage from './pages/admin/PropertyApprovalPage';
import PropertyApprovalReviewPage from './pages/properties/PropertyApprovalReviewPage';
import ChatPage from './pages/chat/ChatPage';
import MyReviewsPage from './pages/reviews/MyReviewsPage';
import ReviewsModerationPage from './pages/reviews/ReviewsModerationPage';
import TicketsPage from './pages/support/TicketsPage';
import TicketDetailPage from './pages/support/TicketDetailPage';
import FaqPage from './pages/support/FaqPage';
import ComplaintsPage from './pages/support/ComplaintsPage';
import SubscriptionPage from './pages/subscriptions/SubscriptionPage';
import AdminSubscriptionsPage from './pages/subscriptions/AdminSubscriptionsPage';
import AdvertisementsPage from './pages/ads/AdvertisementsPage';
import CmsAdminPage from './pages/cms/CmsAdminPage';
import ReportsPage from './pages/reports/ReportsPage';
import PropertyReportsPage from './pages/reports/PropertyReportsPage';
import LoanCalculatorPage from './pages/buyer/LoanCalculatorPage';
import PublicCmsPage from './pages/public/PublicCmsPage';
import {
  BlogDetailPage,
  BlogListPage,
  NewsDetailPage,
  NewsListPage,
} from './pages/public/BlogNewsPages';
import ProjectsListPage from './pages/projects/ProjectsListPage';
import ProjectApprovalPage from './pages/projects/ProjectApprovalPage';
import ProjectFormPage from './pages/projects/ProjectFormPage';
import ProjectManagePage from './pages/projects/ProjectManagePage';
import ProjectTowerFormPage from './pages/projects/ProjectTowerFormPage';
import ProjectBuildingFormPage from './pages/projects/ProjectBuildingFormPage';
import BuilderTeamPage from './pages/projects/BuilderTeamPage';
import BookingsPage from './pages/projects/BookingsPage';
import PublicProjectPage from './pages/public/PublicProjectPage';
import PublicProjectsPage from './pages/public/PublicProjectsPage';
import ComingSoonPage from './pages/public/ComingSoonPage';
import RoleProfilePage from './pages/profiles/RoleProfilePage';
import BuyerProfilePage from './pages/profiles/BuyerProfilePage';
import BuilderProfilePage from './pages/projects/BuilderProfilePage';
import BuilderProfileEditPage from './pages/projects/BuilderProfileEditPage';
import BuilderProfileReviewPage from './pages/super-admin/BuilderProfileReviewPage';
import VerificationQueuePage from './pages/profiles/VerificationQueuePage';
import ComparePage from './pages/buyer/ComparePage';
import AccountSettingsPage from './pages/settings/AccountSettingsPage';
import AppSettingsPage from './pages/settings/AppSettingsPage';
import { ROLE_CODES } from './constants';
import { disconnectSocket, updateSocketAuth } from './services/socket';
import { ToastProvider } from './contexts/ToastContext';
import { HomeLocationsProvider } from './contexts/HomeLocationsContext';

function AppRoutes() {
  const dispatch = useDispatch();
  const { accessToken, initialized } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);

  useEffect(() => {
    dispatch(setTheme(theme));
  }, [dispatch, theme]);

  useEffect(() => {
    if (accessToken && !initialized) {
      dispatch(fetchMe());
    } else if (!accessToken && !initialized) {
      dispatch(markInitialized());
    }
  }, [accessToken, initialized, dispatch]);

  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        dispatch(syncAuthFromStorage());
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [dispatch]);

  useEffect(() => {
    if (accessToken) {
      updateSocketAuth(accessToken);
    } else {
      disconnectSocket();
    }
  }, [accessToken]);

  const renderAdminPropertyRoutes = () => (
    <Route path="properties">
      <Route index element={<PropertiesListPage mode="admin" />} />
      <Route path="new" element={<PropertyFormPage />} />
      <Route path=":uuid/review" element={<PropertyApprovalReviewPage />} />
      <Route path=":uuid/edit" element={<PropertyFormPage />} />
    </Route>
  );

  const renderListerPropertyRoutes = () => (
    <Route path="properties">
      <Route index element={<PropertiesListPage mode="mine" />} />
      <Route path="new" element={<PropertyFormPage />} />
      <Route path=":uuid/edit" element={<PropertyFormPage />} />
    </Route>
  );

  const renderLeadRoutes = () => (
    <>
      <Route path="leads" element={<LeadsPage />} />
      <Route path="inquiries" element={<InquiriesPage />} />
      <Route path="visits" element={<VisitsPage />} />
    </>
  );

  const renderEngagementRoutes = ({ staffTickets = false, moderateReviews = false, manageFaq = false } = {}) => (
    <>
      <Route path="chat" element={<ChatPage />} />
      <Route path="tickets">
        <Route index element={<TicketsPage staff={staffTickets} />} />
        <Route path=":uuid" element={<TicketDetailPage />} />
      </Route>
      <Route path="faq" element={<FaqPage manage={manageFaq} />} />
      {moderateReviews && <Route path="reviews" element={<ReviewsModerationPage />} />}
      {staffTickets && <Route path="complaints" element={<ComplaintsPage staff />} />}
      <Route path="settings" element={<AccountSettingsPage />} />
    </>
  );

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<PropertySearchPage />} />
      <Route path="/property/:slug" element={<PropertyDetailPage />} />
      <Route path="/page/:slug" element={<PublicCmsPage />} />
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogDetailPage />} />
      <Route path="/news" element={<NewsListPage />} />
      <Route path="/news/:slug" element={<NewsDetailPage />} />
      <Route path="/projects" element={<PublicProjectsPage />} />
      <Route path="/project/:slug" element={<PublicProjectPage />} />

      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login/otp" element={<OtpLoginPage />} />
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-email/pending" element={<VerifyEmailPendingPage />} />
        <Route path="/account-pending" element={<AccountPendingPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={[ROLE_CODES.SUPER_ADMIN]} />}>
        <Route path="/panel/super-admin" element={<PanelLayout title="Super Admin" breadcrumbs={['Super Admin']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:uuid" element={<UserDetailPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="amenities" element={<AmenitiesPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          {renderAdminPropertyRoutes()}
          <Route path="approvals" element={<PropertyApprovalPage />} />
          <Route path="projects">
            <Route index element={<ProjectsListPage mode="admin" />} />
            <Route path="new" element={<ProjectFormPage />} />
            <Route path=":uuid/review" element={<ProjectApprovalPage />} />
            <Route path=":uuid" element={<ProjectManagePage />} />
          </Route>
          <Route path="bookings" element={<BookingsPage manage />} />
          <Route path="team" element={<BuilderTeamPage />} />
          <Route path="verifications" element={<VerificationQueuePage />} />
          <Route path="builder-profiles" element={<BuilderProfileReviewPage />} />
          {renderLeadRoutes()}
          {renderEngagementRoutes({ staffTickets: true, moderateReviews: true, manageFaq: true })}
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="advertisements" element={<AdvertisementsPage />} />
          <Route path="cms" element={<CmsAdminPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="property-reports" element={<PropertyReportsPage />} />
          <Route path="app-settings" element={<AppSettingsPage />} />
          <Route path="*" element={<ComingSoonPage embedded />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLE_CODES.ADMIN]} />}>
        <Route path="/panel/admin" element={<PanelLayout title="Admin" breadcrumbs={['Admin']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="approvals" element={<PropertyApprovalPage />} />
          {renderAdminPropertyRoutes()}
          <Route path="projects">
            <Route index element={<ProjectsListPage mode="admin" />} />
            <Route path=":uuid/review" element={<ProjectApprovalPage />} />
            <Route path=":uuid/buildings/new" element={<ProjectBuildingFormPage />} />
            <Route path=":uuid/towers/new" element={<ProjectTowerFormPage />} />
            <Route path=":uuid" element={<ProjectManagePage />} />
          </Route>
          <Route path="verifications" element={<VerificationQueuePage />} />
          {renderLeadRoutes()}
          {renderEngagementRoutes({ staffTickets: true, moderateReviews: true, manageFaq: true })}
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="advertisements" element={<AdvertisementsPage />} />
          <Route path="cms" element={<CmsAdminPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="property-reports" element={<PropertyReportsPage />} />
          <Route path="app-settings" element={<AppSettingsPage />} />
          <Route path="*" element={<ComingSoonPage embedded />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLE_CODES.BUILDER]} />}>
        <Route path="/panel/builder" element={<PanelLayout title="Builder" breadcrumbs={['Builder']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<BuilderProfilePage />} />
          <Route path="profile/edit" element={<BuilderProfileEditPage />} />
          <Route path="projects">
            <Route index element={<ProjectsListPage mode="mine" />} />
            <Route path="new" element={<ProjectFormPage />} />
            <Route path=":uuid/edit" element={<ProjectFormPage />} />
            <Route path=":uuid/buildings/new" element={<ProjectBuildingFormPage />} />
            <Route path=":uuid/towers/new" element={<ProjectTowerFormPage />} />
            <Route path=":uuid" element={<ProjectManagePage />} />
          </Route>
          <Route path="bookings" element={<BookingsPage manage />} />
          <Route path="team" element={<BuilderTeamPage />} />
          <Route path="plots">
            <Route index element={<PropertiesListPage mode="mine" listingKind="plot" />} />
            <Route path="new" element={<PropertyFormPage />} />
            <Route path=":uuid/edit" element={<PropertyFormPage />} />
          </Route>
          {renderListerPropertyRoutes()}
          {renderLeadRoutes()}
          {renderEngagementRoutes()}
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<ComingSoonPage embedded />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLE_CODES.AGENT]} />}>
        <Route path="/panel/agent" element={<PanelLayout title="Agent" breadcrumbs={['Agent']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<RoleProfilePage />} />
          {renderListerPropertyRoutes()}
          {renderLeadRoutes()}
          {renderEngagementRoutes()}
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<ComingSoonPage embedded />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLE_CODES.OWNER]} />}>
        <Route path="/panel/owner" element={<PanelLayout title="Owner" breadcrumbs={['Owner']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<RoleProfilePage />} />
          {renderListerPropertyRoutes()}
          {renderLeadRoutes()}
          {renderEngagementRoutes()}
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<ComingSoonPage embedded />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLE_CODES.BUYER]} />}>
        <Route path="/panel/buyer" element={<PanelLayout title="Buyer" breadcrumbs={['Buyer']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<BuyerDashboardPage />} />
          <Route path="profile" element={<BuyerProfilePage />} />
          <Route path="search" element={<PropertySearchPage embedded />} />
          <Route path="saved" element={<SavedPropertiesPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="visits" element={<VisitsPage scope="mine" />} />
          <Route path="reviews" element={<MyReviewsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="loan-calculator" element={<LoanCalculatorPage />} />
          {/* <Route path="reports" element={<ReportsPage />} /> */}
          <Route path="complaints" element={<ComplaintsPage />} />
          {renderEngagementRoutes()}
          <Route path="*" element={<ComingSoonPage embedded />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLE_CODES.SUPPORT]} />}>
        <Route path="/panel/support" element={<PanelLayout title="Support" breadcrumbs={['Support']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          {renderEngagementRoutes({ staffTickets: true, manageFaq: true })}
          <Route path="verifications" element={<VerificationQueuePage />} />
          <Route path="property-reports" element={<PropertyReportsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<ComingSoonPage embedded />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={[ROLE_CODES.CMS_MANAGER]} />}>
        <Route path="/panel/cms" element={<PanelLayout title="CMS" breadcrumbs={['CMS']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="content" element={<CmsAdminPage />} />
          <Route path="faq" element={<FaqPage manage />} />
          <Route path="settings" element={<AccountSettingsPage />} />
          <Route path="*" element={<ComingSoonPage embedded />} />
        </Route>
      </Route>

      <Route path="/coming-soon" element={<ComingSoonPage />} />
      <Route path="*" element={<ComingSoonPage />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => installButtonDisableOnClick(), []);

  return (
    <BrowserRouter>
      <HomeLocationsProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </HomeLocationsProvider>
    </BrowserRouter>
  );
}

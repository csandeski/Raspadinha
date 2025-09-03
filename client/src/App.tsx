import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth.tsx";
import { AffiliatePixelTracker } from "@/components/affiliate-pixel-tracker";
import ZeroBalanceModal from "@/components/zero-balance-modal";
import ScrollToTop from "@/components/scroll-to-top";
import { RegisterPromoModal } from "@/components/register-promo-modal";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { FloatingReferralButton } from "@/components/floating-referral-button";
import React, { lazy, Suspense, useEffect } from "react";
import { AffiliateTracker } from "./lib/affiliate-tracker";
import { AffiliateProtectedRoute } from "./components/affiliate/protected-route";
import { PartnerProtectedRoute } from "./components/partner/protected-route";
import { preloadCriticalAssets } from "./utils/preload-assets";

// Keep these pages always loaded (critical for UX)
import Home from "./pages/home";
import Register from "./pages/register";

// Lazy load all other pages for better performance
const Landing = lazy(() => import("./pages/landing"));
const Game = lazy(() => import("./pages/game"));
const Games = lazy(() => import("./pages/games"));
const Profile = lazy(() => import("./pages/profile"));
const Deposit = lazy(() => import("./pages/deposit"));
const Withdraw = lazy(() => import("./pages/withdraw"));
const Saque = lazy(() => import("./pages/saque"));
const History = lazy(() => import("./pages/history"));
const WithdrawalHistory = lazy(() => import("./pages/withdrawal-history"));
const Support = lazy(() => import("./pages/support"));
const Admin = lazy(() => import("./pages/admin"));
const AdminLogin = lazy(() => import("./pages/admin-login"));
const Ajuda = lazy(() => import("./pages/ajuda").then(m => ({ default: m.Ajuda })));
const Wallet = lazy(() => import("./pages/wallet"));
const NotFound = lazy(() => import("./pages/not-found").then(m => ({ default: m.NotFound })));
const GamePremioPix = lazy(() => import("./pages/game-premio-pix"));
const GamePremioMeMimei = lazy(() => import("./pages/game-premio-me-mimei"));
const GamePremioEletronicos = lazy(() => import("./pages/game-premio-eletronicos"));
const GamePremioSuperPremios = lazy(() => import("./pages/game-premio-super-premios"));
const GameBauPix = lazy(() => import("./pages/game-bau-pix"));
const GameBauMeMimei = lazy(() => import("./pages/game-bau-me-mimei"));
const GameBauEletronicos = lazy(() => import("./pages/game-bau-eletronicos"));
const GameBauSuperPremios = lazy(() => import("./pages/game-bau-super-premios"));
const JogoEsquilo = lazy(() => import("./components/games/jogo-esquilo"));
const Rewards = lazy(() => import("./pages/rewards"));
const ReferralPage = lazy(() => import("./pages/referral"));
const Header = lazy(() => import("./components/header"));
const BottomNav = lazy(() => import("./components/bottom-nav"));
const SettingsPage = lazy(() => import("./pages/settings").then(m => ({ default: m.SettingsPage })));
const AdminDashboard = lazy(() => import("./pages/admin/dashboard"));
const AdminProbabilityTestPage = lazy(() => import("./pages/admin/probability-test").then(m => ({ default: m.AdminProbabilityTestPage })));

const ForgotPassword = lazy(() => import("./pages/forgot-password"));
const Termos = lazy(() => import("./pages/termos").then(m => ({ default: m.Termos })));
const Privacidade = lazy(() => import("./pages/privacidade").then(m => ({ default: m.Privacidade })));
const SupportAgentLogin = lazy(() => import("./pages/support-agent-login"));
const SupportAgent = lazy(() => import("./pages/support-agent"));
const TestPayment = lazy(() => import("./pages/test-payment"));
const PainelAfiliadoDashboard = lazy(() => import("./pages/painel-afiliado-dashboard").then(m => ({ default: m.PainelAfiliadoDashboard })));
const PainelAfiliadoLinks = lazy(() => import("./pages/painel-afiliado-links").then(m => ({ default: m.PainelAfiliadoLinks })));
const PainelAfiliadoMaterials = lazy(() => import("./pages/painel-afiliado-materials").then(m => ({ default: m.PainelAfiliadoMaterials })));
const PainelAfiliadoNetwork = lazy(() => import("./pages/painel-afiliado-network").then(m => ({ default: m.PainelAfiliadoNetwork })));
const PainelAfiliadoEarnings = lazy(() => import("./pages/painel-afiliado-earnings").then(m => ({ default: m.PainelAfiliadoEarnings })));
const PainelAfiliadoWithdrawals = lazy(() => import("./pages/painel-afiliado-withdrawals").then(m => ({ default: m.PainelAfiliadoWithdrawals })));
const PainelAfiliadoLevels = lazy(() => import("./pages/painel-afiliado-levels"));
const PainelAfiliadoReports = lazy(() => import("./pages/painel-afiliado-reports").then(m => ({ default: m.PainelAfiliadoReports })));
const PainelAfiliadoHistory = lazy(() => import("./pages/painel-afiliado-history").then(m => ({ default: m.PainelAfiliadoHistory })));
const PainelAfiliadoSupport = lazy(() => import("./pages/painel-afiliado-support").then(m => ({ default: m.PainelAfiliadoSupport })));
const PainelAfiliadoSettings = lazy(() => import("./pages/painel-afiliado-settings").then(m => ({ default: m.PainelAfiliadoSettings })));
const PainelAfiliadoLanding = lazy(() => import("./pages/painel-afiliado-landing").then(m => ({ default: m.PainelAfiliadoLanding })));
const PainelAfiliadoLogin = lazy(() => import("./pages/painel-afiliado-login").then(m => ({ default: m.PainelAfiliadoLogin })));
const PainelAfiliadoCadastro = lazy(() => import("./pages/painel-afiliado-cadastro").then(m => ({ default: m.PainelAfiliadoCadastro })));
const PainelAfiliadoAuth = lazy(() => import("./pages/painel-afiliado-auth").then(m => ({ default: m.PainelAfiliadoAuth })));
const AfiliadosClear = lazy(() => import("./pages/afiliados-clear").then(m => ({ default: m.AfiliadosClear })));
const PainelAfiliadoDemo = lazy(() => import("./pages/painel-afiliado-demo").then(m => ({ default: m.PainelAfiliadoDemo })));
const PainelParceiro = lazy(() => import("./pages/painel-parceiro"));
const PainelAfiliadoParceiros = lazy(() => import("./pages/painel-afiliado-parceiros").then(m => ({ default: m.PainelAfiliadoParceiros })));
const ParceirosLogin = lazy(() => import("./pages/parceiros-login"));
const ParceirosDashboard = lazy(() => import("./pages/parceiros-dashboard"));
const ParceirosLinks = lazy(() => import("./pages/parceiros-links-novo"));
const ParceirosNetwork = lazy(() => import("./pages/parceiros-network"));
const ParceirosEarnings = lazy(() => import("./pages/parceiros-earnings"));
const ParceirosWithdrawals = lazy(() => import("./pages/parceiros-withdrawals"));
const ParceirosHistory = lazy(() => import("./pages/parceiros-history"));
const ParceirosMaterials = lazy(() => import("./pages/parceiros-materials"));
const ParceirosDemo = lazy(() => import("./pages/parceiros-demo"));
const ParceirosSettings = lazy(() => import("./pages/parceiros-settings"));
const ParceirosDebug = lazy(() => import("./pages/parceiros-debug"));

// Componente de redirecionamento
const RedirectToAffiliatePanel = () => {
  const [, setLocation] = useLocation();
  
  // Use useEffect to redirect after component mounts
  React.useEffect(() => {
    setLocation('/afiliados');
  }, [setLocation]);
  
  return null;
};

// Loading component for lazy loaded pages
const PageLoader = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-[#0A0E1A] via-[#111827] to-[#0F172A] flex items-center justify-center z-50">
    {/* Soft ambient glow */}
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 bg-green-500/10 rounded-full blur-3xl" />
    </div>
    
    {/* Loading content - Force center alignment */}
    <div className="relative flex flex-col items-center justify-center w-full px-4">
      {/* Logo with pulse animation */}
      <div className="mb-8 animate-pulse flex justify-center">
        <img 
          src="/logos/logomania.svg"
          alt="Mania Brasil"
          className="h-16 md:h-20 w-auto opacity-90 mx-auto"
          style={{ maxWidth: '200px' }}
        />
      </div>
      
      {/* Modern loading dots */}
      <div className="flex justify-center space-x-2">
        <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      
      {/* Loading text */}
      <p className="mt-6 text-gray-400 text-sm animate-pulse text-center">Carregando...</p>
    </div>
  </div>
);

function Router() {
  const { user, isLoading } = useAuth();
  
  // Pré-carrega imagens críticas no início do app
  useEffect(() => {
    preloadCriticalAssets();
  }, []);

  // Handle affiliate ref parameter and clean URL for authenticated users
  useEffect(() => {
    // Initialize tracking with authentication status
    AffiliateTracker.initFromURL(!!user);
    
    // Check and persist/clean ref based on authentication status
    AffiliateTracker.persistRef(!!user);
    
    // Monitor URL changes
    const handleUrlChange = () => {
      AffiliateTracker.persistRef(!!user);
    };
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleUrlChange);
    
    // Monitor for programmatic navigation - only for non-authenticated users
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!user) {
      interval = setInterval(() => {
        AffiliateTracker.persistRef(false);
      }, 500);
    }
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      if (interval) clearInterval(interval);
    };
  }, [user]);



  if (isLoading) {
    return <PageLoader />;
  }

  // Show home page for non-authenticated users (without bottom nav)
  if (!user) {
    return (
      <>
        <ScrollToTop />
        <RegisterPromoModal />
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/login" component={Register} />
            <Route path="/register" component={Register} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/admin" component={AdminLogin} />
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/admin/dashboard" component={AdminDashboard} />
            <Route path="/admin/probability-test" component={AdminProbabilityTestPage} />

            <Route path="/games" component={Games} />
            <Route path="/game/premio-pix" component={GamePremioPix} />
            <Route path="/game/premio-me-mimei" component={GamePremioMeMimei} />
            <Route path="/game/premio-eletronicos" component={GamePremioEletronicos} />
            <Route path="/game/premio-super-premios" component={GamePremioSuperPremios} />
            <Route path="/game/jogo-esquilo" component={JogoEsquilo} />
            <Route path="/game/:type" component={Game} />
            <Route path="/ajuda" component={Ajuda} />
            <Route path="/macaco123" component={SupportAgentLogin} />
            <Route path="/support-agent" component={SupportAgent} />
            <Route path="/test-payment" component={TestPayment} />
            <Route path="/afiliados" component={PainelAfiliadoLanding} />
            <Route path="/afiliados/auth" component={PainelAfiliadoAuth} />
            <Route path="/afiliados/login" component={PainelAfiliadoLogin} />
            <Route path="/afiliados/cadastro" component={PainelAfiliadoCadastro} />
            <Route path="/afiliados/dashboard">
              <AffiliateProtectedRoute>
                <PainelAfiliadoDashboard />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/links">
              <AffiliateProtectedRoute>
                <PainelAfiliadoLinks />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/materials">
              <AffiliateProtectedRoute>
                <PainelAfiliadoMaterials />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/network">
              <AffiliateProtectedRoute>
                <PainelAfiliadoNetwork />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/earnings">
              <AffiliateProtectedRoute>
                <PainelAfiliadoEarnings />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/withdrawals">
              <AffiliateProtectedRoute>
                <PainelAfiliadoWithdrawals />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/levels">
              <AffiliateProtectedRoute>
                <PainelAfiliadoLevels />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/reports">
              <AffiliateProtectedRoute>
                <PainelAfiliadoReports />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/history">
              <AffiliateProtectedRoute>
                <PainelAfiliadoHistory />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/support">
              <AffiliateProtectedRoute>
                <PainelAfiliadoSupport />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/settings">
              <AffiliateProtectedRoute>
                <PainelAfiliadoSettings />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/demo">
              <AffiliateProtectedRoute>
                <PainelAfiliadoDemo />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/afiliados/parceiros">
              <AffiliateProtectedRoute>
                <PainelAfiliadoParceiros />
              </AffiliateProtectedRoute>
            </Route>
            <Route path="/parceiros" component={ParceirosLogin} />
            <Route path="/parceiros/dashboard">
              <PartnerProtectedRoute>
                <ParceirosDashboard />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/links">
              <PartnerProtectedRoute>
                <ParceirosLinks />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/network">
              <PartnerProtectedRoute>
                <ParceirosNetwork />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/earnings">
              <PartnerProtectedRoute>
                <ParceirosEarnings />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/withdrawals">
              <PartnerProtectedRoute>
                <ParceirosWithdrawals />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/history">
              <PartnerProtectedRoute>
                <ParceirosHistory />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/materials">
              <PartnerProtectedRoute>
                <ParceirosMaterials />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/demo">
              <PartnerProtectedRoute>
                <ParceirosDemo />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/settings">
              <PartnerProtectedRoute>
                <ParceirosSettings />
              </PartnerProtectedRoute>
            </Route>
            <Route path="/parceiros/debug">
              <PartnerProtectedRoute>
                <ParceirosDebug />
              </PartnerProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </>
    );
  }

  // Show main app for authenticated users
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Register} />
          <Route path="/register" component={Register} />
          <Route path="/games" component={Games} />
          <Route path="/game/premio-pix" component={GamePremioPix} />
          <Route path="/game/premio-me-mimei" component={GamePremioMeMimei} />
          <Route path="/game/premio-eletronicos" component={GamePremioEletronicos} />
          <Route path="/game/premio-super-premios" component={GamePremioSuperPremios} />
          <Route path="/game/bau-pix" component={GameBauPix} />
          <Route path="/game/bau-me-mimei" component={GameBauMeMimei} />
          <Route path="/game/bau-eletronicos" component={GameBauEletronicos} />
          <Route path="/game/bau-super-premios" component={GameBauSuperPremios} />
          <Route path="/game/jogo-esquilo" component={JogoEsquilo} />
          <Route path="/game/:type" component={Game} />
          <Route path="/profile" component={Profile} />
          <Route path="/deposit" component={Deposit} />
          <Route path="/withdraw" component={Withdraw} />
          <Route path="/saque" component={Saque} />
          <Route path="/history" component={History} />
          <Route path="/withdrawal-history" component={WithdrawalHistory} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/rewards" component={Rewards} />
          <Route path="/referral" component={ReferralPage} />
          <Route path="/support" component={Support} />
          <Route path="/ajuda" component={Ajuda} />
          <Route path="/termos" component={Termos} />
          <Route path="/privacidade" component={Privacidade} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/admin" component={AdminLogin} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/probability-test" component={AdminProbabilityTestPage} />

          <Route path="/macaco123" component={SupportAgentLogin} />
          <Route path="/support-agent" component={SupportAgent} />
          <Route path="/test-payment" component={TestPayment} />
          <Route path="/afiliados" component={PainelAfiliadoLanding} />
          <Route path="/afiliados/auth" component={PainelAfiliadoAuth} />
          <Route path="/afiliados/login" component={PainelAfiliadoLogin} />
          <Route path="/afiliados/cadastro" component={PainelAfiliadoCadastro} />
          <Route path="/afiliados/clear" component={AfiliadosClear} />
          <Route path="/afiliados/dashboard">
            <AffiliateProtectedRoute>
              <PainelAfiliadoDashboard />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/links">
            <AffiliateProtectedRoute>
              <PainelAfiliadoLinks />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/materials">
            <AffiliateProtectedRoute>
              <PainelAfiliadoMaterials />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/network">
            <AffiliateProtectedRoute>
              <PainelAfiliadoNetwork />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/earnings">
            <AffiliateProtectedRoute>
              <PainelAfiliadoEarnings />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/withdrawals">
            <AffiliateProtectedRoute>
              <PainelAfiliadoWithdrawals />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/levels">
            <AffiliateProtectedRoute>
              <PainelAfiliadoLevels />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/reports">
            <AffiliateProtectedRoute>
              <PainelAfiliadoReports />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/history">
            <AffiliateProtectedRoute>
              <PainelAfiliadoHistory />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/support">
            <AffiliateProtectedRoute>
              <PainelAfiliadoSupport />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/settings">
            <AffiliateProtectedRoute>
              <PainelAfiliadoSettings />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/demo">
            <AffiliateProtectedRoute>
              <PainelAfiliadoDemo />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/afiliados/parceiros">
            <AffiliateProtectedRoute>
              <PainelAfiliadoParceiros />
            </AffiliateProtectedRoute>
          </Route>
          <Route path="/parceiros" component={ParceirosLogin} />
          <Route path="/parceiros-login" component={ParceirosLogin} />
          <Route path="/parceiros/dashboard">
            <PartnerProtectedRoute>
              <ParceirosDashboard />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/links">
            <PartnerProtectedRoute>
              <ParceirosLinks />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/network">
            <PartnerProtectedRoute>
              <ParceirosNetwork />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/earnings">
            <PartnerProtectedRoute>
              <ParceirosEarnings />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/withdrawals">
            <PartnerProtectedRoute>
              <ParceirosWithdrawals />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/history">
            <PartnerProtectedRoute>
              <ParceirosHistory />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/materials">
            <PartnerProtectedRoute>
              <ParceirosMaterials />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/demo">
            <PartnerProtectedRoute>
              <ParceirosDemo />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/settings">
            <PartnerProtectedRoute>
              <ParceirosSettings />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/painel/parceiro">
            <PartnerProtectedRoute>
              <PainelParceiro />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/painel/parceiro/:section">
            <PartnerProtectedRoute>
              <PainelParceiro />
            </PartnerProtectedRoute>
          </Route>
          <Route path="/parceiros/debug">
            <PartnerProtectedRoute>
              <ParceirosDebug />
            </PartnerProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AffiliatePixelTracker />
          <ZeroBalanceModal />
          <PWAInstallPrompt />
          <FloatingReferralButton />
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

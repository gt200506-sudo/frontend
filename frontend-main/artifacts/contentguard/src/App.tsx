import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { Layout } from "@/components/layout";
import { useAuth } from "@/context/auth";

import NotFound from "@/pages/not-found";
import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import Dashboard from "./pages/dashboard";
import ContentLibrary from "./pages/content-library";
import ContentView from "./pages/content-view";
import RegisterContent from "./pages/register-content";
import Detections from "./pages/detections";
import Propagation from "./pages/propagation";
import Web3 from "./pages/web3";
import Settings from "./pages/settings";
import ForgotPassword from "./pages/forgot-password";
import LandingPage from "./pages/landing";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    }
  }
});

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <Layout>
        <Switch>
          <Route path="/signin">
            <Redirect to="/" />
          </Route>
          <Route path="/signup">
            <Redirect to="/" />
          </Route>
          <Route path="/landing">
            <Redirect to="/" />
          </Route>
          <Route path="/" component={Dashboard} />
          <Route path="/content/view" component={ContentView} />
          <Route path="/content" component={ContentLibrary} />
          <Route path="/content/register" component={RegisterContent} />
          <Route path="/detections" component={Detections} />
          <Route path="/propagation" component={Propagation} />
          <Route path="/web3" component={Web3} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    );
  }

  return (
    <Switch>
      <Route path="/landing">
        <Redirect to="/" />
      </Route>
      <Route path="/signin" component={SignIn} />
      <Route path="/signup" component={SignUp} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/" component={LandingPage} />
      <Route>
        <Redirect to="/signin" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

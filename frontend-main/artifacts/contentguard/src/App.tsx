import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/context/auth";

import NotFound from "@/pages/not-found";
import SignIn from "@/pages/signin";
import Dashboard from "./pages/dashboard";
import ContentLibrary from "./pages/content-library";
import RegisterContent from "./pages/register-content";
import Detections from "./pages/detections";
import Propagation from "./pages/propagation";
import Alerts from "./pages/alerts";
import Web3 from "./pages/web3";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    }
  }
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading ContentGuard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/signin" />;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && isAuthenticated) {
    return (
      <Layout>
        <Switch>
          <Route path="/signin"><Redirect to="/" /></Route>
          <Route path="/" component={Dashboard} />
          <Route path="/content" component={ContentLibrary} />
          <Route path="/content/register" component={RegisterContent} />
          <Route path="/detections" component={Detections} />
          <Route path="/propagation" component={Propagation} />
          <Route path="/alerts" component={Alerts} />
          <Route path="/web3" component={Web3} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    );
  }

  return (
    <Switch>
      <Route path="/signin" component={SignIn} />
      <Route>
        {isLoading ? (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse" />
          </div>
        ) : (
          <Redirect to="/signin" />
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import RequireAuth from "./components/RequireAuth";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppShell from "./layouts/AppShell";
import About from "./pages/About";
import Aggregation from "./pages/Aggregation";
import BuyerDashboard from "./pages/BuyerDashboard";
import BuyerRequirement from "./pages/BuyerRequirement";
import BuyerMatches from "./pages/BuyerMatches";
import FarmerDashboard from "./pages/FarmerDashboard";
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import Login from "./pages/Login";
import Matches from "./pages/Matches";
import ProduceListing from "./pages/ProduceListing";

function Protected({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

function Router() {
  return <AppShell><Switch>
    <Route path="/" component={Home} />
    <Route path="/login" component={Login} />
    <Route path="/farmer"><Protected><FarmerDashboard /></Protected></Route>
    <Route path="/farmer/produce"><Protected><ProduceListing /></Protected></Route>
    <Route path="/buyer"><Protected><BuyerDashboard /></Protected></Route>
    <Route path="/buyer/requirement"><Protected><BuyerRequirement /></Protected></Route>
    <Route path="/buyer/matches"><Protected><BuyerMatches /></Protected></Route>
    <Route path="/buyer/requirements/:id"><Protected><BuyerMatches /></Protected></Route>
    <Route path="/matches"><Protected><Matches /></Protected></Route>
    <Route path="/aggregation"><Protected><Aggregation /></Protected></Route>
    <Route path="/how-it-works" component={HowItWorks} />
    <Route path="/about" component={About} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></AppShell>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;

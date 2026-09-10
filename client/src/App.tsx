import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
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
import Matches from "./pages/Matches";
import ProduceListing from "./pages/ProduceListing";

function Router() {
  return <AppShell><Switch>
    <Route path="/" component={Home} />
    <Route path="/farmer" component={FarmerDashboard} />
    <Route path="/farmer/produce" component={ProduceListing} />
    <Route path="/buyer" component={BuyerDashboard} />
    <Route path="/buyer/requirement" component={BuyerRequirement} />
    <Route path="/buyer/matches" component={BuyerMatches} />
    <Route path="/buyer/requirements/:id" component={BuyerMatches} />
    <Route path="/matches" component={Matches} />
    <Route path="/aggregation" component={Aggregation} />
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

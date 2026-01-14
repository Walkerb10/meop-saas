import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useVapiPreload } from "@/hooks/useVapiPreload";
import Index from "./pages/Index";
import Agent from "./pages/Agent";
import ScheduledActions from "./pages/ScheduledActions";
import Automations from "./pages/Automations";
import CRM from "./pages/CRM";
import Sequences from "./pages/Sequences";
import Settings from "./pages/Settings";
import Executions from "./pages/Executions";
import Profile from "./pages/Profile";
import Conversations from "./pages/Conversations";
import AdminDashboard from "./pages/AdminDashboard";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Newsletter from "./pages/Newsletter";

const queryClient = new QueryClient();

// Preload Vapi SDK on app mount
function VapiPreloader() {
  useVapiPreload();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <VapiPreloader />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/agent" element={<ProtectedRoute><Agent /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/scheduled-actions" element={<ProtectedRoute><ScheduledActions /></ProtectedRoute>} />
          <Route path="/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
          <Route path="/sequences" element={<ProtectedRoute><Sequences /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/executions" element={<ProtectedRoute><Executions /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/conversations" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/newsletter" element={<Newsletter />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

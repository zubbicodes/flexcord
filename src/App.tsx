import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import WorkerEntry from "./pages/WorkerEntry";
import SaleOrderManagement from "./pages/SaleOrderManagement";
import WorkerProgress from "./pages/WorkerProgress";
import ProcessDetails from "./pages/ProcessDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/process/:processId/:orderId" element={<ProcessDetails />} />
          <Route path="/entry" element={<WorkerEntry />} />
          <Route path="/sale-orders" element={<SaleOrderManagement />} />
          <Route path="/worker-progress" element={<WorkerProgress />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

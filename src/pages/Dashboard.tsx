import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ProductSize {
  id: string;
  sr_number: number;
  finished_size_inch: number;
  quantity: number;
}

interface Process {
  id: string;
  name: string;
  order_number: number;
}

interface ProgressData {
  [sizeId: string]: {
    [processId: string]: number;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [progressData, setProgressData] = useState<ProgressData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sizesRes, processesRes, progressRes] = await Promise.all([
      supabase.from("product_sizes").select("*").order("sr_number"),
      supabase.from("processes").select("*").order("order_number"),
      supabase.from("progress_entries").select("*"),
    ]);

    if (sizesRes.data) setSizes(sizesRes.data);
    if (processesRes.data) setProcesses(processesRes.data);

    if (progressRes.data) {
      const grouped: ProgressData = {};
      progressRes.data.forEach((entry) => {
        if (!grouped[entry.product_size_id]) grouped[entry.product_size_id] = {};
        grouped[entry.product_size_id][entry.process_id] = 
          (grouped[entry.product_size_id][entry.process_id] || 0) + entry.quantity_completed;
      });
      setProgressData(grouped);
    }
    setLoading(false);
  };

  const getProgress = (sizeId: string, processId: string, totalQty: number) => {
    const completed = progressData[sizeId]?.[processId] || 0;
    return { completed, percentage: (completed / totalQty) * 100 };
  };

  const getTotalProgress = () => {
    const totalRequired = sizes.reduce((sum, size) => sum + size.quantity * processes.length, 0);
    const totalCompleted = Object.values(progressData).reduce(
      (sum, sizeData) => sum + Object.values(sizeData).reduce((s, v) => s + v, 0),
      0
    );
    return { completed: totalCompleted, percentage: (totalCompleted / totalRequired) * 100 };
  };

  const total = getTotalProgress();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Production Dashboard</h1>
            <p className="text-muted-foreground">Flexible Drawcord - Navy</p>
          </div>
          <Button onClick={() => navigate("/entry")}>Add Progress</Button>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Overall Progress</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Completion</span>
              <span className="font-semibold">{total.percentage.toFixed(1)}%</span>
            </div>
            <Progress value={total.percentage} className="h-4" />
          </div>
        </Card>

        <div className="grid gap-4">
          {processes.map((process) => {
            const processTotal = sizes.reduce((sum, size) => {
              const { completed } = getProgress(size.id, process.id, size.quantity);
              return sum + completed;
            }, 0);
            const processRequired = sizes.reduce((sum, size) => sum + size.quantity, 0);
            const processPercentage = (processTotal / processRequired) * 100;

            return (
              <Card key={process.id} className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">{process.name}</h3>
                  <span className="text-sm font-medium">{processPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={processPercentage} className="mb-3" />
                <div className="grid grid-cols-7 gap-2 text-xs">
                  {sizes.map((size) => {
                    const { completed, percentage } = getProgress(size.id, process.id, size.quantity);
                    return (
                      <div key={size.id} className="bg-muted p-2 rounded">
                        <div className="font-medium">Size {size.sr_number}</div>
                        <div className="text-muted-foreground">
                          {completed}/{size.quantity}
                        </div>
                        <div className="font-semibold text-primary">{percentage.toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

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

interface SaleOrder {
  id: string;
  name: string;
  color: string;
}

const ProcessDetails = () => {
  const navigate = useNavigate();
  const { processId, orderId } = useParams();

  const [process, setProcess] = useState<Process | null>(null);
  const [order, setOrder] = useState<SaleOrder | null>(null);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [progressBySize, setProgressBySize] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!processId || !orderId) return;
    const load = async () => {
      const [procRes, orderRes, sizesRes, entriesRes] = await Promise.all([
        supabase.from("processes").select("*").eq("id", processId).maybeSingle(),
        supabase.from("sale_orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("product_sizes").select("*").eq("sale_order_id", orderId).order("sr_number"),
        supabase
          .from("progress_entries")
          .select("product_size_id, quantity_completed")
          .eq("process_id", processId),
      ]);

      if (procRes.data) setProcess(procRes.data as any);
      if (orderRes.data) setOrder(orderRes.data as any);
      if (sizesRes.data) setSizes(sizesRes.data as any);

      if (entriesRes.data) {
        const grouped: Record<string, number> = {};
        (entriesRes.data as any[]).forEach((e) => {
          grouped[e.product_size_id] = (grouped[e.product_size_id] || 0) + e.quantity_completed;
        });
        setProgressBySize(grouped);
      }

      setLoading(false);
    };
    load();
  }, [processId, orderId]);

  const totals = useMemo(() => {
    const required = sizes.reduce((sum, s) => sum + s.quantity, 0);
    const completed = sizes.reduce((sum, s) => sum + (progressBySize[s.id] || 0), 0);
    const percentage = required > 0 ? (completed / required) * 100 : 0;
    return { required, completed, percentage };
  }, [sizes, progressBySize]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (!process || !order) return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <p>Process or Order not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{process.name} Details</h1>
            <p className="text-sm md:text-base text-muted-foreground">Order: {order.name} - {order.color}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild size="sm">
              <Link to="/" className="text-xs md:text-sm">← Back</Link>
            </Button>
          </div>
        </div>

        <Card className="p-3 md:p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Overall Completion</span>
            <span className="font-semibold">{totals.percentage.toFixed(1)}%</span>
          </div>
          <Progress value={totals.percentage} className="h-3" />
          <div className="mt-2 text-sm text-muted-foreground">
            {totals.completed}/{totals.required}
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <Table className="text-xs md:text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead>Qty Required</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((s) => {
                const completed = progressBySize[s.id] || 0;
                const percentage = s.quantity > 0 ? (completed / s.quantity) * 100 : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">Size {s.sr_number} <span className="text-xs text-muted-foreground">({s.finished_size_inch}")</span></TableCell>
                    <TableCell>{s.quantity}</TableCell>
                    <TableCell>{completed}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={percentage} className="h-2" />
                        <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default ProcessDetails;



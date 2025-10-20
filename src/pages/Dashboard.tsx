import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Table as TableIcon, Settings, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToXLSX, exportTableToPDF } from "@/lib/export";

interface ProductSize {
  id: string;
  sr_number: number;
  finished_size_inch: number;
  quantity: number;
}

interface SaleOrder {
  id: string;
  name: string;
  color: string;
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
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [progressData, setProgressData] = useState<ProgressData>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  // Color mapping for sale orders
  const getOrderColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'Navy': 'bg-blue-600',
      'Oat Milk': 'bg-amber-200',
      'Black': 'bg-gray-800',
      'White': 'bg-gray-100',
      'Red': 'bg-red-500',
      'Green': 'bg-green-500',
      'Yellow': 'bg-yellow-400',
      'Purple': 'bg-purple-500',
      'Pink': 'bg-pink-400',
      'Orange': 'bg-orange-500',
    };
    return colorMap[color] || 'bg-gray-500';
  };

  const getOrderTextColor = (color: string) => {
    const textColorMap: Record<string, string> = {
      'Navy': 'text-white',
      'Oat Milk': 'text-gray-800',
      'Black': 'text-white',
      'White': 'text-gray-800',
      'Red': 'text-white',
      'Green': 'text-white',
      'Yellow': 'text-gray-800',
      'Purple': 'text-white',
      'Pink': 'text-gray-800',
      'Orange': 'text-white',
    };
    return textColorMap[color] || 'text-white';
  };

  // Provide a readable muted text color when the background is dark (e.g., Navy)
  const getOrderMutedTextColor = (color: string) => {
    const mutedMap: Record<string, string> = {
      'Navy': 'text-white/80',
      'Black': 'text-white/80',
      'Purple': 'text-white/85',
      'Red': 'text-white/85',
      'Green': 'text-white/85',
    };
    return mutedMap[color] || 'text-muted-foreground';
  };

  const getOrderBorderColor = (color: string) => {
    const borderColorMap: Record<string, string> = {
      'Navy': 'border-blue-600',
      'Oat Milk': 'border-amber-300',
      'Black': 'border-gray-800',
      'White': 'border-gray-300',
      'Red': 'border-red-500',
      'Green': 'border-green-500',
      'Yellow': 'border-yellow-400',
      'Purple': 'border-purple-500',
      'Pink': 'border-pink-400',
      'Orange': 'border-orange-500',
    };
    return borderColorMap[color] || 'border-gray-500';
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) loadData();
  }, [selectedOrder]);

  const loadOrders = async () => {
    const { data } = await supabase.from("sale_orders").select("*");
    if (data) {
      setOrders(data);
      if (data.length > 0) setSelectedOrder(data[0].id);
    }
  };

  const loadData = async () => {
    const [sizesRes, processesRes, progressRes] = await Promise.all([
      supabase.from("product_sizes").select("*").eq("sale_order_id", selectedOrder).order("sr_number"),
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

  // Overall for a size is NOT sum of processes; it's the minimum completed across all processes
  // because the same piece flows through the full process chain.
  const getOverallCompletedForSize = (sizeId: string) => {
    if (!processes.length) return 0;
    const completedPerProcess = processes.map((p) => progressData[sizeId]?.[p.id] || 0);
    return Math.min(...completedPerProcess);
  };

  const getTotalProgress = () => {
    // Required is total pieces across all sizes (not multiplied by process count)
    const totalRequired = sizes.reduce((sum, size) => sum + size.quantity, 0);
    // Completed is sum of per-size minimum across processes
    const totalCompleted = sizes.reduce((sum, size) => sum + getOverallCompletedForSize(size.id), 0);
    const percentage = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;
    return { completed: totalCompleted, percentage };
  };

  // Average completion: mean of per-process completion percentages, aggregated per size
  const getAverageCompletionForSize = (sizeId: string, sizeQty: number) => {
    if (!processes.length || sizeQty <= 0) return 0;
    const perProcessRatios = processes.map((p) => {
      const completed = progressData[sizeId]?.[p.id] || 0;
      return Math.min(1, completed / sizeQty);
    });
    const avgRatio = perProcessRatios.reduce((s, r) => s + r, 0) / processes.length;
    return avgRatio * 100;
  };

  const getAverageCompletionOverall = () => {
    if (!sizes.length) return 0;
    const perSizeAvgs = sizes.map((s) => getAverageCompletionForSize(s.id, s.quantity));
    return perSizeAvgs.reduce((s, v) => s + v, 0) / sizes.length;
  };

  const total = getTotalProgress();
  const selectedOrderData = orders.find((o) => o.id === selectedOrder);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Production Dashboard</h1>
            {selectedOrderData && (
              <div className="flex items-center gap-3 mt-2">
                <div className={`w-4 h-4 rounded-full ${getOrderColor(selectedOrderData.color)} border-2 ${getOrderBorderColor(selectedOrderData.color)}`}></div>
                <p className="text-muted-foreground">
                  {selectedOrderData.name} - {selectedOrderData.color}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/sale-orders")}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Orders
            </Button>
            <Button variant="outline" onClick={() => navigate("/worker-progress")}>
              <Users className="h-4 w-4 mr-2" />
              Worker Progress
            </Button>
            <Button variant="outline" onClick={async () => {
              if (!selectedOrderData) return;
              const totalRequired = sizes.reduce((sum, s) => sum + s.quantity, 0);
              const totalOverallCompleted = sizes.reduce((sum, s) => sum + getOverallCompletedForSize(s.id), 0);
              const totalOverallPct = totalRequired > 0 ? (totalOverallCompleted / totalRequired) * 100 : 0;
              const avgCompletion = getAverageCompletionOverall();

              // Per-process totals
              const perProcessTotals = processes.map((p) => {
                const completed = sizes.reduce((sum, s) => sum + (progressData[s.id]?.[p.id] || 0), 0);
                const pct = totalRequired > 0 ? (completed / totalRequired) * 100 : 0;
                return { name: p.name, completed, pct };
              });

              // Summary sheet
              const summaryRows = [
                { Metric: "Order", Value: selectedOrderData.name },
                { Metric: "Color", Value: selectedOrderData.color },
                { Metric: "Total Required", Value: totalRequired },
                { Metric: "Overall Completed", Value: totalOverallCompleted },
                { Metric: "Overall %", Value: Number(totalOverallPct.toFixed(1)) },
                { Metric: "Average Completion %", Value: Number(avgCompletion.toFixed(1)) },
              ];
              perProcessTotals.forEach((pp) => {
                summaryRows.push({ Metric: `${pp.name} Completed`, Value: pp.completed });
                summaryRows.push({ Metric: `${pp.name} %`, Value: Number(pp.pct.toFixed(1)) });
              });

              // Size-wise sheet (with overall columns)
              const sizeRows = sizes.map((s) => {
                const overallCompleted = getOverallCompletedForSize(s.id);
                return {
                  Size: `Size ${s.sr_number}`,
                  "Finished (inch)": s.finished_size_inch,
                  Quantity: s.quantity,
                  "Overall Completed": overallCompleted,
                  "Overall %": Number(((overallCompleted / s.quantity) * 100 || 0).toFixed(1)),
                };
              });

              // Process-wise sheet (totals)
              const processRows = perProcessTotals.map((pp) => ({
                Process: pp.name,
                Completed: pp.completed,
                Required: totalRequired,
                "%": Number(pp.pct.toFixed(1)),
              }));

              // Complete progress entries matrix (size x process) including overall columns
              const matrixRows = sizes.map((s) => {
                const row: any = { Size: `Size ${s.sr_number}`, Qty: s.quantity };
                processes.forEach((p) => {
                  row[p.name] = progressData[s.id]?.[p.id] || 0;
                });
                const oc = getOverallCompletedForSize(s.id);
                row["Overall Completed"] = oc;
                row["Overall %"] = Number(((oc / s.quantity) * 100 || 0).toFixed(1));
                return row;
              });

              await exportToXLSX(`${selectedOrderData.name}-progress`, [
                { name: "Summary", rows: summaryRows },
                { name: "Size Wise", rows: sizeRows },
                { name: "Process Wise", rows: processRows },
                { name: "Complete", rows: matrixRows },
              ]);
            }}>Export Excel</Button>
            <Button variant="outline" onClick={async () => {
              if (!selectedOrderData) return;
              const totalRequired = sizes.reduce((sum, s) => sum + s.quantity, 0);
              const totalOverallCompleted = sizes.reduce((sum, s) => sum + getOverallCompletedForSize(s.id), 0);
              const totalOverallPct = totalRequired > 0 ? (totalOverallCompleted / totalRequired) * 100 : 0;
              const avgCompletion = getAverageCompletionOverall();

              const columns = ["Size", "Qty", ...processes.map((p) => p.name), "Overall Completed", "Overall %"];
              const rows = sizes.map((s) => {
                const r: (string | number)[] = [`Size ${s.sr_number}`, s.quantity];
                processes.forEach((p) => r.push(progressData[s.id]?.[p.id] || 0));
                const oc = getOverallCompletedForSize(s.id);
                r.push(oc, Number(((oc / s.quantity) * 100 || 0).toFixed(1)));
                return r;
              });

              // Add a summary row at the end
              rows.push(["TOTAL", totalRequired, ...processes.map((p) => sizes.reduce((sum, s) => sum + (progressData[s.id]?.[p.id] || 0), 0)), totalOverallCompleted, Number(totalOverallPct.toFixed(1))]);

              await exportTableToPDF(
                `${selectedOrderData.name}-progress`,
                `${selectedOrderData.name} Progress (Overall ${totalOverallPct.toFixed(1)}% | Avg ${avgCompletion.toFixed(1)}%)`,
                columns,
                rows,
              );
            }}>Export PDF</Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button onClick={() => navigate("/entry")}>Add Progress</Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Select Order</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Color Legend:</span>
              {orders.map((order) => (
                <div key={order.id} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${getOrderColor(order.color)} border ${getOrderBorderColor(order.color)}`}></div>
                  <span className="text-xs text-muted-foreground">{order.color}</span>
                </div>
              ))}
            </div>
          </div>
          <Select value={selectedOrder} onValueChange={setSelectedOrder}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select order" />
            </SelectTrigger>
            <SelectContent>
              {orders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getOrderColor(order.color)} border ${getOrderBorderColor(order.color)}`}></div>
                    {order.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        <Card className={`p-6 border-l-4 ${selectedOrderData ? getOrderBorderColor(selectedOrderData.color) : 'border-gray-500'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-4 h-4 rounded-full ${selectedOrderData ? getOrderColor(selectedOrderData.color) : 'bg-gray-500'} border-2 ${selectedOrderData ? getOrderBorderColor(selectedOrderData.color) : 'border-gray-500'}`}></div>
            <h2 className="text-2xl font-semibold">Overall Progress</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Completion</span>
                <span className="font-semibold">{total.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={total.percentage} className="h-4" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Average Completion</span>
                <span className="font-semibold">{getAverageCompletionOverall().toFixed(1)}%</span>
              </div>
              <Progress value={getAverageCompletionOverall()} className="h-4" />
            </div>
          </div>
        </Card>

        {viewMode === "grid" ? (
          <div className="grid gap-4">
            {processes.map((process) => {
              const processTotal = sizes.reduce((sum, size) => {
                const { completed } = getProgress(size.id, process.id, size.quantity);
                return sum + completed;
              }, 0);
              const processRequired = sizes.reduce((sum, size) => sum + size.quantity, 0);
              const processPercentage = (processTotal / processRequired) * 100;

              return (
                <Card key={process.id} className={`p-4 border-l-4 ${selectedOrderData ? getOrderBorderColor(selectedOrderData.color) : 'border-gray-500'}`}>
                  <div className="flex justify-between items-center mb-3 cursor-pointer" onClick={() => navigate(`/process/${process.id}/${selectedOrder}`)}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedOrderData ? getOrderColor(selectedOrderData.color) : 'bg-gray-500'} border ${selectedOrderData ? getOrderBorderColor(selectedOrderData.color) : 'border-gray-500'}`}></div>
                      <h3 className="text-lg font-semibold">{process.name}</h3>
                    </div>
                    <span className="text-sm font-medium">{processPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={processPercentage} className="mb-3" />
                  <div className="grid grid-cols-7 gap-2 text-xs">
                    {sizes.map((size) => {
                      const { completed, percentage } = getProgress(size.id, process.id, size.quantity);
                      return (
                        <div key={size.id} className={`p-2 rounded border ${selectedOrderData ? getOrderBorderColor(selectedOrderData.color) : 'border-gray-300'} ${selectedOrderData ? getOrderColor(selectedOrderData.color) : 'bg-muted'} ${selectedOrderData ? getOrderTextColor(selectedOrderData.color) : 'text-foreground'}`}>
                          <div className="font-medium">Size {size.sr_number}</div>
                          <div className={`${selectedOrderData ? getOrderMutedTextColor(selectedOrderData.color) : 'text-muted-foreground'}`}>
                            {completed}/{size.quantity}
                          </div>
                          <div className="font-semibold">{percentage.toFixed(0)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className={`overflow-auto border-l-4 ${selectedOrderData ? getOrderBorderColor(selectedOrderData.color) : 'border-gray-500'}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Size</TableHead>
                  <TableHead className="font-semibold">Qty</TableHead>
                  {processes.map((process) => (
                    <TableHead key={process.id} className="text-center font-semibold">
                      {process.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizes.map((size) => {
                  // Average completion for this size across all processes
                  const avgPercent = getAverageCompletionForSize(size.id, size.quantity);

                  return (
                    <TableRow key={size.id}>
                      <TableCell className="font-medium">
                        Size {size.sr_number}
                        <div className="text-xs text-muted-foreground">{size.finished_size_inch}"</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{size.quantity}</TableCell>
                      {processes.map((process) => {
                        const { completed, percentage } = getProgress(size.id, process.id, size.quantity);
                        return (
                          <TableCell key={process.id} className="text-center">
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {completed}/{size.quantity}
                              </div>
                              <Progress value={percentage} className="h-2" />
                              <div className="text-xs text-primary font-semibold">{percentage.toFixed(0)}%</div>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <Progress value={avgPercent} className="h-2" />
                          <div className="text-xs font-semibold text-primary">{avgPercent.toFixed(1)}%</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
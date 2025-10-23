import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const WorkerEntry = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [sizes, setSizes] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    productSizeId: "",
    processId: "",
    quantityCompleted: "",
    workerName: "",
    notes: "",
  });

  const [remainingInfo, setRemainingInfo] = useState<{ completed: number; remaining: number; required: number }>({
    completed: 0,
    remaining: 0,
    required: 0,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedOrder) loadSizes();
  }, [selectedOrder]);

  // Recalculate remaining whenever size or process changes
  useEffect(() => {
    const calcRemaining = async () => {
      if (!formData.productSizeId || !formData.processId) {
        setRemainingInfo({ completed: 0, remaining: 0, required: 0 });
        return;
      }

      const size = sizes.find((s) => s.id === formData.productSizeId);
      const required = size?.quantity ?? 0;

      const { data } = await supabase
        .from("progress_entries")
        .select("quantity_completed")
        .eq("product_size_id", formData.productSizeId)
        .eq("process_id", formData.processId);

      const completed = (data || []).reduce((sum: number, row: any) => sum + (row.quantity_completed || 0), 0);
      const remaining = Math.max(0, required - completed);
      setRemainingInfo({ completed, remaining, required });
    };

    calcRemaining();
  }, [formData.productSizeId, formData.processId, sizes]);

  const loadInitialData = async () => {
    const [ordersRes, processesRes] = await Promise.all([
      supabase.from("sale_orders").select("*"),
      supabase.from("processes").select("*").order("order_number"),
    ]);
    if (ordersRes.data) {
      setOrders(ordersRes.data);
      if (ordersRes.data.length > 0) setSelectedOrder(ordersRes.data[0].id);
    }
    if (processesRes.data) setProcesses(processesRes.data);
  };

  const loadSizes = async () => {
    const { data } = await supabase
      .from("product_sizes")
      .select("*")
      .eq("sale_order_id", selectedOrder)
      .order("sr_number");
    if (data) setSizes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent overshoot entries
    const qty = parseInt(formData.quantityCompleted);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (qty > remainingInfo.remaining) {
      toast.error(`Cannot exceed remaining (${remainingInfo.remaining})`);
      return;
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Check if an entry for today already exists (unique constraint on product_size_id, process_id, entry_date)
    const { data: existing, error: selectErr } = await supabase
      .from("progress_entries")
      .select("id, quantity_completed")
      .eq("product_size_id", formData.productSizeId)
      .eq("process_id", formData.processId)
      .eq("entry_date", today)
      .maybeSingle();

    if (selectErr) {
      toast.error("Failed to check existing progress");
      return;
    }

    if (existing) {
      // Update by incrementing existing quantity
      const { error: updateErr } = await supabase
        .from("progress_entries")
        .update({ quantity_completed: existing.quantity_completed + qty })
        .eq("id", existing.id);

      if (updateErr) {
        toast.error("Failed to update progress");
        return;
      }
    } else {
      // Insert new row for today
      const { error: insertErr } = await supabase.from("progress_entries").insert({
        product_size_id: formData.productSizeId,
        process_id: formData.processId,
        quantity_completed: qty,
        worker_name: formData.workerName,
        notes: formData.notes || null,
        entry_date: today,
      });

      if (insertErr) {
        toast.error("Failed to save progress");
        return;
      }
    }

    toast.success("Progress saved successfully!");
    // Refresh remaining info by triggering effects
    setFormData({ productSizeId: formData.productSizeId, processId: formData.processId, quantityCompleted: "", workerName: "", notes: "" });
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <Button variant="outline" onClick={() => navigate("/")} className="mb-4 md:mb-6" size="sm">
          <span className="text-xs md:text-sm">← Back</span>
        </Button>
        
        <Card className="p-3 sm:p-4 md:p-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 md:mb-6">Add Progress Entry</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Sale Order</Label>
              <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Size</Label>
              <Select value={formData.productSizeId} onValueChange={(v) => setFormData({ ...formData, productSizeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((size) => (
                    <SelectItem key={size.id} value={size.id}>
                      Size {size.sr_number} ({size.finished_size_inch}" - Qty: {size.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Process</Label>
              <Select value={formData.processId} onValueChange={(v) => setFormData({ ...formData, processId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select process" />
                </SelectTrigger>
                <SelectContent>
                  {processes.map((process) => (
                    <SelectItem key={process.id} value={process.id}>
                      {process.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.productSizeId && formData.processId && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">
                    Remaining: 
                  </span>{" "}
                  <span className="font-medium">
                    {remainingInfo.remaining}
                  </span>{" "}
                  <span className="text-muted-foreground">out of</span>{" "}
                  <span className="font-medium">{remainingInfo.required}</span>
                  {remainingInfo.completed > 0 && (
                    <span className="text-muted-foreground"> (completed {remainingInfo.completed})</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Quantity Completed</Label>
              <Input
                type="number"
                value={formData.quantityCompleted}
                min={0}
                max={Math.max(0, remainingInfo.remaining) || undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  // Enforce max in UI
                  const n = parseInt(v);
                  if (!Number.isNaN(n) && remainingInfo.remaining > 0 && n > remainingInfo.remaining) {
                    setFormData({ ...formData, quantityCompleted: String(remainingInfo.remaining) });
                  } else {
                    setFormData({ ...formData, quantityCompleted: v });
                  }
                }}
                required
              />
              {formData.productSizeId && formData.processId && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Max allowed: {remainingInfo.remaining}
                </div>
              )}
            </div>

            <div>
              <Label>Worker Name</Label>
              <Input
                value={formData.workerName}
                onChange={(e) => setFormData({ ...formData, workerName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full">Save Progress</Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default WorkerEntry;
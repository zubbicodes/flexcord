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
  const [sizes, setSizes] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    productSizeId: "",
    processId: "",
    quantityCompleted: "",
    workerName: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sizesRes, processesRes] = await Promise.all([
      supabase.from("product_sizes").select("*").order("sr_number"),
      supabase.from("processes").select("*").order("order_number"),
    ]);
    if (sizesRes.data) setSizes(sizesRes.data);
    if (processesRes.data) setProcesses(processesRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("progress_entries").insert({
      product_size_id: formData.productSizeId,
      process_id: formData.processId,
      quantity_completed: parseInt(formData.quantityCompleted),
      worker_name: formData.workerName,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error("Failed to save progress");
    } else {
      toast.success("Progress saved successfully!");
      setFormData({ productSizeId: "", processId: "", quantityCompleted: "", workerName: "", notes: "" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
          ← Back to Dashboard
        </Button>
        
        <Card className="p-6">
          <h1 className="text-3xl font-bold mb-6">Add Progress Entry</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
            </div>

            <div>
              <Label>Quantity Completed</Label>
              <Input
                type="number"
                value={formData.quantityCompleted}
                onChange={(e) => setFormData({ ...formData, quantityCompleted: e.target.value })}
                required
              />
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
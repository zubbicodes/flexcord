import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ProgressEntry {
  id: string;
  entry_date: string;
  quantity_completed: number;
  worker_name: string;
  notes: string | null;
  process: { name: string };
  product_size: { sr_number: number; finished_size_inch: number; finished_size_cm: number };
  sale_order: { name: string; color: string };
}

const WorkerProgress = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("progress_entries")
      .select(`
        *,
        process:processes(name),
        product_size:product_sizes(sr_number, finished_size_inch, finished_size_cm, sale_order:sale_orders(name, color))
      `)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((entry: any) => ({
        id: entry.id,
        entry_date: entry.entry_date,
        quantity_completed: entry.quantity_completed,
        worker_name: entry.worker_name,
        notes: entry.notes,
        process: entry.process,
        product_size: {
          sr_number: entry.product_size.sr_number,
          finished_size_inch: entry.product_size.finished_size_inch,
          finished_size_cm: entry.product_size.finished_size_cm,
        },
        sale_order: entry.product_size.sale_order,
      }));
      setEntries(formatted);
    }
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("progress_entries").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete entry");
    } else {
      toast.success("Entry deleted successfully");
      loadEntries();
    }
  };

  const groupedByWorker = entries.reduce((acc, entry) => {
    if (!acc[entry.worker_name]) acc[entry.worker_name] = [];
    acc[entry.worker_name].push(entry);
    return acc;
  }, {} as Record<string, ProgressEntry[]>);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Worker Progress</h1>
            <p className="text-sm md:text-base text-muted-foreground">View all progress entries by worker</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")} size="sm" className="text-xs md:text-sm">
              ← Back
            </Button>
          </div>
        </div>

        {Object.entries(groupedByWorker).map(([workerName, workerEntries]) => (
          <Card key={workerName} className="overflow-x-auto">
            <div className="p-3 md:p-4 border-b bg-muted">
              <h2 className="text-lg md:text-xl font-semibold">{workerName}</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Entries: {workerEntries.length} | Qty:{" "}
                {workerEntries.reduce((sum, e) => sum + e.quantity_completed, 0)}
              </p>
            </div>
            <Table className="text-xs md:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.sale_order.name}</div>
                      <div className="text-xs text-muted-foreground">{entry.sale_order.color}</div>
                    </TableCell>
                    <TableCell>
                      Size {entry.product_size.sr_number} ({entry.product_size.finished_size_inch}" / {entry.product_size.finished_size_cm}cm)
                    </TableCell>
                    <TableCell>{entry.process.name}</TableCell>
                    <TableCell className="font-semibold">{entry.quantity_completed}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this progress entry. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteEntry(entry.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WorkerProgress;
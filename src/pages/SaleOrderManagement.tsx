import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Save, Edit2, X, Plus, Trash2, ChevronUp, ChevronDown, Settings } from "lucide-react";

interface SaleOrder {
  id: string;
  name: string;
  color: string;
}

interface ProductSize {
  id: string;
  sr_number: number;
  finished_size_inch: number;
  finished_size_cm: number;
  elastic_inch: string;
  elastic_inch_value: number;
  elastic_cm: number;
  tipping_cord_size: number;
  quantity: number;
}

const SaleOrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ProductSize>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newOrderName, setNewOrderName] = useState("");
  const [newOrderColor, setNewOrderColor] = useState("");
  const [templateOrderId, setTemplateOrderId] = useState("");
  const [deleteOrderDialogOpen, setDeleteOrderDialogOpen] = useState(false);
  const [deleteRowDialogOpen, setDeleteRowDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [processes, setProcesses] = useState<{ id: string; name: string; order_number?: number }[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [newProcessName, setNewProcessName] = useState("");
  const [isEditProcessesDialogOpen, setIsEditProcessesDialogOpen] = useState(false);
  const [orderProcesses, setOrderProcesses] = useState<{ id: string; process_id: string; name: string; order_number: number }[]>([]);

  useEffect(() => {
    loadOrders();
    loadProcesses();
  }, []);

  useEffect(() => {
    if (selectedOrder) loadSizes();
  }, [selectedOrder]);

  const loadOrders = async () => {
    const { data } = await supabase.from("sale_orders").select("*");
    if (data) {
      setOrders(data);
      if (data.length > 0) setSelectedOrder(data[0].id);
    }
  };

  const loadProcesses = async () => {
    const { data } = await supabase.from("processes").select("*").order("order_number");
    if (data) setProcesses(data);
  };

  const loadSizes = async () => {
    const { data } = await supabase
      .from("product_sizes")
      .select("*")
      .eq("sale_order_id", selectedOrder)
      .order("sr_number");
    if (data) setSizes(data);
  };

  const startEdit = (size: ProductSize) => {
    setEditingId(size.id);
    setEditData(size);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from("product_sizes")
      .update(editData)
      .eq("id", editingId);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success("Updated successfully");
      setEditingId(null);
      setEditData({});
      loadSizes();
    }
  };

  const addNewOrder = async () => {
    if (!newOrderName.trim() || !newOrderColor.trim()) {
      toast.error("Please enter order name and color");
      return;
    }

    if (selectedProcesses.length === 0) {
      toast.error("Please select at least one process");
      return;
    }

    const { data: newOrder, error: orderError } = await supabase
      .from("sale_orders")
      .insert({ name: newOrderName, color: newOrderColor })
      .select()
      .single();

    if (orderError || !newOrder) {
      toast.error("Failed to create order");
      return;
    }

    // Insert selected processes for this order
    const processLinks = selectedProcesses.map(processId => ({
      sale_order_id: newOrder.id,
      process_id: processId
    }));

    const { error: processError } = await supabase
      .from("sale_order_processes")
      .insert(processLinks);

    if (processError) {
      toast.error("Order created but failed to link processes");
      return;
    }

    if (templateOrderId) {
      const { data: templateSizes } = await supabase
        .from("product_sizes")
        .select("*")
        .eq("sale_order_id", templateOrderId);

      if (templateSizes && templateSizes.length > 0) {
        const newSizes = templateSizes.map((size) => ({
          sale_order_id: newOrder.id,
          sr_number: size.sr_number,
          finished_size_inch: size.finished_size_inch,
          finished_size_cm: size.finished_size_cm,
          elastic_inch: size.elastic_inch,
          elastic_inch_value: size.elastic_inch_value,
          elastic_cm: size.elastic_cm,
          tipping_cord_size: size.tipping_cord_size,
          quantity: size.quantity,
        }));

        const { error: sizesError } = await supabase.from("product_sizes").insert(newSizes);

        if (sizesError) {
          toast.error("Order created but failed to copy sizes");
        }
      }
    }

    toast.success("Order created successfully");
    setIsAddDialogOpen(false);
    setNewOrderName("");
    setNewOrderColor("");
    setTemplateOrderId("");
    setSelectedProcesses([]);
    setNewProcessName("");
    loadOrders();
    setSelectedOrder(newOrder.id);
  };

  const addNewProcess = async () => {
    if (!newProcessName.trim()) {
      toast.error("Please enter process name");
      return;
    }

    const maxOrder = processes.length > 0 ? Math.max(...processes.map(p => p.order_number || 0)) : 0;

    const { data, error } = await supabase
      .from("processes")
      .insert({ name: newProcessName, order_number: maxOrder + 1 })
      .select()
      .single();

    if (error || !data) {
      toast.error("Failed to create process");
      return;
    }

    toast.success("Process created successfully");
    setNewProcessName("");
    loadProcesses();
    setSelectedProcesses([...selectedProcesses, data.id]);
  };

  const toggleProcessSelection = (processId: string) => {
    setSelectedProcesses(prev =>
      prev.includes(processId)
        ? prev.filter(id => id !== processId)
        : [...prev, processId]
    );
  };

  const deleteOrder = async () => {
    if (!selectedOrder) return;

    // Delete all product sizes first
    const { error: sizesError } = await supabase
      .from("product_sizes")
      .delete()
      .eq("sale_order_id", selectedOrder);

    if (sizesError) {
      toast.error("Failed to delete order sizes");
      return;
    }

    // Delete the order
    const { error: orderError } = await supabase
      .from("sale_orders")
      .delete()
      .eq("id", selectedOrder);

    if (orderError) {
      toast.error("Failed to delete order");
      return;
    }

    toast.success("Order deleted successfully");
    setDeleteOrderDialogOpen(false);
    loadOrders();
  };

  const deleteRow = async () => {
    if (!rowToDelete) return;

    const { error } = await supabase
      .from("product_sizes")
      .delete()
      .eq("id", rowToDelete);

    if (error) {
      toast.error("Failed to delete row");
    } else {
      toast.success("Row deleted successfully");
      loadSizes();
    }

    setDeleteRowDialogOpen(false);
    setRowToDelete(null);
  };

  const loadOrderProcesses = async (orderId: string) => {
    const { data } = await supabase
      .from("sale_order_processes")
      .select(`
        id,
        process_id,
        order_number,
        processes (name)
      `)
      .eq("sale_order_id", orderId)
      .order("order_number");

    if (data) {
      setOrderProcesses(
        data.map((item: any) => ({
          id: item.id,
          process_id: item.process_id,
          name: item.processes.name,
          order_number: item.order_number,
        }))
      );
    }
  };

  const openEditProcessesDialog = async () => {
    if (!selectedOrder) return;
    await loadOrderProcesses(selectedOrder);
    setIsEditProcessesDialogOpen(true);
  };

  const moveProcessUp = async (index: number) => {
    if (index === 0) return;
    const newOrderProcesses = [...orderProcesses];
    [newOrderProcesses[index], newOrderProcesses[index - 1]] = [newOrderProcesses[index - 1], newOrderProcesses[index]];
    setOrderProcesses(newOrderProcesses);
  };

  const moveProcessDown = async (index: number) => {
    if (index === orderProcesses.length - 1) return;
    const newOrderProcesses = [...orderProcesses];
    [newOrderProcesses[index], newOrderProcesses[index + 1]] = [newOrderProcesses[index + 1], newOrderProcesses[index]];
    setOrderProcesses(newOrderProcesses);
  };

  const removeProcess = async (processLinkId: string) => {
    const { error } = await supabase
      .from("sale_order_processes")
      .delete()
      .eq("id", processLinkId);

    if (error) {
      toast.error("Failed to remove process");
    } else {
      toast.success("Process removed");
      loadOrderProcesses(selectedOrder);
    }
  };

  const addProcessToOrder = async (processId: string) => {
    if (!selectedOrder) return;

    const maxOrder = orderProcesses.length > 0 
      ? Math.max(...orderProcesses.map(p => p.order_number)) 
      : 0;

    const { error } = await supabase
      .from("sale_order_processes")
      .insert({
        sale_order_id: selectedOrder,
        process_id: processId,
        order_number: maxOrder + 1,
      });

    if (error) {
      toast.error("Failed to add process");
    } else {
      toast.success("Process added");
      loadOrderProcesses(selectedOrder);
    }
  };

  const saveProcessOrder = async () => {
    const updates = orderProcesses.map((op, index) => ({
      id: op.id,
      order_number: index + 1,
    }));

    for (const update of updates) {
      await supabase
        .from("sale_order_processes")
        .update({ order_number: update.order_number })
        .eq("id", update.id);
    }

    toast.success("Process order saved");
    setIsEditProcessesDialogOpen(false);
  };

  const selectedOrderData = orders.find((o) => o.id === selectedOrder);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Sale Order Management</h1>
            <p className="text-sm md:text-base text-muted-foreground">View and edit product specifications</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")} size="sm" className="text-xs md:text-sm">
            ← Back
          </Button>
        </div>

        <Card className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
            <Select value={selectedOrder} onValueChange={setSelectedOrder}>
              <SelectTrigger className="w-full sm:w-64">
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

            {selectedOrder && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEditProcessesDialog}
                  className="text-xs md:text-sm"
                >
                  <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Edit Processes</span>
                  <span className="sm:hidden">Processes</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOrderDialogOpen(true)}
                  className="text-xs md:text-sm"
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Delete Order</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </>
            )}
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs md:text-sm">
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Add New Order</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Sale Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Order Name</label>
                    <Input
                      placeholder="e.g., Navy Order"
                      value={newOrderName}
                      onChange={(e) => setNewOrderName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <Input
                      placeholder="e.g., Navy"
                      value={newOrderColor}
                      onChange={(e) => setNewOrderColor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Select Processes</label>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {processes.map((process) => (
                        <div key={process.id} className="flex items-center gap-2">
                          <Checkbox
                            id={process.id}
                            checked={selectedProcesses.includes(process.id)}
                            onCheckedChange={() => toggleProcessSelection(process.id)}
                          />
                          <label htmlFor={process.id} className="text-sm cursor-pointer">
                            {process.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Add New Process (Optional)</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Knitting"
                        value={newProcessName}
                        onChange={(e) => setNewProcessName(e.target.value)}
                      />
                      <Button onClick={addNewProcess} variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Copy Sizes From (Optional)</label>
                    <Select value={templateOrderId} onValueChange={setTemplateOrderId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template order" />
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
                  <Button onClick={addNewOrder} className="w-full">
                    Create Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {selectedOrderData && (
          <Card className="overflow-x-auto">
            <div className="p-3 md:p-4 border-b">
              <h2 className="text-lg md:text-2xl font-semibold">{selectedOrderData.name}</h2>
              <p className="text-sm md:text-base text-muted-foreground">Color: {selectedOrderData.color}</p>
            </div>
            <Table className="text-xs md:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Sr#</TableHead>
                  <TableHead>Finished Size (inch)</TableHead>
                  <TableHead>Finished Size (cm)</TableHead>
                  <TableHead>Elastic Inch</TableHead>
                  <TableHead>Elastic CM</TableHead>
                  <TableHead>Tipping Cord Size</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizes.map((size) => (
                  <TableRow key={size.id}>
                    {editingId === size.id ? (
                      <>
                        <TableCell>{size.sr_number}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            value={editData.finished_size_inch || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, finished_size_inch: parseFloat(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            value={editData.finished_size_cm || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, finished_size_cm: parseFloat(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.elastic_inch || ""}
                            onChange={(e) => setEditData({ ...editData, elastic_inch: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.0001"
                            value={editData.elastic_cm || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, elastic_cm: parseFloat(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={editData.tipping_cord_size || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, tipping_cord_size: parseFloat(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editData.quantity || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, quantity: parseInt(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{size.sr_number}</TableCell>
                        <TableCell>{size.finished_size_inch}</TableCell>
                        <TableCell>{size.finished_size_cm}</TableCell>
                        <TableCell>{size.elastic_inch}</TableCell>
                        <TableCell>{size.elastic_cm}</TableCell>
                        <TableCell>{size.tipping_cord_size}</TableCell>
                        <TableCell className="font-semibold">{size.quantity}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(size)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRowToDelete(size.id);
                                setDeleteRowDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <AlertDialog open={deleteOrderDialogOpen} onOpenChange={setDeleteOrderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this order? This will also delete all associated product sizes. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteRowDialogOpen} onOpenChange={setDeleteRowDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Row</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product size? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteRow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isEditProcessesDialogOpen} onOpenChange={setIsEditProcessesDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Order Processes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <h3 className="font-medium mb-2">Current Processes (Drag to Reorder)</h3>
                <div className="border rounded-md divide-y">
                  {orderProcesses.map((op, index) => (
                    <div key={op.id} className="flex items-center justify-between p-3">
                      <span className="font-medium">{op.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveProcessUp(index)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveProcessDown(index)}
                          disabled={index === orderProcesses.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeProcess(op.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Add Process</h3>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {processes
                    .filter((p) => !orderProcesses.some((op) => op.process_id === p.id))
                    .map((process) => (
                      <div key={process.id} className="flex items-center justify-between">
                        <span className="text-sm">{process.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addProcessToOrder(process.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveProcessOrder} className="flex-1">
                  Save Order
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditProcessesDialogOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SaleOrderManagement;
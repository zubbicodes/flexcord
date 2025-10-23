import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Save, Edit2, X, Plus } from "lucide-react";

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

  useEffect(() => {
    loadOrders();
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

    const { data: newOrder, error: orderError } = await supabase
      .from("sale_orders")
      .insert({ name: newOrderName, color: newOrderColor })
      .select()
      .single();

    if (orderError || !newOrder) {
      toast.error("Failed to create order");
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
    loadOrders();
    setSelectedOrder(newOrder.id);
  };

  const selectedOrderData = orders.find((o) => o.id === selectedOrder);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Sale Order Management</h1>
            <p className="text-muted-foreground">View and edit product specifications</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Back to Dashboard
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex gap-4 items-center">
            <Select value={selectedOrder} onValueChange={setSelectedOrder}>
              <SelectTrigger className="w-64">
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
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Order
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
          <Card className="overflow-auto">
            <div className="p-4 border-b">
              <h2 className="text-2xl font-semibold">{selectedOrderData.name}</h2>
              <p className="text-muted-foreground">Color: {selectedOrderData.color}</p>
            </div>
            <Table>
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
                          <Button size="sm" variant="outline" onClick={() => startEdit(size)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SaleOrderManagement;
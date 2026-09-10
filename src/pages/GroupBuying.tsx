import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Users, MapPin, Clock, ShoppingCart, CheckCircle } from "lucide-react";

export default function GroupBuying() {
  const [joinOpen, setJoinOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const { data: groups } = trpc.trust.groupOrders.list.useQuery();
  const join = trpc.trust.groupOrders.join.useMutation({
    onSuccess: () => { setJoinOpen(false); alert("Joined successfully!"); },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Community Group Buying</h1>
        <p className="text-muted-foreground">Buy in bulk through trusted local agents. Save money, pick up at a Souq Hub.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups?.map((g: any) => {
          const progress = Math.round((g.currentQuantity / g.targetQuantity) * 100);
          const savings = Math.round(((g.originalPrice - g.unitPrice) / g.originalPrice) * 100);
          return (
            <Card key={g.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{g.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{g.agent?.town}</CardDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Save {savings}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">UGX {g.unitPrice.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground line-through">UGX {g.originalPrice.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>{g.currentQuantity} of {g.targetQuantity} ordered</span><span className="font-medium">{progress}%</span></div>
                  <Progress value={progress} className="h-2" />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{g.participantCount || 0} members</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(g.deadline).toLocaleDateString("en-UG")}</span>
                </div>
                <Button className="w-full" onClick={() => { setSelected(g); setQty(1); setJoinOpen(true); }}>
                  <ShoppingCart className="h-4 w-4 mr-2" /> Join Group Order
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Join {selected?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm">Unit price: <strong>UGX {selected?.unitPrice?.toLocaleString()}</strong></p>
            </div>
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} />
            </div>
            <p className="text-sm font-medium">Total: UGX {((selected?.unitPrice || 0) * qty).toLocaleString()}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button onClick={() => join.mutate({ groupOrderId: selected.id, phone, name, quantity: qty })} disabled={join.isPending || !name || !phone}>
              {join.isPending ? "Joining..." : <><CheckCircle className="h-4 w-4 mr-2" /> Confirm</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

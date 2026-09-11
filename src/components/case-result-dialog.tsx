"use client";

import { Check, Key, Sparkles, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Dish } from "@/lib/lunch";
import "./case-result.css";

export function CaseResultDialog({ open, dishes, busy, locked, canDraw, selectedId, error, onOpenChange, onChoose, onAgain }: {
  open: boolean;
  dishes: Dish[];
  busy: boolean;
  locked: boolean;
  canDraw: boolean;
  selectedId?: string;
  error: string;
  onOpenChange: (open: boolean) => void;
  onChoose: (dishId: string) => Promise<void>;
  onAgain: () => void;
}) {
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="case-result-dialog" showCloseButton={false}>
      <Button className="case-result-close" size="icon-sm" variant="ghost" aria-label="Đóng kết quả mở hòm" disabled={busy} onClick={() => onOpenChange(false)}><X/></Button>
      <header className="case-result-header">
        <span className="case-result-eyebrow"><Sparkles size={15}/> MỞ HÒM THÀNH CÔNG</span>
        <DialogTitle>{dishes.length === 1 ? "Món ngon đã lộ diện." : "Ba gợi ý cho suất của bạn."}</DialogTitle>
        <DialogDescription>{dishes.length === 1 ? "Vũ trụ đã chọn. Còn bạn thì sao?" : "Chọn một món để đặt cho riêng mình."}</DialogDescription>
      </header>
      <div className={`case-prizes ${dishes.length === 1 ? "single-prize" : "multiple-prizes"}`}>
        {dishes.map((dish, index) => <article className="case-prize" key={dish.id} style={{ animationDelay: `${index * 120}ms` }}>
          <div className="case-prize-stage" aria-hidden="true"><div className="case-prize-halo"/><span>{dish.emoji}</span></div>
          <div className="case-prize-info"><span className="case-prize-category">{dish.category}</span><h3>{dish.name}</h3><p>{dish.restaurant}</p><strong className="case-prize-price">{dish.price ? `${new Intl.NumberFormat("vi-VN").format(dish.price)}đ` : "Chưa có giá"}</strong></div>
          <div className="case-prize-actions">
            <Button className="case-prize-choose" size="lg" disabled={busy || locked} onClick={() => void onChoose(dish.id)}><Check/>{selectedId === dish.id ? "Đã chọn món này" : "Chọn món này"}</Button>
            {dishes.length === 1 && canDraw && <Button className="case-open-again" variant="outline" size="lg" disabled={busy || locked} onClick={onAgain}><Key/>Mở hòm lại</Button>}
          </div>
        </article>)}
      </div>
      {error && (
        <Alert variant="destructive" className="case-result-error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {(locked || (dishes.length > 1 && canDraw)) && (
        <footer className="case-result-footer">
          {locked && <span>Đơn nhóm đã khóa.</span>}
          {dishes.length > 1 && canDraw && (
            <Button
              variant="outline"
              disabled={busy || locked}
              onClick={onAgain}
            >
              <Key />
              Mở hòm lại
            </Button>
          )}
        </footer>
      )}
    </DialogContent>
  </Dialog>;
}

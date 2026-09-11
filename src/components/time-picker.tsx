"use client";

import { useState } from "react";
import { Check, Clock3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const hours = Array.from({ length: 24 }, (_, value) =>
  String(value).padStart(2, "0"),
);
const minutes = Array.from({ length: 60 }, (_, value) =>
  String(value).padStart(2, "0"),
);

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || !hours.includes(match[1]) || !minutes.includes(match[2]))
    return { hour: "", minute: "" };
  return { hour: match[1], minute: match[2] };
}

export function TimePicker({
  id,
  value,
  onChange,
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseTime(value));

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setDraft(parseTime(value));
    setOpen(nextOpen);
  }

  function commit() {
    if (!draft.hour || !draft.minute) return;
    onChange(`${draft.hour}:${draft.minute}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="time-picker-trigger"
          disabled={disabled}
          aria-label="Chọn giờ tự động khóa đơn"
        >
          <Clock3 data-icon="inline-start" />
          <span>{value || "Chọn giờ khóa đơn"}</span>
          {value && <small>UTC+7</small>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="time-picker-popover" align="start">
        <div className="time-picker-heading">
          <strong>Chọn giờ khóa đơn</strong>
          <span>Giờ Việt Nam · UTC+7</span>
        </div>
        <div className="time-picker-fields">
          <Select
            value={draft.hour}
            onValueChange={(hour) => setDraft((current) => ({ ...current, hour }))}
          >
            <SelectTrigger
              className="time-picker-select"
              aria-label="Chọn giờ"
            >
              <SelectValue placeholder="Giờ" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="time-picker-select-content"
            >
              {hours.map((hour) => (
                <SelectItem key={hour} value={hour}>
                  {hour} giờ
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="time-picker-colon" aria-hidden="true">
            :
          </span>
          <Select
            value={draft.minute}
            onValueChange={(minute) =>
              setDraft((current) => ({ ...current, minute }))
            }
          >
            <SelectTrigger
              className="time-picker-select"
              aria-label="Chọn phút"
            >
              <SelectValue placeholder="Phút" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="time-picker-select-content"
            >
              {minutes.map((minute) => (
                <SelectItem key={minute} value={minute}>
                  {minute} phút
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="time-picker-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            disabled={!value}
          >
            <RotateCcw data-icon="inline-start" />
            Bỏ hẹn giờ
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={commit}
            disabled={!draft.hour || !draft.minute}
          >
            <Check data-icon="inline-start" />
            Xong
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

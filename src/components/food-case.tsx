"use client";

import type { CSSProperties } from "react";
import { Crosshair, PackageOpen, Sparkles } from "lucide-react";
import type { Dish } from "@/lib/lunch";

const WINNING_INDEX = 34;
export const CASE_ROLL_DURATION = 6000;
export const CASE_LANE_DELAY = 240;
export type CaseOpening = {
  id: string;
  lanes: { cards: Dish[]; winner: Dish }[];
  duration: number;
};

// The random fillers only decorate the reel. Its landing card is the saved result.
export function prepareCase(dishes: Dish[], winners: Dish[]): CaseOpening {
  return {
    id: crypto.randomUUID(),
    duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : CASE_ROLL_DURATION,
    lanes: winners.map((winner) => {
      const cards = Array.from(
        { length: 40 },
        () => dishes[Math.floor(Math.random() * dishes.length)],
      );
      cards[WINNING_INDEX] = winner;
      return { cards, winner };
    }),
  };
}

export function FoodCase({
  dishes,
  opening,
  spinning,
}: {
  dishes: Dish[];
  opening: CaseOpening | null;
  spinning: boolean;
}) {
  const lanes = opening?.lanes ?? [
    {
      cards: dishes.length
        ? Array.from({ length: 9 }, (_, i) => dishes[i % dishes.length])
        : [],
      winner: null,
    },
  ];
  return (
    <div
      className={`food-case ${spinning ? "is-opening" : opening ? "is-revealed" : "is-idle"}`}
    >
      <div className="case-toolbar">
        <span>
          <PackageOpen size={16} /> HÒM BỮA TRƯA
        </span>
        <span>{spinning ? "ĐANG MỞ" : opening ? "ĐÃ MỞ HÒM" : "SẴN SÀNG"}</span>
      </div>
      <div className="case-lanes" key={opening?.id ?? "idle"}>
        {lanes.map((lane, laneIndex) => (
          <div className="case-lane" key={laneIndex}>
            {lanes.length > 1 && (
              <span className="case-lane-number">0{laneIndex + 1}</span>
            )}
            <div className="case-window" aria-hidden="true">
              <div className="case-pointer" />
              {lane.cards.length ? (
                <div
                  className={`case-track ${opening ? "case-track-running" : ""}`}
                  style={
                    {
                      "--roll-duration": `${opening?.duration ?? 0}ms`,
                      "--roll-delay": `${opening?.duration ? laneIndex * CASE_LANE_DELAY : 0}ms`,
                    } as CSSProperties
                  }
                >
                  {lane.cards.map((dish, index) => (
                    <div
                      key={index}
                      className={`case-item case-color-${dishes.findIndex((d) => d.id === dish.id) % 4} ${opening && index === WINNING_INDEX ? "case-winning-item" : ""}`}
                    >
                      <span className="case-item-category">
                        {dish.category}
                      </span>
                      <span className="case-item-emoji">{dish.emoji}</span>
                      <strong>{dish.name}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="case-empty">
                  <PackageOpen size={34} />
                  <span>Thêm món vào thực đơn để mở hòm</span>
                </div>
              )}
            </div>
            {opening && !spinning && (
              <div className="case-reveal" aria-live="polite">
                <Sparkles size={15} />
                <strong>{lane.winner?.name}</strong>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="case-caption">
        <span className="case-caption-line" />
        <Crosshair size={14} />
        <span>Món dừng ở vạch giữa là món trúng</span>
        <span className="case-caption-line" />
      </div>
    </div>
  );
}

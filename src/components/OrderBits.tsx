import { CheckIcon } from "@/components/Icons";
import { translate, type DictKey } from "@/shared/i18n";
import type { Lang, OrderStatus, PaymentStatus } from "@/shared/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-sand text-ink-soft",
  confirmed: "bg-blue-50 text-blue-800",
  processing: "bg-amber-50 text-amber-800",
  shipped: "bg-indigo-50 text-indigo-800",
  delivered: "bg-green-50 text-ok",
  cancelled: "bg-brand-light text-brand-dark",
};

const PAY_STYLE: Record<PaymentStatus, string> = {
  unpaid: "bg-sand text-ink-soft",
  paid: "bg-green-50 text-ok",
  failed: "bg-brand-light text-brand-dark",
  refunded: "bg-sand text-ink-soft",
};

export function StatusBadge({ status, lang }: { status: OrderStatus; lang: Lang }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {translate(lang, `status.${status}` as DictKey)}
    </span>
  );
}

export function PaymentBadge({ status, lang }: { status: PaymentStatus; lang: Lang }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${PAY_STYLE[status]}`}>
      {translate(lang, `pay.${status}` as DictKey)}
    </span>
  );
}

const STEPS: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export function Timeline({ status, lang }: { status: OrderStatus; lang: Lang }) {
  if (status === "cancelled") {
    return (
      <p className="rounded-xl bg-brand-light px-4 py-3 text-sm font-medium text-brand-dark">
        {translate(lang, "status.cancelled")}
      </p>
    );
  }
  const current = STEPS.indexOf(status);
  return (
    <ol className="flex items-start" aria-label={translate(lang, "orders.track")}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                className={`absolute left-[-50%] top-4 h-0.5 w-full ${i <= current ? "bg-ok" : "bg-line"}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                done ? "border-ok bg-ok text-white" : "border-line bg-white text-ink-mute"
              }`}
            >
              {done ? <CheckIcon width={16} height={16} strokeWidth={2.4} /> : <span className="text-xs">{i + 1}</span>}
            </span>
            <span className={`mt-2 px-0.5 text-[11px] leading-tight sm:text-xs ${i === current ? "font-semibold" : "text-ink-soft"}`}>
              {translate(lang, `status.${step}` as DictKey)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ne" ? "ne-NP" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  });
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";

// ⚠️ TEMPLATE TEXT. Have a lawyer in Nepal review and adapt these before you launch.
// Replace the [bracketed] parts with your real business details.

type Page = { title: string; body: string[] };

function pages(): Record<string, Page> {
  const contact = [site.supportEmail, site.supportPhone].filter(Boolean).join(" / ") || "[your contact details]";
  return {
    privacy: {
      title: "Privacy policy",
      body: [
        `${site.name} ("we", "us") respects your privacy. This page explains what we collect and why.`,
        "What we collect: your name, mobile number, email address, delivery address and order history. We collect this only to create your account, deliver your orders and contact you about them.",
        "Payments: online payments are handled by eSewa. We never see or store your eSewa password, MPIN or card details. We only receive a confirmation that a payment succeeded.",
        "Sharing: we share your name, phone number and address with delivery partners only so they can deliver your order. We do not sell your personal information.",
        "Storage and security: your data is stored with our hosting provider (Supabase) and protected with access controls. You can ask us to correct or delete your account data at any time.",
        `Contact: ${contact}.`,
      ],
    },
    terms: {
      title: "Terms of service",
      body: [
        `By placing an order with ${site.name} you agree to these terms.`,
        "Prices are in Nepalese Rupees (NPR). We may change prices or stock at any time; the price shown when you place your order is the price you pay.",
        "Orders: an order is confirmed when we accept it. We may cancel an order if an item is unavailable or the details look incorrect; any online payment will be refunded.",
        "Delivery: we deliver across Nepal. Delivery times are estimates. Please provide a correct address and a phone number that can be reached.",
        "Cash on delivery: please keep the exact amount ready. Repeated refusal of delivery may lead to cash-on-delivery being disabled for your account.",
        "[Add your PAN / VAT details and registered business address here.]",
        `Contact: ${contact}.`,
      ],
    },
    returns: {
      title: "Returns & exchange",
      body: [
        "If something is wrong with your order, contact us within [7] days of delivery with your order number and a photo.",
        "Eligible items: unused, unwashed items with original tags and packaging. Items that arrive damaged or incorrect are always eligible.",
        "How it works: we will arrange an exchange or refund once we have received and checked the item. Refunds for eSewa payments go back to the original eSewa account; cash-on-delivery refunds are sent to a wallet or bank account of your choice.",
        "Not eligible: innerwear, items made to order, and items damaged after delivery.",
        `Contact: ${contact}.`,
      ],
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages()[slug];
  return { title: page?.title ?? "Not found" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages()[slug];
  if (!page) notFound();
  return (
    <div className="container-page max-w-2xl py-10 sm:py-16">
      <h1 className="text-3xl font-semibold sm:text-4xl">{page.title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
        {page.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

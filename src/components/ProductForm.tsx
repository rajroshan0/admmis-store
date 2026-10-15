"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";
import { slugify } from "@/shared/format";
import type { Category, Product } from "@/shared/types";

interface VariantRow {
  id?: string;
  size: string;
  color: string;
  stock: string;
}

export default function ProductForm({ categories, product }: { categories: Category[]; product?: Product }) {
  const router = useRouter();
  const isEdit = !!product;

  const [nameEn, setNameEn] = useState(product?.name_en ?? "");
  const [nameNe, setNameNe] = useState(product?.name_ne ?? "");
  const [descEn, setDescEn] = useState(product?.description_en ?? "");
  const [descNe, setDescNe] = useState(product?.description_ne ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAt, setCompareAt] = useState(product?.compare_at_price ? String(product.compare_at_price) : "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(
    (product?.product_variants ?? []).map((v) => ({ id: v.id, size: v.size ?? "", color: v.color ?? "", stock: String(v.stock) })),
  );
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const added: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const { blob, ext } = await resizeImage(file);
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
        if (upErr) throw new Error(upErr.message);
        added.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
      }
      setImages((prev) => [...prev, ...added]);
    } catch (e) {
      setError(`Image upload failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setUploading(false);
    }
  }

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeVariant(i: number) {
    const row = variants[i];
    if (row.id) setRemovedVariantIds((ids) => [...ids, row.id!]);
    setVariants((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = Number(price);
    const compareNum = compareAt ? Number(compareAt) : null;
    if (!nameEn.trim()) return setError("English name is required.");
    if (!Number.isInteger(priceNum) || priceNum < 0) return setError("Price must be a whole number of rupees.");
    if (compareNum !== null && (!Number.isInteger(compareNum) || compareNum < 0)) return setError("Compare-at price must be a whole number.");
    if (variants.some((v) => !/^\d+$/.test(v.stock.trim()))) return setError("Stock must be a whole number (0 or more) on every variant row.");
    const keys = variants.map((v) => `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`);
    if (new Set(keys).size !== keys.length) return setError("Two variants have the same size and colour.");

    setBusy(true);
    const supabase = createClient();
    try {
      const row = {
        name_en: nameEn.trim(),
        name_ne: nameNe.trim() || null,
        description_en: descEn.trim() || null,
        description_ne: descNe.trim() || null,
        price: priceNum,
        compare_at_price: compareNum,
        category_id: categoryId || null,
        images,
        is_active: isActive,
        is_featured: isFeatured,
      };

      let productId = product?.id;
      if (isEdit && productId) {
        const { error: err } = await supabase.from("products").update(row).eq("id", productId);
        if (err) throw err;
      } else {
        const base = slugify(nameEn) || "product";
        const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
        const { data, error: err } = await supabase.from("products").insert({ ...row, slug }).select("id").single();
        if (err) throw err;
        productId = data.id;
      }

      if (removedVariantIds.length > 0) {
        const { error: err } = await supabase.from("product_variants").delete().in("id", removedVariantIds);
        if (err) throw err;
      }
      for (const v of variants) {
        const payload = {
          product_id: productId!,
          size: v.size.trim() || null,
          color: v.color.trim() || null,
          stock: Number(v.stock),
        };
        const { error: err } = v.id
          ? await supabase.from("product_variants").update(payload).eq("id", v.id)
          : await supabase.from("product_variants").insert(payload);
        if (err) throw err;
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "unknown error";
      setError(`Could not save: ${msg}`);
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!product) return;
    if (!window.confirm("Delete this product permanently? Past orders keep their details. To just hide it, untick “Visible in shop” instead.")) return;
    setBusy(true);
    const { error: err } = await createClient().from("products").delete().eq("id", product.id);
    if (err) {
      setBusy(false);
      return setError(`Could not delete: ${err.message}`);
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6" noValidate>
      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-name-en">Name (English) *</label>
            <input id="p-name-en" className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="p-name-ne">Name (Nepali)</label>
            <input id="p-name-ne" className="input" value={nameNe} onChange={(e) => setNameNe(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p-desc-en">Description (English)</label>
            <textarea id="p-desc-en" className="input min-h-[110px]" value={descEn} onChange={(e) => setDescEn(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p-desc-ne">Description (Nepali)</label>
            <textarea id="p-desc-ne" className="input min-h-[110px]" value={descNe} onChange={(e) => setDescNe(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p-price">Price (NPR) *</label>
            <input id="p-price" className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="p-compare">Old price (NPR, shows a discount)</label>
            <input id="p-compare" className="input" inputMode="numeric" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p-cat">Category</label>
            <select id="p-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— none —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2.5 pb-1">
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#d42a5b]" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Visible in shop
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#d42a5b]" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              Featured on home page
            </label>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">Photos</h2>
        <p className="mb-4 text-sm text-ink-soft">The first photo is the main image. Photos are resized automatically.</p>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-28 w-24 rounded-lg border border-line object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-paper">Main</span>}
              <div className="mt-1 flex justify-between text-xs">
                {i > 0 ? (
                  <button type="button" className="text-ink-soft hover:text-ink" onClick={() => setImages((a) => [src, ...a.filter((x) => x !== src)])}>Make main</button>
                ) : <span />}
                <button type="button" className="text-brand hover:underline" onClick={() => setImages((a) => a.filter((x) => x !== src))}>Remove</button>
              </div>
            </div>
          ))}
          <label className="flex h-28 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-center text-xs text-ink-soft hover:border-ink">
            {uploading ? "Uploading…" : "+ Add photos"}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">Sizes, colours &amp; stock</h2>
        <p className="mb-4 text-sm text-ink-soft">One row per combination. Leave size or colour empty if it doesn’t apply (e.g. a shawl has no size). A product needs at least one row to be sold.</p>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={v.id ?? `new-${i}`} className="grid grid-cols-[1fr_1fr_90px_auto] items-center gap-2">
              <input className="input !min-h-[40px]" placeholder="Size (S, M, L…)" aria-label="Size" value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} />
              <input className="input !min-h-[40px]" placeholder="Colour" aria-label="Colour" value={v.color} onChange={(e) => updateVariant(i, { color: e.target.value })} />
              <input className="input !min-h-[40px]" placeholder="Stock" aria-label="Stock" inputMode="numeric" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} />
              <button type="button" className="px-2 text-sm text-brand hover:underline" onClick={() => removeVariant(i)}>Remove</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-3 !min-h-[40px]" onClick={() => setVariants((r) => [...r, { size: "", color: "", stock: "0" }])}>
          + Add row
        </button>
      </section>

      {error && <p role="alert" className="rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || uploading} className="btn-primary">{busy ? "Saving…" : isEdit ? "Save changes" : "Create product"}</button>
        <Link href="/admin/products" className="btn-ghost">Cancel</Link>
        {isEdit && <button type="button" onClick={onDelete} disabled={busy} className="btn-danger ml-auto">Delete product</button>}
      </div>
    </form>
  );
}

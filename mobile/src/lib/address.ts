import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

// The delivery address is kept on this phone so the cart and checkout can show it.
const KEY = "admmis-address-v1";

export interface Address {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
}

export const EMPTY_ADDRESS: Address = { name: "", phone: "", address: "", city: "", district: "" };

export function addressComplete(a: Address): boolean {
  return !!(a.name.trim() && a.phone.trim() && a.address.trim() && a.city.trim());
}

export async function loadAddress(): Promise<Address> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const d = raw ? (JSON.parse(raw) as Partial<Address>) : {};
    return {
      name: String(d.name ?? ""),
      phone: String(d.phone ?? ""),
      address: String(d.address ?? ""),
      city: String(d.city ?? ""),
      district: String(d.district ?? ""),
    };
  } catch {
    return EMPTY_ADDRESS;
  }
}

export async function saveAddress(a: Address): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

export function useAddress() {
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [ready, setReady] = useState(false);
  const reload = useCallback(() => {
    void loadAddress().then((a) => {
      setAddress(a);
      setReady(true);
    });
  }, []);
  useEffect(reload, [reload]);
  return { address, ready, reload };
}

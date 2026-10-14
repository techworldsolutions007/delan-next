'use client';
// import React, { useMemo, useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";

// /* Read API key from env (Vite + SSR-safe) */
// const envGet = (k) => (typeof process !== "undefined" && process.env && process.env[k]) || "";

// const DELHIVERY_API_KEY = (envGet("NEXT_PUBLIC_DELHIVERY_API_KEY") || "").trim();

// export default function TrackOrder() {
//   const [searchBy, setSearchBy] = useState("order"); // "order" | "awb"
//   const [orderId, setOrderId] = useState("");
//   const [mobile, setMobile] = useState("");
//   const [touched, setTouched] = useState(false);

//   const [loading, setLoading] = useState(false);
//   const [apiError, setApiError] = useState("");
//   const [shipments, setShipments] = useState([]);
//   const [lookedUp, setLookedUp] = useState(false);

//   const isMobileValid = (val) => /^\+?\d{6,15}$/.test(val.trim());
//   const isOrderIdValid = (val) => val.trim().length > 0;

//   const isValid = useMemo(() => {
//     if (searchBy === "awb") return isOrderIdValid(orderId);
//     return isOrderIdValid(orderId) && isMobileValid(mobile);
//   }, [searchBy, orderId, mobile]);

//   /* --- Normalize Delhivery responses into a single shape --- */
//   function normalizeTracking(json) {
//     const out = [];
//     const arr =
//       (Array.isArray(json?.ShipmentData) && json.ShipmentData) ||
//       (Array.isArray(json?.shipments) && json.shipments) ||
//       (Array.isArray(json) && json) ||
//       [];

//     for (const item of arr) {
//       const ship = item?.Shipment || item?.shipment || item;
//       if (!ship || typeof ship !== "object") continue;

//       const awb =
//         ship.AWB || ship.awb || ship.waybill || ship.wbn || item?.awb || item?.waybill || "";
//       const reference =
//         ship.ReferenceNo ||
//         ship.reference ||
//         ship.order ||
//         ship.refnum ||
//         ship.ref_id ||
//         item?.refnum ||
//         "";
//       const status =
//         ship.Status ||
//         ship.status ||
//         ship["Current Status"] ||
//         ship["current_status"] ||
//         item?.status ||
//         "";
//       const origin =
//         ship.Origin || ship.origin || ship.pickup_city || ship.from || ship.pickup_name || "";
//       const destination =
//         ship.Destination ||
//         ship.destination ||
//         ship.to_city ||
//         ship.to ||
//         ship.delivery_city ||
//         "";

//       const scansSrc =
//         item?.Scans ||
//         item?.scans ||
//         ship?.Scans ||
//         ship?.scans ||
//         item?.ScanDetail ||
//         ship?.ScanDetail ||
//         [];

//       const scans = [];
//       if (Array.isArray(scansSrc)) {
//         for (const s of scansSrc) {
//           const sd = s?.ScanDetail || s?.scan_detail || s;
//           scans.push({
//             time:
//               sd?.ScanDateTime ||
//               sd?.scan_datetime ||
//               sd?.DateTime ||
//               sd?.date ||
//               s?.Time ||
//               s?.time ||
//               "",
//             status:
//               sd?.ScanType ||
//               sd?.scan_type ||
//               sd?.Status ||
//               sd?.status ||
//               s?.Status ||
//               s?.status ||
//               "",
//             location:
//               sd?.ScannedLocation ||
//               sd?.location ||
//               s?.Location ||
//               s?.location ||
//               ship?.CurrentLocation ||
//               "",
//             instructions: sd?.Instructions || sd?.Instruction || s?.Instructions || s?.instruction || "",
//           });
//         }
//       }

//       scans.sort((a, b) => {
//         const ta = Date.parse(a.time || "");
//         const tb = Date.parse(b.time || "");
//         if (Number.isFinite(ta) && Number.isFinite(tb)) return tb - ta;
//         return 0;
//       });

//       out.push({ awb, reference, status, origin, destination, scans });
//     }

//     return out;
//   }

//   async function fetchDelhivery({ by, value }) {
//     const qs = new URLSearchParams();
//     qs.set(by, value.trim());
//     qs.set("verbose", "1");

//     const url = `https://track.delhivery.com/api/v1/packages/json/?${qs.toString()}`;
//     const headers = { Accept: "application/json" };
//     if (DELHIVERY_API_KEY) headers["Authorization"] = `Token ${DELHIVERY_API_KEY}`;

//     const res = await fetch(url, { headers, method: "GET" });
//     if (!res.ok) {
//       const txt = await res.text().catch(() => "");
//       throw new Error(txt || res.statusText || `Delhivery tracking failed (status ${res.status})`);
//     }
//     const data = await res.json().catch(() => ({}));
//     return data;
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setTouched(true);
//     setApiError("");
//     setShipments([]);
//     setLookedUp(true);

//     if (!isValid) return;

//     try {
//       setLoading(true);
//       const data =
//         searchBy === "awb"
//           ? await fetchDelhivery({ by: "waybill", value: orderId })
//           : await fetchDelhivery({ by: "ref_ids", value: orderId });

//       const norm = normalizeTracking(data);
//       setShipments(norm);
//       if (!norm.length) setApiError("No tracking info found for the provided details.");
//     } catch (err) {
//       setApiError(err?.message || "Unable to fetch tracking details.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-16 md:pt-24">
//       <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-8 text-center">
//         Track your shipment
//       </h1>

//       <div className="w-full max-w-4xl">
//         <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 p-8 shadow-sm">
//           {/* Search by */}
//           <div className="flex items-center gap-6 mb-6">
//             <span className="text-sm font-medium montserrat-500">Search by</span>

//             <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
//               <input
//                 type="radio"
//                 name="searchBy"
//                 value="order"
//                 checked={searchBy === "order"}
//                 onChange={() => setSearchBy("order")}
//                 className="accent-primary bg-primary"
//               />
//               <span className="montserrat-500">Order ID</span>
//             </label>

//             <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
//               <input
//                 type="radio"
//                 name="searchBy"
//                 value="awb"
//                 checked={searchBy === "awb"}
//                 onChange={() => setSearchBy("awb")}
//                 className="accent-primary bg-primary"
//               />
//               <span className="montserrat-500">AWB Number</span>
//             </label>
//           </div>

//           {/* Inputs */}
//           <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
//             <div className={searchBy === "awb" ? "md:col-span-10" : "md:col-span-5"}>
//               <Label htmlFor="orderId" className="text-sm montserrat-500">
//                 {searchBy === "order" ? "Order ID" : "AWB Number"}{" "}
//                 <span className="text-pink-600">*</span>
//               </Label>
//               <Input
//                 id="orderId"
//                 placeholder={searchBy === "order" ? "Enter order id" : "Enter AWB number"}
//                 value={orderId}
//                 onChange={(e) => setOrderId(e.target.value)}
//                 className="mt-2 bg-white h-12 montserrat-500"
//               />
//               {touched && !isOrderIdValid(orderId) && (
//                 <p className="mt-1 text-xs text-red-600 montserrat-500">This field is required.</p>
//               )}
//             </div>

//             {searchBy === "order" && (
//               <div className="md:col-span-5">
//                 <Label htmlFor="mobile" className="text-sm montserrat-500">
//                   Mobile Number <span className="text-pink-600">*</span>
//                 </Label>
//                 <Input
//                   id="mobile"
//                   type="tel"
//                   placeholder="Enter mobile number"
//                   value={mobile}
//                   onChange={(e) => setMobile(e.target.value)}
//                   className="mt-2 bg-white h-12 montserrat-500"
//                 />
//                 {touched && !isMobileValid(mobile) && (
//                   <p className="mt-1 text-xs text-red-600 montserrat-500">
//                     Enter a valid phone number (digits only, include country code if needed).
//                   </p>
//                 )}
//               </div>
//             )}

//             <div className="md:col-span-2 flex justify-end">
//               <Button
//                 type="submit"
//                 className={`h-12 w-full rounded-md montserrat-500 ${
//                   isValid ? "" : "opacity-60 cursor-not-allowed"
//                 }`}
//                 disabled={!isValid || loading}
//               >
//                 {loading ? "Tracking..." : "Track Order"}
//               </Button>
//             </div>
//           </div>
//         </form>

//         {/* Results */}
//         {lookedUp && (
//           <div className="mt-6">
//             {apiError ? (
//               <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
//                 {apiError}
//                 {!DELHIVERY_API_KEY && (
//                   <div className="mt-1">
//                     Tip: set <code className="font-mono">VITE_DELHIVERY_API_KEY</code> in your
//                     environment.
//                   </div>
//                 )}
//               </div>
//             ) : loading ? (
//               <div className="rounded-lg border p-4">
//                 <div className="h-4 w-40 bg-muted animate-pulse rounded mb-2" />
//                 <div className="h-4 w-64 bg-muted animate-pulse rounded mb-2" />
//                 <div className="h-4 w-72 bg-muted animate-pulse rounded" />
//               </div>
//             ) : shipments.length === 0 ? (
//               <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
//                 No results yet.
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 {shipments.map((s, idx) => (
//                   <div
//                     key={`${s.awb || s.reference || idx}-${idx}`}
//                     className="rounded-xl border border-gray-100 p-5 shadow-sm"
//                   >
//                     <div className="grid gap-3 sm:grid-cols-2">
//                       <div>
//                         <p className="text-sm text-muted-foreground">AWB</p>
//                         <p className="font-medium">{s.awb || "-"}</p>
//                       </div>
//                       <div>
//                         <p className="text-sm text-muted-foreground">Reference</p>
//                         <p className="font-medium">{s.reference || "-"}</p>
//                       </div>
//                       <div>
//                         <p className="text-sm text-muted-foreground">Status</p>
//                         <p className="font-medium">{s.status || "-"}</p>
//                       </div>
//                       <div className="flex items-center gap-6">
//                         <div>
//                           <p className="text-sm text-muted-foreground">Origin</p>
//                           <p className="font-medium">{s.origin || "-"}</p>
//                         </div>
//                         <div>
//                           <p className="text-sm text-muted-foreground">Destination</p>
//                           <p className="font-medium">{s.destination || "-"}</p>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Timeline */}
//                     <div className="mt-4">
//                       <p className="mb-2 text-sm text-muted-foreground">Tracking updates</p>
//                       {Array.isArray(s.scans) && s.scans.length ? (
//                         <ol className="relative border-l pl-4">
//                           {s.scans.map((e, i) => (
//                             <li key={i} className="mb-4 ml-1">
//                               <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-primary" />
//                               <div className="text-sm text-muted-foreground">
//                                 {e.time ? new Date(e.time).toLocaleString() : "-"}
//                               </div>
//                               <div className="font-medium">{e.status || "-"}</div>
//                               {(e.location || e.instructions) && (
//                                 <div className="text-sm text-muted-foreground">
//                                   {e.location || ""} {e.location && e.instructions ? "• " : ""}
//                                   {e.instructions || ""}
//                                 </div>
//                               )}
//                             </li>
//                           ))}
//                         </ol>
//                       ) : (
//                         <div className="text-sm text-muted-foreground">No scan events available.</div>
//                       )}
//                     </div>

//                     {s.awb && (
//                       <div className="mt-4">
//                         <a
//                           className="text-sm underline text-primary"
//                           href={`https://www.delhivery.com/track/package/${encodeURIComponent(s.awb)}`}
//                           target="_blank"
//                           rel="noreferrer"
//                         >
//                           View on Delhivery
//                         </a>
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function TrackOrder() {
  const [awb, setAwb] = useState("");
  const [touched, setTouched] = useState(false);

  const awbTrim = useMemo(() => String(awb || "").trim(), [awb]);
  const isAwbValid = useMemo(() => awbTrim.length > 0, [awbTrim]);

  const delhiveryUrl = useMemo(() => {
    return isAwbValid
      ? `https://www.delhivery.com/track/package/${encodeURIComponent(awbTrim)}`
      : "";
  }, [isAwbValid, awbTrim]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isAwbValid) return;

    // Redirect / open Delhivery tracking in a new tab
    window.open(delhiveryUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-white px-4 pt-16 md:pt-24">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-8 text-center">
          Track your shipment
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl rounded-xl border border-gray-100 p-6 md:p-8 shadow-sm"
        >
          {/* Keep only label+input in row, helper text below for perfect alignment */}
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="awb" className="text-sm montserrat-500">
                AWB Number <span className="text-pink-600">*</span>
              </Label>

              <Input
                id="awb"
                placeholder="Enter AWB number"
                value={awb}
                onChange={(e) => setAwb(e.target.value)}
                className="mt-2 bg-white h-12 montserrat-500"
                inputMode="numeric"
                autoComplete="off"
              />

              {touched && !isAwbValid && (
                <p className="mt-1 text-xs text-red-600 montserrat-500">
                  AWB Number is required.
                </p>
              )}
            </div>

            <div className="md:w-44">
              <Button
                type="submit"
                className={`h-12 w-full rounded-md montserrat-500 ${
                  isAwbValid ? "" : "opacity-60 cursor-not-allowed"
                }`}
                disabled={!isAwbValid}
              >
                Track Order
              </Button>
            </div>
          </div>

          <p className="mt-2 text-xs text-muted-foreground montserrat-500">
            You can find your AWB in shipping SMS/WhatsApp/email.
          </p>

          {/* Optional: give user a visible link too */}
          {isAwbValid && (
            <div className="mt-4 text-sm">
              <a
                className="underline text-primary"
                href={delhiveryUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open tracking page
              </a>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingState } from "@/components/ui/Skeleton";
import { getErrorMessage } from "@/lib/utils/errors";
import { getStripePublishableKey } from "@/lib/config/public-env";
import type { ApiProduct } from "@/lib/types/api";
import type { CartItem } from "@/lib/store/cart";

const stripePublishableKey = getStripePublishableKey();
const isE2eMode = process.env.NEXT_PUBLIC_E2E_MODE === "true";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface CheckoutSession {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

interface PaymentConfirmation {
  syncedOrders: number;
}

const paymentUnavailableMessage =
  "Payment system is currently unavailable. Please try again later or contact support.";

const SUPPORTED_COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "NP", label: "Nepal" },
  { code: "IN", label: "India" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "JP", label: "Japan" },
  { code: "SG", label: "Singapore" },
] as const;

interface PaymentFormProps {
  session: CheckoutSession;
  onPaid(): void;
}

function isCheckoutSession(data: unknown): data is CheckoutSession {
  if (!data || typeof data !== "object") return false;

  const payload = data as Partial<CheckoutSession>;
  return (
    typeof payload.clientSecret === "string" &&
    payload.clientSecret.length > 0 &&
    typeof payload.paymentIntentId === "string" &&
    payload.paymentIntentId.length > 0 &&
    typeof payload.amount === "number" &&
    Number.isFinite(payload.amount) &&
    payload.amount > 0
  );
}

function getAvailableStock(product: ApiProduct) {
  const stock = Number(product.stock);
  return Number.isFinite(stock) ? stock : 0;
}

async function validateCartStock(items: CartItem[]) {
  await Promise.all(
    items.map(async (item) => {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`"${item.name}" has an invalid quantity.`);
      }

      const { data: product } = await apiClient.get<ApiProduct>(
        `/products/${item.id}`,
      );
      const availableStock = getAvailableStock(product);

      if (availableStock < item.quantity) {
        throw new Error(
          availableStock <= 0
            ? `"${item.name}" is out of stock.`
            : `"${item.name}" only has ${availableStock} available.`,
        );
      }
    }),
  );
}

function CheckoutPaymentForm({ session, onPaid }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!stripe || !elements) {
      setError("Payment form is still loading.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Payment details are incomplete.");
        return;
      }

      const { error: confirmError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          clientSecret: session.clientSecret,
          redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/orders`,
          },
        });

      if (confirmError) {
        setError(confirmError.message || "Payment confirmation failed.");
        return;
      }

      if (paymentIntent?.status !== "succeeded") {
        setError(`Payment is ${paymentIntent?.status || "not complete"}.`);
        return;
      }

      const { data } = await apiClient.post<PaymentConfirmation>(
        `/payments/${session.paymentIntentId}/confirm`,
      );
      if (typeof data?.syncedOrders !== "number") {
        throw new Error("Payment confirmed but order sync could not be verified.");
      }

      onPaid();
    } catch (err) {
      setError(getErrorMessage(err, "Payment failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Confirming..." : `Pay $${session.amount.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function Checkout() {
  const router = useRouter();
  const { notify } = useToast();
  const { user, isHydrated } = useAuthStore();
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const paymentReady = Boolean(stripePromise) || isE2eMode;
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    address: "",
    city: "",
    state: "",
    country: "US",
    zipCode: "",
  });

  useEffect(() => {
    if (!isHydrated) return;
    if (checkoutCompleted) return;
    if (!user || items.length === 0) {
      router.push("/cart");
    }
  }, [checkoutCompleted, isHydrated, items.length, router, user]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const createPaymentSession = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!paymentReady) {
      setError(paymentUnavailableMessage);
      return;
    }

    setLoading(true);
    try {
      await validateCartStock(items);

      const { data: intentData } = await apiClient.post<unknown>(
        "/payments/create-intent",
        {
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          shippingAddress: {
            email: formData.email,
            fullName: formData.fullName,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            country: formData.country.toUpperCase(),
            zipCode: formData.zipCode,
          },
        },
      );

      if (!isCheckoutSession(intentData)) {
        throw new Error("Invalid payment response from server. Please try again.");
      }

      setSession(intentData);
    } catch (err) {
      const message = getErrorMessage(err, "Checkout failed.");
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const completeCheckout = () => {
    setCheckoutCompleted(true);
    clearCart();
    notify("Payment confirmed and order created.", "success");
    router.push("/orders");
  };

  if (!isHydrated) {
    return <LoadingState className="mx-auto max-w-6xl px-4 py-12" rows={4} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-8">
            {!paymentReady ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {paymentUnavailableMessage}
              </div>
            ) : !session ? (
              <form onSubmit={createPaymentSession} className="space-y-6">
                <div>
                  <h2 className="mb-4 text-2xl font-semibold">
                    Shipping Address
                  </h2>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="mb-3 w-full rounded-xl border border-black/10 px-4 py-2"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mb-3 w-full rounded-xl border border-black/10 px-4 py-2"
                  />
                  <input
                    type="text"
                    name="address"
                    placeholder="Street Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="mb-3 w-full rounded-xl border border-black/10 px-4 py-2"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      name="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-black/10 px-4 py-2"
                    />
                    <input
                      type="text"
                      name="state"
                      placeholder="State / Province"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-black/10 px-4 py-2"
                    />
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-black/10 px-4 py-2"
                    >
                      {SUPPORTED_COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="zipCode"
                      placeholder="ZIP Code"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-black/10 px-4 py-2"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Preparing..." : "Continue to payment"}
                </button>
              </form>
            ) : isE2eMode ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  E2E payment session ready for {session.paymentIntentId}.
                </div>
                <button
                  type="button"
                  onClick={completeCheckout}
                  className="btn-primary w-full"
                >
                  Simulate paid order
                </button>
              </div>
            ) : (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: session.clientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <CheckoutPaymentForm
                  session={session}
                  onPaid={completeCheckout}
                />
              </Elements>
            )}
          </div>
        </div>

        <div className="card h-fit p-8">
          <h2 className="mb-6 text-2xl font-semibold">Order Summary</h2>

          <div className="mb-6 space-y-3 border-b pb-6">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>Included</span>
            </div>
            <div className="flex justify-between border-t pt-4 text-lg font-semibold">
              <span>TOTAL</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

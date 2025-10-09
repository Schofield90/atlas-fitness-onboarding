"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, Lock, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatBritishCurrency } from "@/app/lib/utils/british-format";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface PageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ program?: string }>;
}

function CheckoutForm({ organization, program, clientId }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    try {
      // Create payment intent on connected account
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: program.price_pennies,
          programId: program.id,
          clientId: clientId,
          organizationId: organization.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      const { clientSecret } = await response.json();

      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
      } else {
        setSucceeded(true);
        // Redirect to success page
        setTimeout(() => {
          router.push(
            `/${organization.slug || organization.name.toLowerCase().replace(/\s+/g, "-")}/welcome`,
          );
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-md p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#9e2146",
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {succeeded && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-600">
            Payment successful! Redirecting to your dashboard...
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing || succeeded}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {processing ? (
          <>
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5 mr-2" />
            Pay {formatBritishCurrency(program.price_pennies)}
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Lock className="h-4 w-4" />
        <span>Secure payment powered by Stripe</span>
      </div>
    </form>
  );
}

export default function CheckoutPage(props: PageProps) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);
  const router = useRouter();
  const supabase = createClient();

  const [organization, setOrganization] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [params.org, searchParams.program]);

  const fetchData = async () => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${params.org}/join?program=${searchParams.program}`);
        return;
      }

      // Fetch organization
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .or(`slug.eq.${params.org},name.ilike.${params.org.replace("-", " ")}`)
        .single();

      if (!org) {
        router.push("/404");
        return;
      }

      setOrganization(org);

      // Get client record
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("organization_id", org.id)
        .eq("user_id", user.id)
        .single();

      if (!client) {
        // User is not a client of this organization
        router.push(`/${params.org}/join?program=${searchParams.program}`);
        return;
      }

      setClientId(client.id);

      // Fetch program
      if (searchParams.program) {
        const { data: prog } = await supabase
          .from("programs")
          .select("*")
          .eq("id", searchParams.program)
          .eq("organization_id", org.id)
          .single();

        if (!prog) {
          router.push(`/${params.org}`);
          return;
        }

        setProgram(prog);
      } else {
        // No program specified, redirect to membership page
        router.push(`/${params.org}#membership`);
        return;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      router.push(`/${params.org}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!organization || !program) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href={`/${params.org}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to {organization.name}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6 h-fit">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{program.name}</h3>
                <p className="text-sm text-gray-600">{program.description}</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Membership</span>
                  <span className="font-semibold">
                    {formatBritishCurrency(program.price_pennies)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Platform fee (3%)</span>
                  <span>
                    {formatBritishCurrency(
                      Math.round(program.price_pennies * 0.03),
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatBritishCurrency(program.price_pennies)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">per month</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Payment Details
            </h2>

            <Elements stripe={stripePromise}>
              <CheckoutForm
                organization={organization}
                program={program}
                clientId={clientId}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
}

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

import { Database } from "../types_db";
import { Price, Product } from "../src/types";

import { stripe } from "./stripe";
import { toDateTime } from "./helpers";

export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const upsertProductRecord = async (product: Product) => {
  const productData: Product = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description,
    image: product.image,
    metadata: product.metadata,
  };

  const { error } = await supabaseAdmin.from("products").upsert(productData);

  if (error) {
    throw error;
  }
  console.log("Product inserted/updated: $ {product.id}");
};

const upsertPriceRecord = async (price: Stripe.Price) => {
  const priceData: Price = {
    id: price.id,
    product_id: typeof price.product === "string" ? price.product : "",
    active: price.active,
    // description: price.description ?? undefined,
    unit_amount: price.unit_amount ?? undefined,
    currency: price.currency,
    type: price.type,
    interval: price.recurring?.interval,
    interval_count: price.recurring?.interval_count,
    trial_period_days: price.recurring?.trial_period_days,
    metadata: price.metadata,
  };

  const { error } = await supabaseAdmin.from("prices").upsert(priceData);

  if (error) {
    throw error;
  }
  console.log(`Price inserted/updated: ${price.id}`);
};

const createOrRetrieveCustomer = async ({
  email,
  uuid,
}: {
  email: string;
  uuid: string;
}) => {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("stripe_customer_id")
    .eq("id", uuid)
    .single();

  if (error || !data?.stripe_customer_id) {
    const customerData: { metadata: { supabaseUUID: string }; email?: string } =
      {
        metadata: {
          supabaseUUID: uuid,
        },
      };

    if (email) customerData.email = email;

    const customer = await stripe.customers.create(customerData);
    const { error: supabaseError } = await supabaseAdmin
      .from("customers")
      .insert([{ id: uuid, stripe_customer_id: customer.id }]);

    if (supabaseError) throw supabaseError;
    console.log(`Customer created: ${customer.id}`);
    return customer.id;
  }

  return data.stripe_customer_id;
};

const copyBillingDetailsToCustomer = async (
  uuid: string,
  paymentMethod: Stripe.PaymentMethod
) => {
  const customer = paymentMethod.customer as string;
  const { name, phone, address } = paymentMethod.billing_details;

  if (!customer || !name || !phone || !address) return;

  await stripe.customers.update(customer, {
    name: name || undefined,
    phone: phone || undefined,
    address: {
      city: address.city || undefined,
      country: address.country || undefined,
      line1: address.line1 || undefined,
      line2: address.line2 || undefined,
      postal_code: address.postal_code || undefined,
      state: address.state || undefined,
    },
  });

  const { error } = await supabaseAdmin
    .from("customers")
    .update({
      billing_address: { ...address },
      payment_method: paymentMethod.type,
    })
    .eq("id", uuid);

  if (error) throw error;
};

const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  createAction = false
) => {
  const { data: customerData, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (customerError) throw customerError;

  const { id: uuid } = customerData;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"],
  });

  const subscriptionData: Database["public"]["Tables"]["subscriptions"]["Row"] =
    {
      id: subscription.id,
      user_id: uuid,
      metadata: subscription.metadata,
      status: subscription.status,
      price_id: subscription.items.data[0].price.id,
      quantity: subscription.items.data[0].quantity,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at
        ? toDateTime(subscription.cancel_at).toISOString()
        : undefined,
      canceled_at: subscription.canceled_at
        ? toDateTime(subscription.canceled_at).toISOString()
        : undefined,
      current_period_start: toDateTime(
        subscription.current_period_start
      ).toISOString(),
      current_period_end: toDateTime(
        subscription.current_period_end
      ).toISOString(),
      created: toDateTime(subscription.created).toISOString(),
      ended_at: subscription.ended_at
        ? toDateTime(subscription.ended_at).toISOString()
        : undefined,
      trial_start: subscription.trial_start
        ? toDateTime(subscription.trial_start).toISOString()
        : undefined,
      trial_end: subscription.trial_end
        ? toDateTime(subscription.trial_end).toISOString()
        : undefined,
    };

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(subscriptionData);

  if (error) throw error;

  if (createAction && subscription.default_payment_method) {
    await copyBillingDetailsToCustomer(
      uuid,
      subscription.default_payment_method as Stripe.PaymentMethod
    );
  }
};

export {
  upsertProductRecord,
  upsertPriceRecord,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
  copyBillingDetailsToCustomer,
};

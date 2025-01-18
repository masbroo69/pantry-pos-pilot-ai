import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { items, total, paymentMethod } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) throw new Error('Unauthorized')

    // Create sale record
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        cashier_id: user.id,
        total_amount: total,
        payment_method: paymentMethod,
        status: 'completed'
      })
      .select()
      .single()

    if (saleError) throw saleError

    // Create sale items
    const saleItems = items.map((item: any) => ({
      sale_id: sale.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems)

    if (itemsError) throw itemsError

    // Update product stock quantities
    for (const item of items) {
      const { error: stockError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: supabase.rpc('decrement', { x: item.quantity }),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (stockError) throw stockError
    }

    return new Response(
      JSON.stringify({ success: true, sale }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})